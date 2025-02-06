// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RewardToken is ERC20, Ownable {
    mapping(address => uint256) private lastClaimTime;
    uint256 private constant CLAIM_COOLDOWN = 10 minutes;
    uint256 private constant CLAIM_AMOUNT = 100 * 10**18;

    uint256 private constant MAX_SUPPLY = 1000000 * 10**18;
    uint256 private availableTokens;

    constructor() ERC20("RewardToken", "RWT") Ownable(msg.sender) {
        _mint(address(this), MAX_SUPPLY);
        availableTokens = MAX_SUPPLY;
    }

    modifier checkAvailableTokens(uint256 amount) {
        require(availableTokens >= amount, "Insufficient tokens available for distribution");
        _;
    }

    function claimTokens() public checkAvailableTokens(CLAIM_AMOUNT) {
        require(block.timestamp >= lastClaimTime[msg.sender] + CLAIM_COOLDOWN, 
                "Must wait 10 minutes between claims");
        
        lastClaimTime[msg.sender] = block.timestamp;
        availableTokens -= CLAIM_AMOUNT;
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

        uint256 potentialReward = amount * (bullets + 2) / 2;
        require(availableTokens >= potentialReward, "Insufficient tokens available for potential reward");

        _transfer(msg.sender, address(this), amount);
        availableTokens += amount;

        uint256 randomNumber = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender))) % 6 + 1;

        if (randomNumber > bullets) {
            availableTokens -= potentialReward;
            _transfer(address(this), msg.sender, potentialReward);
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

    function addTokensToAddress(address to, uint256 amount) public onlyOwner checkAvailableTokens(amount) returns (bool) {
        require(to != address(0), "Cannot add tokens to zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(to != address(this), "Cannot add tokens to contract address");

        availableTokens -= amount;
        _transfer(address(this), to, amount);
        return true;
    }

    function getAvailableTokens() public view returns (uint256) {
        return availableTokens;
    }

    function burnTokens(uint256 amount) public onlyOwner returns (bool) {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= availableTokens, "Cannot burn more tokens than available");
        require(amount <= balanceOf(address(this)), "Insufficient balance in contract");

        availableTokens -= amount;
        _burn(address(this), amount);
        return true;
    }
}