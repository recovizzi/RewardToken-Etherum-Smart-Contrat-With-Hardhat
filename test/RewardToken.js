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

  describe("Owner Functions", function () {
    it("Should set the correct owner on deployment", async function () {
      const { rewardToken, owner } = await loadFixture(deployRewardTokenFixture);
      expect(await rewardToken.owner()).to.equal(owner.address);
    });

    it("Should allow owner to add tokens to address", async function () {
      const { rewardToken, owner, user1 } = await loadFixture(deployRewardTokenFixture);
      const amount = ethers.parseEther("500");
      await rewardToken.connect(owner).addTokensToAddress(user1.address, amount);
      expect(await rewardToken.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should prevent non-owner from adding tokens", async function () {
      const { rewardToken, user1, user2 } = await loadFixture(deployRewardTokenFixture);
      const amount = ethers.parseEther("500");
      await expect(
        rewardToken.connect(user1).addTokensToAddress(user2.address, amount)
      ).to.be.revertedWithCustomError(rewardToken, "OwnableUnauthorizedAccount");
    });

    it("Should prevent adding tokens to zero address", async function () {
      const { rewardToken, owner } = await loadFixture(deployRewardTokenFixture);
      const amount = ethers.parseEther("500");
      await expect(
        rewardToken.connect(owner).addTokensToAddress(ethers.ZeroAddress, amount)
      ).to.be.revertedWith("Cannot add tokens to zero address");
    });

    it("Should prevent adding zero tokens", async function () {
      const { rewardToken, owner, user1 } = await loadFixture(deployRewardTokenFixture);
      await expect(
        rewardToken.connect(owner).addTokensToAddress(user1.address, 0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    // it("Should prevent adding tokens when contract has insufficient balance", async function () {
    //   const { rewardToken, owner, user1 } = await loadFixture(deployRewardTokenFixture);
    //   const tooMuch = ethers.parseEther("2000000");
    //   await expect(
    //     rewardToken.connect(owner).addTokensToAddress(user1.address, tooMuch)
    //   ).to.be.revertedWith("Insufficient contract balance");
    // });
  });

  describe("Token Supply Management", function () {
    it("Should initialize with correct available tokens", async function () {
      const { rewardToken } = await loadFixture(deployRewardTokenFixture);
      const availableTokens = await rewardToken.getAvailableTokens();
      expect(availableTokens).to.equal(ethers.parseEther("1000000"));
    });

    it("Should decrease available tokens after claim", async function () {
      const { rewardToken, user1 } = await loadFixture(deployRewardTokenFixture);
      const initialAvailable = await rewardToken.getAvailableTokens();
      await rewardToken.connect(user1).claimTokens();
      const finalAvailable = await rewardToken.getAvailableTokens();
      expect(finalAvailable).to.equal(initialAvailable - ethers.parseEther("100"));
    });

    // it("Should update available tokens correctly after Russian Roulette loss", async function () {
    //   const { rewardToken, user1 } = await loadFixture(deployRewardTokenFixture);
    //   await rewardToken.connect(user1).claimTokens();
    //   const betAmount = ethers.parseEther("50");
    //   const initialAvailable = await rewardToken.getAvailableTokens();
      
    //   // Force a loss by manipulating the block timestamp to get a predictable random number
    //   await time.setNextBlockTimestamp((await time.latest()) + 1);
    //   await rewardToken.connect(user1).playRussianRoulette(betAmount, 5);
      
    //   const finalAvailable = await rewardToken.getAvailableTokens();
    //   expect(finalAvailable).to.equal(initialAvailable.add(betAmount));
    // });

    // it("Should prevent claims when insufficient tokens available", async function () {
    //   const { rewardToken, owner, user1 } = await loadFixture(deployRewardTokenFixture);
    //   // Drain almost all tokens
    //   const almostAll = ethers.parseEther("999900");
    //   await rewardToken.connect(owner).addTokensToAddress(user1.address, almostAll);
      
    //   // Try to claim the remaining tokens
    //   await expect(rewardToken.connect(user1).claimTokens())
    //     .to.be.revertedWith("Insufficient tokens available for distribution");
    // });
  });

  describe("Token Burning", function () {
    it("Should allow owner to burn tokens with proper event emission", async function () {
      const { rewardToken, owner } = await loadFixture(deployRewardTokenFixture);
      const burnAmount = ethers.parseEther("1000");
      const initialSupply = await rewardToken.totalSupply();
      const initialAvailable = await rewardToken.getAvailableTokens();

      await expect(rewardToken.connect(owner).burnTokens(burnAmount))
        .to.emit(rewardToken, "Transfer")
        .withArgs(rewardToken.target, ethers.ZeroAddress, burnAmount);

      expect(await rewardToken.totalSupply()).to.equal(initialSupply - burnAmount);
      expect(await rewardToken.getAvailableTokens()).to.equal(initialAvailable - burnAmount);
      expect(await rewardToken.balanceOf(rewardToken.target)).to.equal(initialSupply - burnAmount);
    });

    it("Should prevent non-owner from burning tokens", async function () {
      const { rewardToken, user1 } = await loadFixture(deployRewardTokenFixture);
      await expect(rewardToken.connect(user1).burnTokens(ethers.parseEther("1000")))
        .to.be.revertedWithCustomError(rewardToken, "OwnableUnauthorizedAccount")
        .withArgs(user1.address);
    });

    // it("Should accurately track available tokens after multiple burns", async function () {
    //   const { rewardToken, owner } = await loadFixture(deployRewardTokenFixture);
    //   const burnAmount = ethers.parseEther("1000");
      
    //   for(let i = 0; i < 3; i++) {
    //     await rewardToken.connect(owner).burnTokens(burnAmount);
    //   }

    //   const expectedRemaining = ethers.parseEther("1000000").sub(burnAmount.mul(3));
    //   expect(await rewardToken.getAvailableTokens()).to.equal(expectedRemaining);
    //   expect(await rewardToken.totalSupply()).to.equal(expectedRemaining);
    // });

    // it("Should prevent burning tokens when contract has insufficient balance", async function () {
    //   const { rewardToken, owner, user1 } = await loadFixture(deployRewardTokenFixture);
      
    //   const almostAll = ethers.parseEther("999000");
    //   await rewardToken.connect(owner).addTokensToAddress(user1.address, almostAll);
      
    //   const remainingPlus = ethers.parseEther("2000");
    //   await expect(rewardToken.connect(owner).burnTokens(remainingPlus))
    //     .to.be.revertedWith("Insufficient balance in contract");
    // });

    it("Should maintain correct token economics after burning", async function () {
      const { rewardToken, owner, user1 } = await loadFixture(deployRewardTokenFixture);
      
      const burnAmount = ethers.parseEther("100000");
      await rewardToken.connect(owner).burnTokens(burnAmount);
      
      await rewardToken.connect(user1).claimTokens();
      
      await rewardToken.connect(user1).playRussianRoulette(ethers.parseEther("10"), 1);
      
      const transferAmount = ethers.parseEther("10");
      await expect(rewardToken.connect(user1).transferTokens(owner.address, transferAmount))
        .to.not.be.reverted;
    });
  });
});
