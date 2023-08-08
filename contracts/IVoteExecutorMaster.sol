// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IVoteExecutorMaster {
    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);

    function GELATO_ROLE() external view returns (bytes32);

    function RELAYER_ROLE() external view returns (bytes32);

    function UPGRADER_ROLE() external view returns (bytes32);

    function __AlluoUpgradeableBase_init() external;

    function approveSubmittedData(
        uint256 _dataId,
        bytes[] memory _signs
    ) external;

    function assetIdToDepositPercentages(
        uint256,
        uint256
    ) external view returns (uint256 directionId, uint256 amount);

    function chainIdToBridgingFeeToken(uint256) external view returns (address);

    function chainIdToFeeAmount(uint256) external view returns (uint256);

    function changeUpgradeStatus(bool _status) external;

    function cvxDistributor() external view returns (address);

    function exchangeAddress() external view returns (address);

    function executeCrosschainData(
        uint256 index
    ) external returns (bool success, bytes memory result);

    function executeQueuedDeposits(uint256 assetId) external;

    function executeSpecificData(uint256 index) external;

    function executionHistory(uint256) external view returns (bytes memory);

    function forceRemoveQueuedCrosschainIndex(uint256 index) external;

    // function getAssetIdToDepositPercentages(
    //     uint256 _assetId
    // ) external view returns (tuple[]);

    function getRoleAdmin(bytes32 role) external view returns (bytes32);

    function getSequentialQueuedCrosschainIndex()
        external
        view
        returns (bool canExec, bytes memory execPayload);

    function getSubmittedData(
        uint256 _dataId
    ) external view returns (bytes memory, uint256, bytes[] memory);

    function gnosis() external view returns (address);

    function grantRole(bytes32 role, address account) external;

    function handleAcrossMessage(
        address tokenSent,
        uint256 amount,
        bool fillCompleted,
        address relayer,
        bytes memory message
    ) external;

    function hasRole(
        bytes32 role,
        address account
    ) external view returns (bool);

    function hashExecutionTime(bytes32) external view returns (uint256);

    function ibAlluoSymbolToAddress(
        string memory
    ) external view returns (address);

    function initialize(
        address _multiSigWallet,
        address _exchangeAddress,
        address _priceFeed,
        address _liquidityHandler,
        address _strategyHandler,
        address _cvxDistributor,
        address _voteExecutorUtils,
        address _locker,
        uint256 _timeLock,
        uint256 _minSigns,
        bool _isMaster
    ) external;

    function isMaster() external view returns (bool);

    function isValidSignature(
        bytes32 messageHash,
        bytes memory signature
    ) external view returns (bytes4);

    function liquidityHandler() external view returns (address);

    function locker() external view returns (address);

    function markAllChainPositions() external;

    function minSigns() external view returns (uint256);

    function multicall(
        address[] memory destinations,
        bytes[] memory calldatas
    ) external;

    function oracle() external view returns (address);

    function priceFeed() external view returns (address);

    function proxiableUUID() external view returns (bytes32);

    function relayerFeePct() external view returns (int64);

    function renounceRole(bytes32 role, address account) external;

    function requestExchangePrices() external;

    function revokeRole(bytes32 role, address account) external;

    function setAcrossInformation(
        address _spokePoolAddress,
        int64 _relayerFeePct
    ) external;

    function setFeeInformation(
        address _bridgingFeeToken,
        uint256 _chainId,
        uint256 _feeAmount
    ) external;

    function setGnosis(address _gnosis) external;

    function setMaster(bool _isMaster) external;

    function setMinSigns(uint256 _minSigns) external;

    function setOracle(address _oracle) external;

    function setTimelock(uint256 _newTimeLock) external;

    function speedUpDeposit(
        int64 updatedRelayerFeePct,
        uint32 depositId,
        address updatedRecipient,
        bytes memory updatedMessage,
        bytes memory depositorSignature
    ) external;

    function spokePool() external view returns (address);

    function storedCrosschainData(uint256) external view returns (bytes memory);

    function strategyHandler() external view returns (address);

    function submitData(bytes memory data) external;

    function submittedData(
        uint256
    ) external view returns (bytes memory data, uint256 time);

    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    function timeLock() external view returns (uint256);

    function updateAllIbAlluoAddresses() external;

    function upgradeStatus() external view returns (bool);

    function upgradeTo(address newImplementation) external;

    function upgradeToAndCall(
        address newImplementation,
        bytes memory data
    ) external;

    function voteExecutorUtils() external view returns (address);
}
