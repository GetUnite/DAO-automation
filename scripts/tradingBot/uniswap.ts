import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, constants, ContractReceipt, ethers } from "ethers";
import { ethers as hethers } from "hardhat";

import { abi as QuoterABI } from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json'
import { abi as IUniswapV3PoolABI } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'
import { log, warning } from "./logging";
import { formatEther, formatUnits, parseEther, parseUnits } from "ethers/lib/utils";
import { alluo } from "./bot";
import { executeWithTimeout } from "./tools";

interface Immutables {
    factory: string
    token0: string
    token1: string
    fee: number
    tickSpacing: number
    maxLiquidityPerTick: ethers.BigNumber
} // 0.009000000000000000

const poolAddress = '0x4E44c9abC0b7c61E5F9e165271581d823Abf684d'
const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI, hethers.provider)

const quoterAddress = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";
const quoterContract = new ethers.Contract(quoterAddress, QuoterABI, hethers.provider)

const slippage = 10; // 0.1%

function calculateSlippage(expectedOutput: BigNumber) {
    const delta = expectedOutput.mul(slippage).div(10000);
    const result = expectedOutput.sub(delta);

    log("Slippage calculation: if expected output is " + formatEther(expectedOutput) + " and slippage is "
        + slippage / 100 + "% (" + formatEther(delta) + ") minimum output is " + formatEther(result));
    return result;
}

async function getPoolImmutables() {
    const [factory, token0, token1, fee, tickSpacing, maxLiquidityPerTick] = await Promise.all([
        poolContract.factory(),
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
        poolContract.tickSpacing(),
        poolContract.maxLiquidityPerTick(),
    ])

    const immutables: Immutables = {
        factory,
        token0,
        token1,
        fee,
        tickSpacing,
        maxLiquidityPerTick,
    }
    return immutables
}

export async function getAlluoForExactEth(amountIn: BigNumber): Promise<BigNumber> {
    if (amountIn.eq(BigNumber.from(0))) {
        return BigNumber.from(0);
    }

    const immutables = await getPoolImmutables();

    const quotedAmountOut = await quoterContract.callStatic.quoteExactInputSingle(
        immutables.token1,
        immutables.token0,
        immutables.fee,
        amountIn,
        0
    );

    log("UniswapV3 query: " + formatEther(amountIn) + " ETH is " + formatEther(quotedAmountOut) + " ALLUO");

    return quotedAmountOut;
}

export async function getEthForExactAlluo(amountIn: BigNumber): Promise<BigNumber> {
    if (amountIn.eq(BigNumber.from(0))) {
        return BigNumber.from(0);
    }

    const immutables = await getPoolImmutables();

    const quotedAmountOut = await quoterContract.callStatic.quoteExactInputSingle(
        immutables.token0,
        immutables.token1,
        immutables.fee,
        amountIn,
        0
    );

    log("UniswapV3 query: " + formatEther(amountIn) + " ALLUO is " + formatEther(quotedAmountOut) + " ETH");

    return quotedAmountOut;
}

export async function executeTrade(
    signer: SignerWithAddress,
    isAlluoBuyOrder: boolean,
    orderAmount: BigNumber
): Promise<BigNumber> {
    if (orderAmount.eq(BigNumber.from(0))) {
        warning("executeTrade was asked to trade 0 tokens!!!");
        return BigNumber.from(0);
    }

    const immutables = await getPoolImmutables();
    const router = await hethers.getContractAt("IUniswapV3Router", "0xE592427A0AEce92De3Edee1F18E0157C05861564");

    if (!isAlluoBuyOrder) {
        log("Selling ALLUO, checking allowance to UniswapV3 router");
        const approvalAmount = await alluo.callStatic.allowance(signer.address, router.address);
        log("    AlluoToken query: " + signer.address + " approved " + formatEther(approvalAmount) + " ALLUO to UniswapV3 Router (0xE592427A0AEce92De3Edee1F18E0157C05861564)");
        if (approvalAmount.lt(orderAmount)) {
            log("    Allowance is NOT enough, submitting approve tx")
            const gasLimit = await alluo.connect(signer).estimateGas.approve(router.address, constants.MaxUint256);
            const nonce = await signer.getTransactionCount();
            log("    Gas limit: " + gasLimit.toNumber());
            log("    Nonce: " + nonce);
            while (!await executeWithTimeout(async () => {
                if (await signer.getTransactionCount() > nonce) {
                    return true;
                }
                
                const gasPrice = (await hethers.provider.getGasPrice()).add(parseUnits("3.0", 9));
                log("    Gas price: " + formatUnits(gasPrice, 9));

                const tx = await alluo.connect(signer).approve(router.address, constants.MaxUint256, { gasLimit: gasLimit, gasPrice: gasPrice, nonce: nonce });
                log("    Broadcasted ALLUO approve tx: " + tx.hash);

                log("    Waiting for ALLUO approve tx confirmation...");
                await tx.wait();
                log("    ALLUO approve tx confirmed");
                return true;
            }, 360000)) {
                log("    Timeout in ALLUO approve detected, sending same tx again");
            }
        } else {
            log("    ALLUO allowance is enough")
        }

        const etherBalanceBefore = await signer.getBalance();
        const amountOutMinimum = calculateSlippage(await getEthForExactAlluo(orderAmount));

        // this gives WETH, not ETH
        // use this: https://etherscan.io/tx/0x6841fdc87b92c043023c0fe520402f1aec587922804ba8a6ef0b2e5e486612a1
        const calldataSwap = router.interface.encodeFunctionData(
            "exactInputSingle",
            [
                {
                    tokenIn: alluo.address,
                    tokenOut: immutables.token1,
                    fee: immutables.fee,
                    recipient: constants.AddressZero,
                    deadline: constants.MaxUint256,
                    amountIn: orderAmount,
                    amountOutMinimum: amountOutMinimum,
                    sqrtPriceLimitX96: 0
                }
            ]
        );
        const calldataUnwrap = router.interface.encodeFunctionData(
            "unwrapWETH9",
            [
                amountOutMinimum,
                signer.address
            ]
        )
        const gasLimit = await router.connect(signer).estimateGas.multicall(
            [
                calldataSwap,
                calldataUnwrap
            ]
        );
        const nonce = await signer.getTransactionCount();
        log("    Gas limit: " + gasLimit.toNumber());
        log("    Nonce: " + nonce);

        let txReceipt: ContractReceipt;
        while (!await executeWithTimeout(async () => {
            if (await signer.getTransactionCount() > nonce) {
                return true;
            }

            const gasPrice = (await hethers.provider.getGasPrice()).add(parseUnits("3.0", 9));
            log("    Gas price: " + formatUnits(gasPrice, 9));

            const tx = await router.connect(signer).multicall(
                [
                    calldataSwap,
                    calldataUnwrap,
                ], {
                gasLimit: gasLimit,
                gasPrice: gasPrice,
                nonce: nonce
            }
            );
    
            log("    Broadcasted ALLUO sell tx: " + tx.hash);
            log("    Waiting for ALLUO sell tx confirmation...");
    
            txReceipt = await tx.wait();
            log("    ALLUO sell tx confirmed");
            return true;
        }, 360000)) {
            log("    Timeout in ALLUO sell detected, sending same tx again");
        };

        const txFee = txReceipt!.gasUsed.mul(txReceipt!.effectiveGasPrice);
        const etherBalanceAfter = await signer.getBalance();
        const purchasedAmount = etherBalanceAfter.sub(etherBalanceBefore).add(txFee);

        log("    Address " + signer.address + " sold ALLUO for " + formatEther(purchasedAmount) + " ETH");

        return purchasedAmount;
    }

    log("Buying ALLUO:");
    const alluoAmountBefore = await alluo.callStatic.balanceOf(signer.address);
    const params = {
        tokenIn: immutables.token1,
        tokenOut: alluo.address,
        fee: immutables.fee,
        recipient: signer.address,
        deadline: constants.MaxUint256,
        amountIn: orderAmount,
        amountOutMinimum: calculateSlippage(await getAlluoForExactEth(orderAmount)),
        sqrtPriceLimitX96: 0
    };
    const gasLimit = await router.connect(signer).estimateGas.exactInputSingle(
        params, {
        value: orderAmount,
    }
    );
    const nonce = await signer.getTransactionCount();
    log("    Gas limit: " + gasLimit.toNumber());
    log("    Nonce: " + nonce);

    let purchasedAmount = BigNumber.from("0");
    while (!await executeWithTimeout(async () => {
        if (await signer.getTransactionCount() > nonce) {
            return true;
        }

        const gasPrice = (await hethers.provider.getGasPrice()).add(parseUnits("3.0", 9));
        log("    Gas price: " + formatUnits(gasPrice, 9));

        const tx = await router.connect(signer).exactInputSingle(
            params, {
            value: orderAmount,
            gasLimit: gasLimit,
            gasPrice: gasPrice,
            nonce: nonce
        }
        );
        log("    Broadcasted ALLUO buy tx: " + tx.hash);
        log("    Waiting for ALLUO buy tx confirmation...");

        await tx.wait();
        log("    ALLUO buy tx confirmed");
    
        return true;
    }, 360000)) {
        log("    Timeout in ALLUO buy detected, sending same tx again");
    }

    const alluoAmountAfter = await alluo.balanceOf(signer.address);
    purchasedAmount = alluoAmountAfter.sub(alluoAmountBefore);

    log("    Address " + signer.address + " bought " + formatEther(purchasedAmount) + " ALLUO for " + formatEther(orderAmount) + " ETH");

    return purchasedAmount;
}