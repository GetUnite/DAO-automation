// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IStrategyHandler {
    function getDirectionIdByName(
        string memory _codeName
    ) external view returns (uint256);

    function getAllAssetActiveIds() external view returns (uint256[] memory);

    function getCurrentDeployed() external view returns (uint256[] memory);

    function getPrimaryTokenByAssetId(
        uint256 _id,
        uint256 _chainId
    ) external view returns (address);
}
