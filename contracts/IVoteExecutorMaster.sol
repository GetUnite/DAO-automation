// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

interface IVoteExecutorMaster {
    struct Message {
        uint256 commandIndex;
        bytes commandData;
    }

    //vote creation stage
    function encodeLiquidityCommand(
        string memory _codeName,
        uint256 _percent
    ) external returns (uint256, bytes memory);

    function encodeTreasuryAllocationChangeCommand(
        int256 _delta
    ) external returns (uint256, bytes memory);

    //after vote stage

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
