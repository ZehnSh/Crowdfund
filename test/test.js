const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crowd Funding", function () {

  let ERC20;
  let CrowdFunding;
  let owner,account1,account2,account3,account4,account5;
  let oneDay;

  beforeEach("deployement", async()=> {
    oneDay = 24 * 60 * 60;
    [owner,account1,account2,account3,account4,account5] = await ethers.getSigners();
    const ERC20Contract = await ethers.getContractFactory("MyToken");
    ERC20 = await ERC20Contract.deploy();
    await ERC20.deployed();

    const CrowdFundingContract = await ethers.getContractFactory("CrowdfundingPlatform");
    CrowdFunding = await  CrowdFundingContract.deploy(ERC20.address);
    await CrowdFunding.deployed(); 
  })

  it("Deployment check", async()=> {
    expect(await ERC20.name()).to.equal("MyToken");
    expect(await ERC20.symbol()).to.equal("MTK");
  })

  it("should create multiple campaign", async()=> {
    ERC20.mint(account2.address,ethers.utils.parseUnits("100","ether"))
    await CrowdFunding.connect(account1).createCrowdFundingProject();
    await CrowdFunding.connect(account2).createCrowdFundingProject();
    await CrowdFunding.connect(account3).createCrowdFundingProject();

    console.log(await CrowdFunding.getAllOngoingProjects());
    

  })

  it("should create campaign and fund project", async()=> {
    // minting balance of erc20 token for dunding project
    ERC20.mint(account2.address,ethers.utils.parseUnits("100","ether"))
    //created crowd funding project from account1
    await CrowdFunding.connect(account1).createCrowdFundingProject();
    expect(Number(await CrowdFunding.getAllOngoingProjects())).to.equal(1);
    await expect(CrowdFunding.startCrowdFunding(1,1,1,1)).to.be.reverted;
    // started crowdfunding project from account with parameters
    await CrowdFunding.connect(account1).startCrowdFunding(1,ethers.utils.parseUnits("100","ether"),5000,await time.latest() + (8 * oneDay));
    await ERC20.connect(account2).approve(CrowdFunding.address,ethers.utils.parseUnits("10","ether"));
    balanceBefore = await ERC20.balanceOf(account2.address);
    //using account we have funded the project with 10 tokens
    await CrowdFunding.connect(account2).fundProject(1,ethers.utils.parseUnits("10","ether"));
    console.log(await CrowdFunding.stakes(1,account2.address));
    //tried claiming
    await expect(CrowdFunding.connect(account1).claimCampaignFunds(1)).to.be.revertedWith("CrowdfundingPlatform: cannot claim before reaching goal");
    await expect(CrowdFunding.connect(account2).retrieveFunds(1)).to.be.revertedWith("CrowdfundingPlatform: Wait for campaign to end");

    await time.increase(oneDay*9);
    await CrowdFunding.connect(account2).retrieveFunds(1);
    //balance should be equal to the before balance
    expect(balanceBefore).to.equal(await ERC20.balanceOf(account2.address));

  })

  it("should create campaign and can claim funds", async()=> {
    // mint 100 tokens to every funding accounts
    ERC20.mint(account2.address,ethers.utils.parseUnits("100","ether"))
    ERC20.mint(account3.address,ethers.utils.parseUnits("100","ether"))
    ERC20.mint(account4.address,ethers.utils.parseUnits("100","ether"))
    ERC20.mint(account5.address,ethers.utils.parseUnits("100","ether"))
    //created crowd dunding project
    await CrowdFunding.connect(account1).createCrowdFundingProject();
    expect(Number(await CrowdFunding.getAllOngoingProjects())).to.equal(1);
    await expect(CrowdFunding.startCrowdFunding(1,1,1,1)).to.be.reverted;
    // started crowdfunding project from account with parameters

    await CrowdFunding.connect(account1).startCrowdFunding(1,ethers.utils.parseUnits("100","ether"),5000,await time.latest() + (8 * oneDay));
    await ERC20.connect(account2).approve(CrowdFunding.address,ethers.utils.parseUnits("10","ether"));
    await ERC20.connect(account3).approve(CrowdFunding.address,ethers.utils.parseUnits("30","ether"));
    await ERC20.connect(account4).approve(CrowdFunding.address,ethers.utils.parseUnits("40","ether"));
    await ERC20.connect(account5).approve(CrowdFunding.address,ethers.utils.parseUnits("30","ether"));
    //funnded the campaing with the accounts
    await CrowdFunding.connect(account2).fundProject(1,ethers.utils.parseUnits("10","ether"));
    await CrowdFunding.connect(account3).fundProject(1,ethers.utils.parseUnits("30","ether"));
    await CrowdFunding.connect(account4).fundProject(1,ethers.utils.parseUnits("40","ether"));
    await CrowdFunding.connect(account5).fundProject(1,ethers.utils.parseUnits("30","ether"));

    console.log(await CrowdFunding.stakes(1,account5.address));

    await expect(CrowdFunding.connect(account1).claimCampaignFunds(1)).to.be.revertedWith("CrowdfundingPlatform: Wait for campaign to end");
    await time.increase(oneDay*9);
    //cannot take back the funds once the campaign reached its goal
    await expect(CrowdFunding.connect(account2).retrieveFunds(1)).to.be.revertedWith("CrowdfundingPlatform: The campaign reached its goal");
    await expect(CrowdFunding.connect(account3).retrieveFunds(1)).to.be.revertedWith("CrowdfundingPlatform: The campaign reached its goal");
    await expect(CrowdFunding.connect(account4).retrieveFunds(1)).to.be.revertedWith("CrowdfundingPlatform: The campaign reached its goal");
    await expect(CrowdFunding.connect(account5).retrieveFunds(1)).to.be.revertedWith("CrowdfundingPlatform: The campaign reached its goal");

    await CrowdFunding.connect(account1).claimCampaignFunds(1);

    expect(await ERC20.balanceOf(account1.address)).to.equal(ethers.utils.parseUnits("100","ether"))

  });


  it("should create campaign and refund the funds if not reached its goal", async()=> {
    ERC20.mint(account2.address,ethers.utils.parseUnits("100","ether"))
    ERC20.mint(account3.address,ethers.utils.parseUnits("100","ether"))
    ERC20.mint(account4.address,ethers.utils.parseUnits("100","ether"))
    ERC20.mint(account5.address,ethers.utils.parseUnits("100","ether"))

    await CrowdFunding.connect(account1).createCrowdFundingProject();
    expect(Number(await CrowdFunding.getAllOngoingProjects())).to.equal(1);
    await expect(CrowdFunding.startCrowdFunding(1,1,1,1)).to.be.reverted;
    await CrowdFunding.connect(account1).startCrowdFunding(1,ethers.utils.parseUnits("100","ether"),5000,await time.latest() + (8 * oneDay));
    await ERC20.connect(account2).approve(CrowdFunding.address,ethers.utils.parseUnits("10","ether"));
    await ERC20.connect(account3).approve(CrowdFunding.address,ethers.utils.parseUnits("30","ether"));
    await ERC20.connect(account4).approve(CrowdFunding.address,ethers.utils.parseUnits("40","ether"));
    await ERC20.connect(account5).approve(CrowdFunding.address,ethers.utils.parseUnits("10","ether"));

    const balanceBefore1 = await ERC20.balanceOf(account2.address);
    const balanceBefore2 = await ERC20.balanceOf(account3.address);
    const balanceBefore3 = await ERC20.balanceOf(account4.address);
    const balanceBefore4 = await ERC20.balanceOf(account5.address);

    await CrowdFunding.connect(account2).fundProject(1,ethers.utils.parseUnits("10","ether"));
    await CrowdFunding.connect(account3).fundProject(1,ethers.utils.parseUnits("30","ether"));
    await CrowdFunding.connect(account4).fundProject(1,ethers.utils.parseUnits("40","ether"));
    await CrowdFunding.connect(account5).fundProject(1,ethers.utils.parseUnits("10","ether"));

    console.log(await CrowdFunding.stakes(1,account5.address));

    await expect(CrowdFunding.connect(account1).claimCampaignFunds(1)).to.be.revertedWith("CrowdfundingPlatform: cannot claim before reaching goal");
    await time.increase(oneDay*9);
    await CrowdFunding.connect(account2).retrieveFunds(1)
    await CrowdFunding.connect(account3).retrieveFunds(1)
    await CrowdFunding.connect(account4).retrieveFunds(1)
    await CrowdFunding.connect(account5).retrieveFunds(1)

    // await CrowdFunding.connect(account1).claimCampaignFunds(1);

    expect(await ERC20.balanceOf(account2.address)).to.equal(balanceBefore1)
    expect(await ERC20.balanceOf(account3.address)).to.equal(balanceBefore2)
    expect(await ERC20.balanceOf(account4.address)).to.equal(balanceBefore3)
    expect(await ERC20.balanceOf(account5.address)).to.equal(balanceBefore4)

  })

 
});
