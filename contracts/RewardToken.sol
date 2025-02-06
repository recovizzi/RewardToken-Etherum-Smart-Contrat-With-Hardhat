// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract RewardToken is ERC20 {
    mapping(address => uint256) private lastClaimTime;
    uint256 private constant CLAIM_COOLDOWN = 10 minutes;
    uint256 private constant CLAIM_AMOUNT = 100 * 10**18;

    constructor() ERC20("RewardToken", "RWT") {
        _mint(address(this), 1000000 * 10**decimals());
    }

    function claimTokens() public {
        require(block.timestamp >= lastClaimTime[msg.sender] + CLAIM_COOLDOWN, 
                "Must wait 10 minutes between claims");
        
        lastClaimTime[msg.sender] = block.timestamp;
        _transfer(address(this), msg.sender, CLAIM_AMOUNT);
    }

    function getTokenBalance(address account) public view returns (uint256) {
        return balanceOf(account);
    }

    function getTimeUntilNextClaim(address account) public view returns (uint256) {
        if (block.timestamp >= lastClaimTime[account] + CLAIM_COOLDOWN) {
            return 0;
        }
        return lastClaimTime[account] + CLAIM_COOLDOWN - block.timestamp;
    }

    function playRussianRoulette(uint256 amount, uint8 bullets) public returns (bool) {
        require(bullets > 0 && bullets <= 5, "Number of bullets must be between 1 and 5");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        require(amount > 0, "Amount must be greater than 0");

        _transfer(msg.sender, address(this), amount);

        uint256 randomNumber = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender))) % 6 + 1;

        if (randomNumber > bullets) {
            uint256 reward = amount * (bullets + 2) / 2;
            _transfer(address(this), msg.sender, reward);
            return true;
        }

        return false;
    }

    function transferTokens(address to, uint256 amount) public returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(to != address(this), "Cannot transfer to contract address");
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= balanceOf(msg.sender), "Insufficient balance");

        _transfer(msg.sender, to, amount);
        return true;
    }
}