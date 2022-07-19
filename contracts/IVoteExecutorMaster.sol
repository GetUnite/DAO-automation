// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

interface IVoteExecutorMaster {
    struct Message {
        uint256 commandIndex;
        bytes commandData;
    }

    //vote creation stage

    function encodeApyCommand(
        string memory _ibAlluoName, //exact ibAlluo symbol
        uint256 _newAnnualInterest,
        uint256 _newInterestPerSecond
    )
        external
        pure
        returns (
            uint256, // command index == 0
            bytes memory
        );

    function encodeMintCommand(
        uint256 _newMintAmount,
        uint256 _newRewardPerDistribution
    )
        external
        pure
        returns (
            uint256, // command index == 1
            bytes memory // comcand
        );

    //after vote stage

    function encodeAllMessages(
        uint256[] memory _commandIndexes,
        bytes[] memory _commands
    )
        external
        pure
        returns (
            bytes32 messagesHash, // to console.log !!!
            Message[] memory messages,
            bytes memory inputData // final data for subitData()
        );

    function encodeAllCommands(
        uint256[] memory _commandIndexes,
        bytes[] memory _commands
    )
        external
        pure
        returns (
            bytes32 messagesHash, // to console.log !!!
            Message[] memory messages,
            bytes memory inputData // final data for subitData()
        );

    function submitData(bytes memory data) external;
}
