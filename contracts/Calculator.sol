// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract Calculator {
    function getInvestedAmount(
        uint _amountPercentage,
        uint _lockInPercentage,
        uint totalAmount
    ) internal pure returns (uint) {
        return ((_amountPercentage * totalAmount) * 100) / _lockInPercentage;
    }

    function calculatefundingStakes(
        uint _amount,
        uint _lockInPercentage,
        uint _fundingGoal
    ) internal pure returns (uint) {
        uint singlePercentageShares = (_fundingGoal * 100) / _lockInPercentage; //multiplying 100 to ensure the basis points is followed in contract
        return _amount / singlePercentageShares;
    }
}
