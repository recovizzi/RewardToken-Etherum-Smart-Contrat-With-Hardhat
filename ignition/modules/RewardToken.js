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

    // Verify initial supply and available tokens
    const totalSupply = await deployedToken.totalSupply();
    const availableTokens = await deployedToken.getAvailableTokens();
    console.log("Initial total supply:", totalSupply.toString());
    console.log("Initial available tokens:", availableTokens.toString());
    
    // Verify contract balance matches total supply
    const contractBalance = await deployedToken.balanceOf(deployedToken.address);
    console.log("Contract balance:", contractBalance.toString());
    
    if (contractBalance.toString() !== totalSupply.toString()) {
      console.warn("Warning: Contract balance does not match total supply!");
    }

    if (totalSupply.toString() !== availableTokens.toString()) {
      console.warn("Warning: Total supply and available tokens mismatch!");
    }

    // Verify owner and permissions
    const owner = await deployedToken.owner();
    console.log("Contract owner:", owner);
    if (owner !== context.deployer) {
      console.warn("Warning: Deployer is not the contract owner!");
    }

    // Log deployment success
    console.log("RewardToken deployment completed successfully with burn functionality");
  });

  return { rewardToken };
});
