
[<img width="200" alt="get in touch with Consensys Diligence" src="https://user-images.githubusercontent.com/2865694/56826101-91dcf380-685b-11e9-937c-af49c2510aa0.png">](https://diligence.consensys.net)<br/>
<sup>
[[  🌐  ](https://diligence.consensys.net)  [  📩  ](mailto:diligence@consensys.net)  [  🔥  ](https://consensys.github.io/diligence/)]
</sup><br/><br/>



# Solidity Metrics for GetAlluo/DAO-automation

## Table of contents

- [Scope](#t-scope)
    - [Source Units in Scope](#t-source-Units-in-Scope)
    - [Out of Scope](#t-out-of-scope)
        - [Excluded Source Units](#t-out-of-scope-excluded-source-units)
        - [Duplicate Source Units](#t-out-of-scope-duplicate-source-units)
        - [Doppelganger Contracts](#t-out-of-scope-doppelganger-contracts)
- [Report Overview](#t-report)
    - [Risk Summary](#t-risk)
    - [Source Lines](#t-source-lines)
    - [Inline Documentation](#t-inline-documentation)
    - [Components](#t-components)
    - [Exposed Functions](#t-exposed-functions)
    - [StateVariables](#t-statevariables)
    - [Capabilities](#t-capabilities)
    - [Dependencies](#t-package-imports)
    - [Totals](#t-totals)

## <span id=t-scope>Scope</span>

This section lists files that are in scope for the metrics report. 

- **Project:** `GetAlluo/DAO-automation`
- **Included Files:** 
    - ``
- **Excluded Paths:** 
    - ``
- **File Limit:** `undefined`
    - **Exclude File list Limit:** `undefined`

- **Workspace Repository:** `unknown` (`undefined`@`undefined`)

### <span id=t-source-Units-in-Scope>Source Units in Scope</span>

Source Units Analyzed: **`6`**<br>
Source Units in Scope: **`6`** (**100%**)

| Type | File   | Logic Contracts | Interfaces | Lines | nLines | nSLOC | Comment Lines | Complex. Score | Capabilities |
|========|=================|============|=======|=======|===============|==============|  
| 🔍 | contracts\IIbAlluo.sol | **** | 1 | 217 | 53 | 49 | 6 | 118 | **<abbr title='Payable Functions'>💰</abbr>** |
| 🔍 | contracts\ILiquidityHandler.sol | **** | 1 | 212 | 64 | 58 | 6 | 86 | **<abbr title='Payable Functions'>💰</abbr>** |
| 🔍 | contracts\IStrategyHandler.sol | **** | 1 | 10 | 6 | 3 | 1 | 5 | **** |
| 🔍 | contracts\IUniswapV3Router.sol | **** | 3 | 81 | 32 | 22 | 7 | 38 | **<abbr title='Payable Functions'>💰</abbr><abbr title='doppelganger(IERC20)'>🔆</abbr>** |
| 🔍 | contracts\IVoteExecutorMaster.sol | **** | 1 | 70 | 11 | 7 | 11 | 15 | **** |
| 📝🎨 | contracts\VoteTimer.sol | 3 | **** | 125 | 121 | 71 | 32 | 38 | **** |
| 📝🔍🎨 | **Totals** | **3** | **7** | **715**  | **287** | **210** | **63** | **300** | **<abbr title='Payable Functions'>💰</abbr><abbr title='doppelganger'>🔆</abbr>** |

<sub>
Legend: <a onclick="toggleVisibility('table-legend', this)">[➕]</a>
<div id="table-legend" style="display:none">

<ul>
<li> <b>Lines</b>: total lines of the source unit </li>
<li> <b>nLines</b>: normalized lines of the source unit (e.g. normalizes functions spanning multiple lines) </li>
<li> <b>nSLOC</b>: normalized source lines of code (only source-code lines; no comments, no blank lines) </li>
<li> <b>Comment Lines</b>: lines containing single or block comments </li>
<li> <b>Complexity Score</b>: a custom complexity score derived from code statements that are known to introduce code complexity (branches, loops, calls, external interfaces, ...) </li>
</ul>

</div>
</sub>


#### <span id=t-out-of-scope>Out of Scope</span>

##### <span id=t-out-of-scope-excluded-source-units>Excluded Source Units</span>

Source Units Excluded: **`0`**

<a onclick="toggleVisibility('excluded-files', this)">[➕]</a>
<div id="excluded-files" style="display:none">
| File   |
|========|
| None |

</div>


##### <span id=t-out-of-scope-duplicate-source-units>Duplicate Source Units</span>

Duplicate Source Units Excluded: **`0`** 

<a onclick="toggleVisibility('duplicate-files', this)">[➕]</a>
<div id="duplicate-files" style="display:none">
| File   |
|========|
| None |

</div>

##### <span id=t-out-of-scope-doppelganger-contracts>Doppelganger Contracts</span>

Doppelganger Contracts: **`1`** 

<a onclick="toggleVisibility('doppelganger-contracts', this)">[➕]</a>
<div id="doppelganger-contracts" style="display:none">
| File   | Contract | Doppelganger | 
|========|==========|==============|
| contracts\IUniswapV3Router.sol | IERC20 | (exact) [0](https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v2.5.0/contracts/token/ERC20/IERC20.sol), [1](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v2.3.0/contracts/token/ERC20/IERC20.sol), [2](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v2.4.0/contracts/token/ERC20/IERC20.sol), [3](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v2.4.0-beta.0/contracts/token/ERC20/IERC20.sol), [4](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v2.4.0-beta.1/contracts/token/ERC20/IERC20.sol), [5](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v2.4.0-beta.2/contracts/token/ERC20/IERC20.sol), [6](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v2.5.0/contracts/token/ERC20/IERC20.sol), [7](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v2.5.0-rc.0/contracts/token/ERC20/IERC20.sol), [8](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v2.5.1/contracts/token/ERC20/IERC20.sol), [9](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.0.0/contracts/token/ERC20/IERC20.sol), [10](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.0.0-beta.0/contracts/token/ERC20/IERC20.sol), [11](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.0.0-rc.0/contracts/token/ERC20/IERC20.sol), [12](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.0.0-rc.1/contracts/token/ERC20/IERC20.sol), [13](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.0.1/contracts/token/ERC20/IERC20.sol), [14](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.0.2/contracts/token/ERC20/IERC20.sol), [15](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.1.0/contracts/token/ERC20/IERC20.sol), [16](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.1.0-rc.0/contracts/token/ERC20/IERC20.sol), [17](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.2.0/contracts/token/ERC20/IERC20.sol), [18](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.2.0-rc.0/contracts/token/ERC20/IERC20.sol), [19](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.2.1-solc-0.7/contracts/token/ERC20/IERC20.sol), [20](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.2.2-solc-0.7/contracts/token/ERC20/IERC20.sol) |

</div>


## <span id=t-report>Report</span>

### Overview

The analysis finished with **`0`** errors and **`0`** duplicate files.





#### <span id=t-risk>Risk</span>

<div class="wrapper" style="max-width: 512px; margin: auto">
			<canvas id="chart-risk-summary"></canvas>
</div>

#### <span id=t-source-lines>Source Lines (sloc vs. nsloc)</span>

<div class="wrapper" style="max-width: 512px; margin: auto">
    <canvas id="chart-nsloc-total"></canvas>
</div>

#### <span id=t-inline-documentation>Inline Documentation</span>

- **Comment-to-Source Ratio:** On average there are`8.11` code lines per comment (lower=better).
- **ToDo's:** `0` 

#### <span id=t-components>Components</span>

| 📝Contracts   | 📚Libraries | 🔍Interfaces | 🎨Abstract |
|=============|===========|============|============|
| 1 | 0  | 7  | 2 |

#### <span id=t-exposed-functions>Exposed Functions</span>

This section lists functions that are explicitly declared public or payable. Please note that getter methods for public stateVars are not included.  

| 🌐Public   | 💰Payable |
|============|===========|
| 124 | 5  | 

| External   | Internal | Private | Pure | View |
|============|==========|=========|======|======|
| 120 | 65  | 0 | 4 | 60 |

#### <span id=t-statevariables>StateVariables</span>

| Total      | 🌐Public  |
|============|===========|
| 5  | 4 |

#### <span id=t-capabilities>Capabilities</span>

| Solidity Versions observed | 🧪 Experimental Features | 💰 Can Receive Funds | 🖥 Uses Assembly | 💣 Has Destroyable Contracts | 
|============|===========|===========|===========|
| `^0.8.4`<br/>`^0.8.11`<br/>`0.8.11` |  | `yes` | **** | **** | 

| 📤 Transfers ETH | ⚡ Low-Level Calls | 👥 DelegateCall | 🧮 Uses Hash Functions | 🔖 ECRecover | 🌀 New/Create/Create2 |
|============|===========|===========|===========|===========|
| **** | **** | **** | **** | **** | **** | 

| ♻️ TryCatch | Σ Unchecked |
|============|===========|
| **** | **** |

#### <span id=t-package-imports>Dependencies / External Imports</span>

| Dependency / Import Path | Count  | 
|==========================|========|
| @openzeppelin/contracts/interfaces/IERC20Metadata.sol | 1 |

#### <span id=t-totals>Totals</span>

##### Summary

<div class="wrapper" style="max-width: 90%; margin: auto">
    <canvas id="chart-num-bar"></canvas>
</div>

##### AST Node Statistics

###### Function Calls

<div class="wrapper" style="max-width: 90%; margin: auto">
    <canvas id="chart-num-bar-ast-funccalls"></canvas>
</div>

###### Assembly Calls

<div class="wrapper" style="max-width: 90%; margin: auto">
    <canvas id="chart-num-bar-ast-asmcalls"></canvas>
</div>

###### AST Total

<div class="wrapper" style="max-width: 90%; margin: auto">
    <canvas id="chart-num-bar-ast"></canvas>
</div>

##### Inheritance Graph

<a onclick="toggleVisibility('surya-inherit', this)">[➕]</a>
<div id="surya-inherit" style="display:none">
<div class="wrapper" style="max-width: 512px; margin: auto">
    <div id="surya-inheritance" style="text-align: center;"></div> 
</div>
</div>

##### CallGraph

<a onclick="toggleVisibility('surya-call', this)">[➕]</a>
<div id="surya-call" style="display:none">
<div class="wrapper" style="max-width: 512px; margin: auto">
    <div id="surya-callgraph" style="text-align: center;"></div>
</div>
</div>

###### Contract Summary

<a onclick="toggleVisibility('surya-mdreport', this)">[➕]</a>
<div id="surya-mdreport" style="display:none">
 Sūrya's Description Report

 Files Description Table


|  File Name  |  SHA-1 Hash  |
|-------------|--------------|
| contracts\IIbAlluo.sol | 7987446569c5f4580bbbfa3d1238437e05232ab2 |
| contracts\ILiquidityHandler.sol | 431c78a447f7b3b4ef31ead74712d5fa6661a12b |
| contracts\IStrategyHandler.sol | 97eced5a2f88558e48e7aba0b0f66d8704bd6076 |
| contracts\IUniswapV3Router.sol | 38ccf6730d4edbcee9a5a93c02c57e887be99308 |
| contracts\IVoteExecutorMaster.sol | f4f911806ec6dc7bddc02e0a31c372c194b79c39 |
| contracts\VoteTimer.sol | 68d5f4c1a4611f87229ed96f359ff9e023b85dae |


 Contracts Description Table


|  Contract  |         Type        |       Bases      |                  |                 |
|:----------:|:-------------------:|:----------------:|:----------------:|:---------------:|
|     └      |  **Function Name**  |  **Visibility**  |  **Mutability**  |  **Modifiers**  |
||||||
| **IIbAlluo** | Interface |  |||
| └ | DEFAULT_ADMIN_ROLE | External ❗️ |   |NO❗️ |
| └ | UPGRADER_ROLE | External ❗️ |   |NO❗️ |
| └ | allowance | External ❗️ |   |NO❗️ |
| └ | annualInterest | External ❗️ |   |NO❗️ |
| └ | approve | External ❗️ | 🛑  |NO❗️ |
| └ | approveAssetValue | External ❗️ | 🛑  |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | burn | External ❗️ | 🛑  |NO❗️ |
| └ | changeTokenStatus | External ❗️ | 🛑  |NO❗️ |
| └ | changeUpgradeStatus | External ❗️ | 🛑  |NO❗️ |
| └ | convertToAssetValue | External ❗️ |   |NO❗️ |
| └ | decimals | External ❗️ |   |NO❗️ |
| └ | decreaseAllowance | External ❗️ | 🛑  |NO❗️ |
| └ | deposit | External ❗️ | 🛑  |NO❗️ |
| └ | exchangeAddress | External ❗️ |   |NO❗️ |
| └ | getBalance | External ❗️ |   |NO❗️ |
| └ | getBalanceForTransfer | External ❗️ |   |NO❗️ |
| └ | getListSupportedTokens | External ❗️ |   |NO❗️ |
| └ | getRoleAdmin | External ❗️ |   |NO❗️ |
| └ | grantRole | External ❗️ | 🛑  |NO❗️ |
| └ | growingRatio | External ❗️ |   |NO❗️ |
| └ | hasRole | External ❗️ |   |NO❗️ |
| └ | increaseAllowance | External ❗️ | 🛑  |NO❗️ |
| └ | initialize | External ❗️ | 🛑  |NO❗️ |
| └ | interestPerSecond | External ❗️ |   |NO❗️ |
| └ | isTrustedForwarder | External ❗️ |   |NO❗️ |
| └ | lastInterestCompound | External ❗️ |   |NO❗️ |
| └ | liquidityHandler | External ❗️ |   |NO❗️ |
| └ | mint | External ❗️ | 🛑  |NO❗️ |
| └ | name | External ❗️ |   |NO❗️ |
| └ | pause | External ❗️ | 🛑  |NO❗️ |
| └ | paused | External ❗️ |   |NO❗️ |
| └ | proxiableUUID | External ❗️ |   |NO❗️ |
| └ | renounceRole | External ❗️ | 🛑  |NO❗️ |
| └ | revokeRole | External ❗️ | 🛑  |NO❗️ |
| └ | setExchangeAddress | External ❗️ | 🛑  |NO❗️ |
| └ | setInterest | External ❗️ | 🛑  |NO❗️ |
| └ | setLiquidityHandler | External ❗️ | 🛑  |NO❗️ |
| └ | setTrustedForwarder | External ❗️ | 🛑  |NO❗️ |
| └ | setUpdateTimeLimit | External ❗️ | 🛑  |NO❗️ |
| └ | supportsInterface | External ❗️ |   |NO❗️ |
| └ | symbol | External ❗️ |   |NO❗️ |
| └ | totalAssetSupply | External ❗️ |   |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | transfer | External ❗️ | 🛑  |NO❗️ |
| └ | transferAssetValue | External ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | External ❗️ | 🛑  |NO❗️ |
| └ | transferFromAssetValue | External ❗️ | 🛑  |NO❗️ |
| └ | trustedForwarder | External ❗️ |   |NO❗️ |
| └ | unpause | External ❗️ | 🛑  |NO❗️ |
| └ | updateRatio | External ❗️ | 🛑  |NO❗️ |
| └ | updateTimeLimit | External ❗️ |   |NO❗️ |
| └ | upgradeStatus | External ❗️ |   |NO❗️ |
| └ | upgradeTo | External ❗️ | 🛑  |NO❗️ |
| └ | upgradeToAndCall | External ❗️ |  💵 |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawTo | External ❗️ | 🛑  |NO❗️ |
||||||
| **ILiquidityHandler** | Interface |  |||
| └ | DEFAULT_ADMIN_ROLE | External ❗️ |   |NO❗️ |
| └ | UPGRADER_ROLE | External ❗️ |   |NO❗️ |
| └ | adapterIdsToAdapterInfo | External ❗️ |   |NO❗️ |
| └ | changeAdapterStatus | External ❗️ | 🛑  |NO❗️ |
| └ | changeUpgradeStatus | External ❗️ | 🛑  |NO❗️ |
| └ | deposit | External ❗️ | 🛑  |NO❗️ |
| └ | exchangeAddress | External ❗️ |   |NO❗️ |
| └ | getActiveAdapters | External ❗️ |   |NO❗️ |
| └ | getAdapterAmount | External ❗️ |   |NO❗️ |
| └ | getAdapterCoreTokensFromIbAlluo | External ❗️ |   |NO❗️ |
| └ | getAdapterId | External ❗️ |   |NO❗️ |
| └ | getAllAdapters | External ❗️ |   |NO❗️ |
| └ | getExpectedAdapterAmount | External ❗️ |   |NO❗️ |
| └ | getIbAlluoByAdapterId | External ❗️ |   |NO❗️ |
| └ | getLastAdapterIndex | External ❗️ |   |NO❗️ |
| └ | getListOfIbAlluos | External ❗️ |   |NO❗️ |
| └ | getRoleAdmin | External ❗️ |   |NO❗️ |
| └ | getWithdrawal | External ❗️ |   |NO❗️ |
| └ | grantRole | External ❗️ | 🛑  |NO❗️ |
| └ | hasRole | External ❗️ |   |NO❗️ |
| └ | ibAlluoToWithdrawalSystems | External ❗️ |   |NO❗️ |
| └ | initialize | External ❗️ | 🛑  |NO❗️ |
| └ | pause | External ❗️ | 🛑  |NO❗️ |
| └ | paused | External ❗️ |   |NO❗️ |
| └ | proxiableUUID | External ❗️ |   |NO❗️ |
| └ | removeTokenByAddress | External ❗️ | 🛑  |NO❗️ |
| └ | renounceRole | External ❗️ | 🛑  |NO❗️ |
| └ | revokeRole | External ❗️ | 🛑  |NO❗️ |
| └ | satisfyAdapterWithdrawals | External ❗️ | 🛑  |NO❗️ |
| └ | satisfyAllWithdrawals | External ❗️ | 🛑  |NO❗️ |
| └ | setAdapter | External ❗️ | 🛑  |NO❗️ |
| └ | setExchangeAddress | External ❗️ | 🛑  |NO❗️ |
| └ | setIbAlluoToAdapterId | External ❗️ | 🛑  |NO❗️ |
| └ | supportsInterface | External ❗️ |   |NO❗️ |
| └ | unpause | External ❗️ | 🛑  |NO❗️ |
| └ | upgradeStatus | External ❗️ |   |NO❗️ |
| └ | upgradeTo | External ❗️ | 🛑  |NO❗️ |
| └ | upgradeToAndCall | External ❗️ |  💵 |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawalInDifferentTokenPossible | External ❗️ |   |NO❗️ |
||||||
| **IStrategyHandler** | Interface |  |||
| └ | getDirectionIdByName | External ❗️ |   |NO❗️ |
| └ | getAllAssetActiveIds | External ❗️ |   |NO❗️ |
||||||
| **IUniswapV3Router** | Interface |  |||
| └ | exactInputSingle | External ❗️ |  💵 |NO❗️ |
| └ | multicall | External ❗️ | 🛑  |NO❗️ |
| └ | unwrapWETH9 | External ❗️ | 🛑  |NO❗️ |
| └ | exactInput | External ❗️ |  💵 |NO❗️ |
||||||
| **IERC20** | Interface |  |||
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | transfer | External ❗️ | 🛑  |NO❗️ |
| └ | allowance | External ❗️ |   |NO❗️ |
| └ | approve | External ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | External ❗️ | 🛑  |NO❗️ |
||||||
| **IWETH** | Interface | IERC20 |||
| └ | deposit | External ❗️ |  💵 |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
||||||
| **IVoteExecutorMaster** | Interface |  |||
| └ | encodeLiquidityCommand | External ❗️ | 🛑  |NO❗️ |
| └ | encodeTreasuryAllocationChangeCommand | External ❗️ | 🛑  |NO❗️ |
| └ | encodeMintCommand | External ❗️ |   |NO❗️ |
| └ | encodeApyCommand | External ❗️ |   |NO❗️ |
| └ | encodeAllMessages | External ❗️ |   |NO❗️ |
| └ | encodeAllCommands | External ❗️ |   |NO❗️ |
| └ | submitData | External ❗️ | 🛑  |NO❗️ |
||||||
| **Context** | Implementation |  |||
| └ | _msgSender | Internal 🔒 |   | |
| └ | _msgData | Internal 🔒 |   | |
||||||
| **Ownable** | Implementation | Context |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | owner | Public ❗️ |   |NO❗️ |
| └ | _checkOwner | Internal 🔒 |   | |
| └ | renounceOwnership | Public ❗️ | 🛑  | onlyOwner |
| └ | transferOwnership | Public ❗️ | 🛑  | onlyOwner |
| └ | _transferOwnership | Internal 🔒 | 🛑  | |
||||||
| **VoteTimer** | Implementation | Ownable |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | changeParams | External ❗️ | 🛑  | onlyOwner |
| └ | canExecute2WeekVote | Public ❗️ |   |NO❗️ |


 Legend

|  Symbol  |  Meaning  |
|:--------:|-----------|
|    🛑    | Function can modify state |
|    💵    | Function is payable |
 

</div>
____
<sub>
Thinking about smart contract security? We can provide training, ongoing advice, and smart contract auditing. [Contact us](https://diligence.consensys.net/contact/).
</sub>

