// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IVoteExecutorMasterUtils {
    struct ExecutorTransfer {
        uint256 fromExecutor;
        uint256 toExecutor;
        uint256 tokenId;
        uint256 amount;
    }

    struct Message {
        uint256 commandIndex;
        bytes commandData;
    }

    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);

    function GELATO_ROLE() external view returns (bytes32);

    function UPGRADER_ROLE() external view returns (bytes32);

    function __AlluoUpgradeableBase_init() external;

    function assetIdToIbAlluoAddress(uint256) external view returns (address);

    function balanceTokens(
        uint256[][] memory executorsBalances,
        uint256[] memory tokenIds,
        uint256[][] memory desiredPercentages
    ) external view returns (ExecutorTransfer[] memory);

    function changeUpgradeStatus(bool _status) external;

    function checkSignedHashes(
        bytes[] memory _signs,
        bytes32 _hashed,
        address gnosis,
        uint256 minSigns
    ) external view returns (bool);

    function checkUniqueSignature(
        address[] memory _uniqueSigners,
        address _signer
    ) external pure returns (bool);

    function clearDesiredPercentagesByChain() external;

    function confirmDataIntegrity(
        bytes memory _data,
        address gnosis,
        uint256 minSigns
    ) external view returns (bytes memory);

    function crossChainInformation()
        external
        view
        returns (
            address nextExecutor,
            address previousExecutor,
            address finalExecutor,
            uint256 finalExecutorChainId,
            uint256 nextExecutorChainId,
            uint256 previousExecutorChainId,
            uint256 numberOfExecutors,
            uint256 currentExecutorInternalId
        );

    function desiredPercentagesByChain(
        uint256,
        uint256
    ) external view returns (uint256);

    function encodeAllMessages(
        uint256[] memory _commandIndexes,
        bytes[] memory _messages
    )
        external
        view
        returns (bytes32 messagesHash, Message[] memory messages, bytes memory inputData);

    function encodeApyCommand(
        string memory _ibAlluoName,
        uint256 _newAnnualInterest,
        uint256 _newInterestPerSecond
    ) external pure returns (uint256, bytes memory);

    function encodeLiquidityCommand(
        string memory _codeName,
        uint256 _percent,
        uint256 _executorLocalId
    ) external view returns (uint256, bytes memory);

    function encodeMintCommand(
        uint256 _newMintAmount,
        uint256 _period
    ) external pure returns (uint256, bytes memory);

    function encodeTreasuryAllocationChangeCommand(
        int256 _delta
    ) external pure returns (uint256, bytes memory);

    function encodeTvlCommand(
        uint256[][] memory executorBalances
    ) external pure returns (uint256, bytes memory);

    function executeTVLCommand(
        uint256[][] memory executorBalances
    ) external returns (bytes memory);

    function executorInternalIdToAddress(
        uint256
    ) external view returns (address);

    function executorInternalIdToChainId(
        uint256
    ) external view returns (uint256);

    function getDirectionIdByName(
        string memory _codeName
    ) external view returns (uint256);

    function getLatestAPY(uint256 assetId) external view returns (uint256);

    function getRoleAdmin(bytes32 role) external view returns (bytes32);

    function getSignerAddress(
        bytes32 data,
        bytes memory signature
    ) external pure returns (address);

    function grantRole(bytes32 role, address account) external;

    function hasRole(
        bytes32 role,
        address account
    ) external view returns (bool);

    function initialize(
        address _strategyHandler,
        address _voteExecutor,
        address _multisig
    ) external;

    function isValidMutlisigSigner(
        bytes memory _sign,
        bytes32 hashed,
        address gnosis
    ) external view returns (bool);

    function isWithinSlippageTolerance(
        uint256 _amount,
        uint256 _amountToCompare,
        uint256 _slippageTolerance
    ) external pure returns (bool);

    function proxiableUUID() external view returns (bytes32);

    function removeLastArray(
        uint256[][] memory executorBalances
    ) external pure returns (uint256[][] memory);

    function renounceRole(bytes32 role, address account) external;

    function revokeRole(bytes32 role, address account) external;

    function saveDesiredPercentage(
        uint256 directionId,
        uint256 percent,
        uint256 executorLocalId
    ) external;

    function setAssetIdToIbAlluoAddresses(
        address _ibAlluoAddress,
        uint256 _assetId
    ) external;

    function setCrossChainInformation(
        address _nextExecutor,
        address _previousExecutor,
        address _finalExecutor,
        uint256 _finalExecutorChainId,
        uint256 _nextExecutorChainId,
        uint256 _previousExecutorChainId,
        uint256 _numberOfExecutors,
        uint256 _currentExecutorInternalId
    ) external;

    function setExecutorInternalIds(
        uint256[] memory _executorInternalIds,
        address[] memory _executorAddresses,
        uint256[] memory _executorChainIds
    ) external;

    function setStorageAddresses(
        address _strategyHandler,
        address _voteExecutor
    ) external;

    function setUniversalExecutorBalances(
        uint256[][] memory _executorBalances
    ) external;

    function strategyHandler() external view returns (address);

    function submitData(bytes memory inputData) external;

    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    function timestampLastUpdatedWithinPeriod(
        uint256 _timestamp,
        uint256 _period
    ) external view returns (bool);

    function triggerBridging() external;

    function universalExecutorBalances(
        uint256,
        uint256
    ) external view returns (uint256);

    function universalTVL(uint256) external view returns (uint256);

    function universalTVLUpdated() external view returns (uint256);

    function upgradeStatus() external view returns (bool);

    function upgradeTo(address newImplementation) external;

    function upgradeToAndCall(address newImplementation, bytes memory data) external;

    function verify(
        bytes32 data,
        bytes memory signature,
        address account
    ) external pure returns (bool);

    function voteExecutor() external view returns (address);
}
