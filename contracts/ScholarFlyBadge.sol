// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ScholarFlyBadge is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId = 1;
    mapping(address => bool) public approvedMinters;

    event BadgeMinted(
        uint256 indexed tokenId,
        address indexed to,
        string tokenURI,
        address indexed mintedBy
    );

    event MinterUpdated(address indexed minter, bool isApproved);

    constructor() ERC721("ScholarFly Badge", "SFB") Ownable(msg.sender) {}

    modifier onlyMinter() {
        require(
            msg.sender == owner() || approvedMinters[msg.sender],
            "ScholarFlyBadge: caller is not an approved minter"
        );
        _;
    }

    function setMinter(address minter, bool isApproved) external onlyOwner {
        require(minter != address(0), "ScholarFlyBadge: invalid minter address");
        approvedMinters[minter] = isApproved;
        emit MinterUpdated(minter, isApproved);
    }

    function mintBadge(address to, string memory tokenURI_) external onlyMinter returns (uint256) {
        return _mintWithURI(to, tokenURI_);
    }

    function safeMint(address to, string memory tokenURI_) external onlyMinter returns (uint256) {
        return _mintWithURI(to, tokenURI_);
    }

    function mint(address to, string memory tokenURI_) external onlyMinter returns (uint256) {
        return _mintWithURI(to, tokenURI_);
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    function _mintWithURI(address to, string memory tokenURI_) internal returns (uint256) {
        require(to != address(0), "ScholarFlyBadge: invalid recipient");
        require(bytes(tokenURI_).length > 0, "ScholarFlyBadge: tokenURI required");

        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        emit BadgeMinted(tokenId, to, tokenURI_, msg.sender);
        return tokenId;
    }
}
