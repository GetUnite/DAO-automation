// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "prettier-plugin-solidity/tests/format/Ownable/Ownable.sol";

contract VoteTimer is Ownable {
    uint256 public start; //  = 1654646400; // 8 Jun 2022 0:00:00 GMT
    uint256 public timeSpan; // = 2 weeks;
    uint256 public executionWindow; // = 1 days;

    constructor(
        uint256 _start,
        uint256 _timeSpan,
        uint256 _executionWindow
    ) {
        start = _start;
        timeSpan = _timeSpan;
        executionWindow = _executionWindow;
    }

    function changeParams(
        uint256 _start,
        uint256 _timeSpan,
        uint256 _executionWindow
    ) external onlyOwner {
        start = _start;
        timeSpan = _timeSpan;
        executionWindow = _executionWindow;
    }

    function canExecute2WeekVote() public view returns (bool) {
        // ---|------------------------- timeSpan -------------------------|---
        //    |--- executionWindow ---|
        //               true                          false
        return (block.timestamp - start) % timeSpan <= executionWindow;
    }
}
