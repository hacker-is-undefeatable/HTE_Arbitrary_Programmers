// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ScholarFlyToken is ERC20, Ownable {
    mapping(address => bool) public approvedMinters;

    event MinterUpdated(address indexed minter, bool isApproved);
    event RewardMinted(address indexed to, uint256 amount, address indexed mintedBy);

    constructor(uint256 initialSupply) ERC20("ScholarFly Token", "SFT") Ownable(msg.sender) {
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply);
        }
    }

    modifier onlyMinter() {
        require(
            msg.sender == owner() || approvedMinters[msg.sender],
            "ScholarFlyToken: caller is not an approved minter"
        );
        _;
    }

    function setMinter(address minter, bool isApproved) external onlyOwner {
        require(minter != address(0), "ScholarFlyToken: invalid minter address");
        approvedMinters[minter] = isApproved;
        emit MinterUpdated(minter, isApproved);
    }

    function mintReward(address to, uint256 amount) external onlyMinter returns (bool) {
        require(to != address(0), "ScholarFlyToken: invalid recipient");
        require(amount > 0, "ScholarFlyToken: amount must be greater than 0");

        _mint(to, amount);
        emit RewardMinted(to, amount, msg.sender);
        return true;
    }

    function mint(address to, uint256 amount) external onlyMinter returns (bool) {
        require(to != address(0), "ScholarFlyToken: invalid recipient");
        require(amount > 0, "ScholarFlyToken: amount must be greater than 0");

        _mint(to, amount);
        emit RewardMinted(to, amount, msg.sender);
        return true;
    }
}
