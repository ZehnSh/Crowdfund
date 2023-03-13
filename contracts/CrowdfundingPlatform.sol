// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Calculator.sol";

// Uncomment this line to use console.log
import "hardhat/console.sol";

contract CrowdfundingPlatform is Calculator {
    using Counters for Counters.Counter;

    struct Project {
        address creator;
        uint fundingGoal;
        uint collectedAmount;
        uint distributingPercentage;
        uint startAt;
        uint timelineGoal;
        bool status;
    }

    event createCrowdFundingProjectEvent(uint, address);
    event startCrowdFundingEvent(address, uint, uint, uint, uint);
    event fundProjectEvent(uint, address, uint, uint);
    event claimCampaignFundsEvent(uint, address, uint);
    event retrieveFundsEvent(uint, address, uint);

    Counters.Counter latestCreatedID;
    IERC20 token;
    address public owner;
    uint[] allIds;
    mapping(uint => Project) ProjectID;
    mapping(uint => mapping(address => uint)) public stakes;

    modifier onlyCreator(uint _id) {
        require(
            msg.sender == ProjectID[_id].creator,
            "CrowdfundingPlatform: must be creator"
        );
        _;
    }
    modifier onlyOwner() {
        require(msg.sender == owner, "OnlyOwner");
        _;
    }

    constructor(address _token) {
        token = IERC20(_token);
    }

    function changeToken(address _token) external onlyOwner {
        token = IERC20(_token);
    }

    function createCrowdFundingProject() external returns (uint) {
        latestCreatedID.increment();
        uint Id = latestCreatedID.current();
        Project memory newProject = Project({
            creator: msg.sender,
            fundingGoal: 0,
            collectedAmount: 0,
            distributingPercentage: 0,
            startAt: 0,
            timelineGoal: 0,
            status: false
        });
        ProjectID[Id] = newProject;
        allIds.push(Id);
        emit createCrowdFundingProjectEvent(Id, msg.sender);
        return Id;
    }

    function startCrowdFunding(
        uint _id,
        uint _fundingGoal,
        uint _distributingPercentage,
        uint _timeLineGoal
    ) external onlyCreator(_id) {
        require(
            ProjectID[_id].startAt == 0,
            "CrowdfundingPlatform: funding already started"
        );
        require(
            _timeLineGoal > block.timestamp + 7 days,
            "CrowdfundingPlatform: Should correct timeline Goal"
        );
        require(
            _distributingPercentage <= 9000,
            "CrowdfundingPlatform: Limit should be less than 90%"
        ); // This condition ensures that user have to keep at least 10% stakes to its own
        require(
            _fundingGoal > 10e18,
            "CrowdfundingPlatform: should be greater than 10"
        );

        ProjectID[_id] = Project({
            creator: msg.sender,
            fundingGoal: _fundingGoal,
            collectedAmount: 0,
            distributingPercentage: _distributingPercentage,
            startAt: block.timestamp,
            timelineGoal: _timeLineGoal,
            status: false
        });
        emit startCrowdFundingEvent(
            msg.sender,
            _fundingGoal,
            _distributingPercentage,
            block.timestamp,
            _timeLineGoal
        );
    }

    function getAllOngoingProjects() external view returns (uint[] memory) {
        return allIds;
    }

    function fundProject(uint _Id, uint _amount) external returns (uint) {
        require(
            block.timestamp < ProjectID[_Id].timelineGoal,
            "CrowdfundingPlatform: The funding already ended"
        );
        require(
            ProjectID[_Id].collectedAmount < ProjectID[_Id].fundingGoal,
            "CrowdfundingPlatform: crowd funding already reached to its limit"
        );
        require(
            !ProjectID[_Id].status,
            "CrowdfundingPlatform: The campaign has ended"
        );

        if (
            ProjectID[_Id].collectedAmount + _amount >
            ProjectID[_Id].fundingGoal
        ) {
            _amount =
                ProjectID[_Id].fundingGoal -
                ProjectID[_Id].collectedAmount;
            ProjectID[_Id].status = true;
        }
        token.transferFrom(msg.sender, address(this), _amount);
        Project storage project = ProjectID[_Id];
        project.collectedAmount += _amount;
        uint userStake = calculatefundingStakes(
            _amount,
            project.distributingPercentage,
            project.fundingGoal
        ); //function will return the user stakes
        stakes[_Id][msg.sender] = userStake;
        emit fundProjectEvent(_Id, msg.sender, userStake, _amount);
        return userStake;
    }

    function claimCampaignFunds(uint _Id) external onlyCreator(_Id) {
        require(
            ProjectID[_Id].status,
            "CrowdfundingPlatform: cannot claim before reaching goal"
        );
        require(
            block.timestamp > ProjectID[_Id].timelineGoal,
            "CrowdfundingPlatform: Wait for campaign to end"
        );
        uint totalAmountClaim = ProjectID[_Id].fundingGoal;
        token.transfer(msg.sender, totalAmountClaim);
        emit claimCampaignFundsEvent(_Id, msg.sender, totalAmountClaim);
    }

    function retrieveFunds(uint _Id) external {
        require(
            block.timestamp > ProjectID[_Id].timelineGoal,
            "CrowdfundingPlatform: Wait for campaign to end"
        );
        require(
            !ProjectID[_Id].status,
            "CrowdfundingPlatform: The campaign reached its goal"
        );
        require(
            stakes[_Id][msg.sender] > 0,
            "CrowdfundingPlatform: no stakes in this campaign"
        );

        uint amount = getInvestedAmount(
            stakes[_Id][msg.sender],
            ProjectID[_Id].distributingPercentage,
            ProjectID[_Id].fundingGoal
        );
        delete stakes[_Id][msg.sender]; //prevent reentrancy attack
        token.transfer(msg.sender, amount);
        emit retrieveFundsEvent(_Id, msg.sender, amount);
    }
}
