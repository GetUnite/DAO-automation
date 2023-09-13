// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IAlluoStrategyHandler {
    struct LiquidityDirection {
        address strategyAddress;
        address entryToken;
        uint256 assetId;
        uint256 chainId;
        bytes entryData;
        bytes exitData;
        bytes rewardsData;
    }

    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);

    function GELATO_ROLE() external view returns (bytes32);

    function UPGRADER_ROLE() external view returns (bytes32);

    function __AlluoUpgradeableBase_init() external;

    function addToActiveDirections(uint256 _directionId) external;

    function alluoBridgingInformation()
        external
        view
        returns (
            address spokepool,
            address recipient,
            uint256 recipientChainId,
            int64 relayerFeePct
        );

    function assetIdToDepositQueue(
        uint256
    ) external view returns (uint256 totalDepositAmount);

    function bridgeRemainingFunds(uint8 assetId) external;

    function bridgeTo(
        uint256 amount,
        uint8 assetId,
        address to,
        uint256 chainId
    ) external;

    function changeAssetInfo(
        uint256 _assetId,
        uint256[] memory _chainIds,
        address[] memory _chainIdToPrimaryToken,
        address _ibAlluo
    ) external;

    function changeNumberOfAssets(uint8 _newNumber) external;

    function changeUpgradeStatus(bool _status) external;

    function checkDepositsReady()
        external
        view
        returns (bool canExec, bytes memory execPayload);

    function clearDepositQueue(uint256 _assetId) external;

    function directionIdToName(uint256) external view returns (string memory);

    function directionNameToId(string memory) external view returns (uint256);

    function exchange() external view returns (address);

    function executeQueuedDeposits(uint256 assetId) external;

    function getActiveDirectionsForAssetId(
        uint256 assetId
    ) external view returns (uint256[] memory);

    function getAssetIdToDepositQueue(
        uint256 assetId
    ) external view returns (uint256 amount, uint256 directionId);

    function getDirectionFullInfoById(
        uint256 _id
    ) external view returns (address, LiquidityDirection memory);

    function getPrimaryTokenForAsset(
        uint256 assetId
    ) external view returns (address primaryToken);

    function getRoleAdmin(bytes32 role) external view returns (bytes32);

    function gnosis() external view returns (address);

    function grantRole(bytes32 role, address account) external;

    function hasRole(
        bytes32 role,
        address account
    ) external view returns (bool);

    function initialize(
        address _multiSigWallet,
        address _spokePool,
        address _recipient,
        uint256 _recipientChainId,
        int64 _relayerFeePct,
        uint256 _slippageTolerance,
        address _exchange,
        address _voteExecutorUtils
    ) external;

    function isReadyToExecuteQueuedDeposits(
        uint256 _assetId,
        address _depositor
    ) external view returns (bool);

    function isValidSignature(
        bytes32 messageHash,
        bytes memory signature
    ) external view returns (bytes4);

    function lastDirectionId() external view returns (uint256);

    function liquidityDirection(
        uint256
    )
        external
        view
        returns (
            address strategyAddress,
            address entryToken,
            uint256 assetId,
            uint256 chainId,
            bytes memory entryData,
            bytes memory exitData,
            bytes memory rewardsData
        );

    function markAssetToMarket(
        uint8 assetId
    ) external view returns (uint256 amount);

    function markDirectionToMarket(
        uint256 directionId
    ) external view returns (uint256 amount);

    function numberOfAssets() external view returns (uint8);

    function oracle() external view returns (address);

    function priceDeadline() external view returns (uint32);

    function proxiableUUID() external view returns (bytes32);

    function rebalanceUntilTarget(
        uint8 assetId,
        uint256 directionId,
        uint256 percentage,
        uint256 tvlForAsset
    ) external;

    function removeFromActiveDirections(uint256 _directionId) external;

    function renounceRole(bytes32 role, address account) external;

    function revokeRole(bytes32 role, address account) external;

    function setAlluoBridging(
        address _spokePool,
        address _recipient,
        uint256 _recipientChainId,
        int64 _relayerFeePct
    ) external;

    function setDirectionIdToName(
        uint256 _directionId,
        string memory _codeName
    ) external;

    function setGnosis(address _gnosis) external;

    function setLastDirectionId(uint256 _newNumber) external;

    function setLiquidityDirection(
        string memory _codeName,
        uint256 _directionId,
        address _strategyAddress,
        address _entryToken,
        uint256 _assetId,
        uint256 _chainId,
        bytes memory _entryData,
        bytes memory _exitData,
        bytes memory _rewardsData
    ) external;

    function setOracle(address _oracle) external;

    function setPriceDeadline(uint32 _deadline) external;

    function setSlippageTolerance(uint16 _slippageTolerance) external;

    function setTokenToAssetId(address _token, uint8 _assetId) external;

    function slippageTolerance() external view returns (uint256);

    function speedUpDeposit(
        int64 updatedRelayerFeePct,
        uint32 depositId,
        address updatedRecipient,
        bytes memory updatedMessage,
        bytes memory depositorSignature
    ) external;

    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    function tokenToAssetId(address) external view returns (uint8);

    function upgradeStatus() external view returns (bool);

    function upgradeTo(address newImplementation) external;

    function upgradeToAndCall(
        address newImplementation,
        bytes memory data
    ) external;

    function voteExecutorUtils() external view returns (address);
}
