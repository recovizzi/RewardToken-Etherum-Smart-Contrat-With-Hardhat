// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("RewardTokenModule", (m) => {
  const rewardToken = m.contract("RewardToken", [], {
    gasLimit: 5000000,
    value: 0,
    from: m.deployer
  });

  // Add post-deployment verification
  m.afterDeploy(async (_, context) => {
    const deployedToken = await context.contracts.rewardToken;
    console.log("RewardToken deployed to:", deployedToken.address);

    // Verify initial supply
    const totalSupply = await deployedToken.totalSupply();
    console.log("Initial total supply:", totalSupply.toString());

    // Verify contract balance
    const contractBalance = await deployedToken.balanceOf(deployedToken.address);
    console.log("Contract balance:", contractBalance.toString());
  });

  return { rewardToken };
});
