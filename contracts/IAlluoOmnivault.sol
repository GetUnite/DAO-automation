// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IAlluoOmnivault {
    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);

    function GELATO_ROLE() external view returns (bytes32);

    function UPGRADER_ROLE() external view returns (bytes32);

    function WETH() external view returns (address);

    function __AlluoUpgradeableBase_init() external;

    function admin() external view returns (address);

    function adminFees(address) external view returns (uint256);

    function balanceOf(
        address user
    )
        external
        view
        returns (address[] memory vaults, uint256[] memory vaultBalances);

    function balances(address, address) external view returns (uint256);

    function changeUpgradeStatus(bool _status) external;

    function claimAdminFees() external returns (uint256);

    function deposit(address tokenAddress, uint256 amount) external;

    function exchangeAddress() external view returns (address);

    function feeOnYield() external view returns (uint256);

    function getActiveUnderlyingVaults()
        external
        view
        returns (address[] memory);

    function getActiveUsers() external view returns (address[] memory);

    function getPricePerShare(
        address vaultAddress
    ) external view returns (uint256);

    function getRoleAdmin(bytes32 role) external view returns (bytes32);

    function getUnderlyingVaultsPercents()
        external
        view
        returns (uint256[] memory);

    function getVaultBalanceOf(
        address vaultAddress
    ) external view returns (uint256 total);

    function grantRole(bytes32 role, address account) external;

    function hasRole(
        bytes32 role,
        address account
    ) external view returns (bool);

    function initialize(
        address _exchangeAddress,
        address _primaryToken,
        address[] memory _underlyingVaults,
        uint256[] memory _underlyingVaultsPercents,
        address[] memory _boosts,
        address _admin,
        uint256 _feeOnYield,
        uint256 _skimYieldPeriod
    ) external;

    function isBeefyVault(address vaultAddress) external view returns (bool);

    function lastPricePerFullShare(address) external view returns (uint256);

    function lastYieldSkimTimestamp() external view returns (uint256);

    function migrateToHigherPrecision() external;

    function primaryToken() external view returns (address);

    function proxiableUUID() external view returns (bytes32);

    function redistribute(
        address[] memory newVaults,
        uint256[] memory newPercents,
        address[] memory boostVaults
    ) external;

    function removeActiveUnderlyingVault(address _vaultAddress) external;

    function renounceRole(bytes32 role, address account) external;

    function revokeRole(bytes32 role, address account) external;

    function rewardTokenToMinSwapAmount(
        address
    ) external view returns (uint256);

    function setBoostVault(address _vault, address _boostVault) external;

    function setExchangeAddress(address _exchangeAddress) external;

    function setFeeOnYield(uint256 _feeOnYield) external;

    function setPrimaryToken(address _primaryToken) external;

    function setRewardTokenToMinSwapAmount(
        address _rewardToken,
        uint256 _minAmount
    ) external;

    function setSkimYieldPeriod(uint256 _skimYieldPeriod) external;

    function skimYieldFeeAndSendToAdmin() external;

    function skimYieldPeriod() external view returns (uint256);

    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    function swapOneVault(
        address oldVault,
        address[] memory newVaults,
        uint256[] memory newPercents,
        address[] memory boostVaults
    ) external;

    function underlyingVaultsPercents(address) external view returns (uint256);

    function upgradeStatus() external view returns (bool);

    function upgradeTo(address newImplementation) external;

    function upgradeToAndCall(
        address newImplementation,
        bytes memory data
    ) external;

    function vaultToBoost(address) external view returns (address);

    function withdraw(
        address tokenAddress,
        uint256 percentage
    ) external returns (uint256 totalTokens);
}
