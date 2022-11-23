 // SPDX-License-Identifier: MIT
 pragma solidity ^0.8.11;

 interface IStrategyHandler {

    function getDirectionIdByName(string memory _codeName) external view returns(uint256);
    function getAllAssetActiveIds() external view returns(uint256[] memory);
 }
 
 
