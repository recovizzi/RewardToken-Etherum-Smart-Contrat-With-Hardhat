const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("RewardToken", function () {
  async function deployRewardTokenFixture() {
    const [owner, user1, user2] = await ethers.getSigners();
    const RewardToken = await ethers.getContractFactory("RewardToken");
    const rewardToken = await RewardToken.deploy();
    return { rewardToken, owner, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should initialize with correct name and symbol", async function () {
      const { rewardToken } = await loadFixture(deployRewardTokenFixture);
      expect(await rewardToken.name()).to.equal("RewardToken");
      expect(await rewardToken.symbol()).to.equal("RWT");
    });

    it("Should mint initial supply to contract", async function () {
      const { rewardToken } = await loadFixture(deployRewardTokenFixture);
      const initialSupply = ethers.parseEther("1000000");
      expect(await rewardToken.balanceOf(rewardToken.target)).to.equal(initialSupply);
    });
  });

  describe("Token Claims", function () {
    it("Should allow users to claim tokens", async function () {
      const { rewardToken, user1 } = await loadFixture(deployRewardTokenFixture);
      await rewardToken.connect(user1).claimTokens();
      expect(await rewardToken.balanceOf(user1.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should enforce cooldown period", async function () {
      const { rewardToken, user1 } = await loadFixture(deployRewardTokenFixture);
      await rewardToken.connect(user1).claimTokens();
      await expect(rewardToken.connect(user1).claimTokens())
        .to.be.revertedWith("Must wait 10 minutes between claims");
    });

    it("Should allow claim after cooldown", async function () {
      const { rewardToken, user1 } = await loadFixture(deployRewardTokenFixture);
      await rewardToken.connect(user1).claimTokens();
      await time.increase(600); // 10 minutes
      await rewardToken.connect(user1).claimTokens();
      expect(await rewardToken.balanceOf(user1.address)).to.equal(ethers.parseEther("200"));
    });
  });

  describe("Russian Roulette Game", function () {
    it("Should reject invalid bullet counts", async function () {
      const { rewardToken, user1 } = await loadFixture(deployRewardTokenFixture);
      await expect(rewardToken.connect(user1).playRussianRoulette(100, 6))
        .to.be.revertedWith("Number of bullets must be between 1 and 5");
    });

    it("Should reject zero amount bets", async function () {
      const { rewardToken, user1 } = await loadFixture(deployRewardTokenFixture);
      await expect(rewardToken.connect(user1).playRussianRoulette(0, 1))
        .to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should handle insufficient balance", async function () {
      const { rewardToken, user1 } = await loadFixture(deployRewardTokenFixture);
      await expect(rewardToken.connect(user1).playRussianRoulette(ethers.parseEther("1"), 1))
        .to.be.revertedWith("Insufficient balance");
    });

    it("Should process successful game with reward", async function () {
      const { rewardToken, user1 } = await loadFixture(deployRewardTokenFixture);
      await rewardToken.connect(user1).claimTokens();
      const initialBalance = await rewardToken.balanceOf(user1.address);
      const betAmount = ethers.parseEther("50");
      await rewardToken.connect(user1).playRussianRoulette(betAmount, 1);
      const finalBalance = await rewardToken.balanceOf(user1.address);
      expect(finalBalance).to.not.equal(initialBalance);
    });
  });

  describe("Token Transfers", function () {
    it("Should allow normal transfers between users", async function () {
      const { rewardToken, user1, user2 } = await loadFixture(deployRewardTokenFixture);
      await rewardToken.connect(user1).claimTokens();
      await rewardToken.connect(user1).transferTokens(user2.address, ethers.parseEther("50"));
      expect(await rewardToken.balanceOf(user2.address)).to.equal(ethers.parseEther("50"));
    });

    it("Should prevent transfers to zero address", async function () {
      const { rewardToken, user1 } = await loadFixture(deployRewardTokenFixture);
      await rewardToken.connect(user1).claimTokens();
      await expect(rewardToken.connect(user1).transferTokens(ethers.ZeroAddress, 100))
        .to.be.revertedWith("Cannot transfer to zero address");
    });

    it("Should prevent transfers to contract address", async function () {
      const { rewardToken, user1 } = await loadFixture(deployRewardTokenFixture);
      await rewardToken.connect(user1).claimTokens();
      await expect(rewardToken.connect(user1).transferTokens(rewardToken.target, 100))
        .to.be.revertedWith("Cannot transfer to contract address");
    });
  });

  describe("View Functions", function () {
    it("Should return correct token balance", async function () {
      const { rewardToken, user1 } = await loadFixture(deployRewardTokenFixture);
      await rewardToken.connect(user1).claimTokens();
      expect(await rewardToken.getTokenBalance(user1.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should return correct time until next claim", async function () {
      const { rewardToken, user1 } = await loadFixture(deployRewardTokenFixture);
      await rewardToken.connect(user1).claimTokens();
      expect(await rewardToken.getTimeUntilNextClaim(user1.address)).to.be.gt(0);
      await time.increase(600);
      expect(await rewardToken.getTimeUntilNextClaim(user1.address)).to.equal(0);
    });
  });
});
