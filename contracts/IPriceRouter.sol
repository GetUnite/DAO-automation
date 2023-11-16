// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IPriceRouter {
    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);

    function UPGRADER_ROLE() external view returns (bytes32);

    function changeUpgradeStatus(bool _status) external;

    function cryptoToUsdStrategies(address) external view returns (address);

    function decimalsConverter(
        uint256 _amount,
        uint8 _decimalsIn,
        uint8 _decimalsOut
    ) external pure returns (uint256);

    function fiatIdToUsdStrategies(uint256) external view returns (address);

    function fiatNameToFiatId(string memory) external view returns (uint256);

    function getPrice(
        address token,
        uint256 fiatId
    ) external view returns (uint256 value, uint8 decimals);

    function getPrice(
        address token,
        string memory fiatName
    ) external view returns (uint256 value, uint8 decimals);

    function getPriceOfAmount(
        address token,
        uint256 amount,
        string memory fiatName
    ) external view returns (uint256 value, uint8 decimals);

    function getPriceOfAmount(
        address token,
        uint256 amount,
        uint256 fiatId
    ) external view returns (uint256 value, uint8 decimals);

    function getRoleAdmin(bytes32 role) external view returns (bytes32);

    function grantRole(bytes32 role, address account) external;

    function hasRole(
        bytes32 role,
        address account
    ) external view returns (bool);

    function initialize(address _multiSigWallet) external;

    function proxiableUUID() external view returns (bytes32);

    function renounceRole(bytes32 role, address account) external;

    function revokeRole(bytes32 role, address account) external;

    function setCryptoStrategy(address strategy, address coin) external;

    function setFiatStrategy(
        string memory fiatSymbol,
        uint256 fiatId,
        address fiatFeed
    ) external;

    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    function upgradeStatus() external view returns (bool);

    function upgradeTo(address newImplementation) external;

    function upgradeToAndCall(
        address newImplementation,
        bytes memory data
    ) external;
}
