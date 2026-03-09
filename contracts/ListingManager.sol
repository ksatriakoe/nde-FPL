// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IUniswapV2Factory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title ListingManager
 * @notice Charges a listing fee in TEST tokens to create new trading pairs.
 *         Owner can create pairs for free and adjust the fee.
 *         Listing fee: 100 TEST (configurable).
 */
contract ListingManager {
    IUniswapV2Factory public factory;
    IERC20 public feeToken;
    address public owner;
    uint256 public listingFee;

    event TokenListed(address indexed token, address indexed pairedWith, address pair, address indexed lister, uint256 fee);
    event ListingFeeUpdated(uint256 newFee);
    event FeesWithdrawn(address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /**
     * @param _factory      Address of the custom UniswapV2Factory
     * @param _feeToken     Address of the TEST token (fee payment)
     * @param _listingFee   Initial listing fee in wei (e.g. 100e18 for 100 TEST)
     */
    constructor(address _factory, address _feeToken, uint256 _listingFee) {
        factory = IUniswapV2Factory(_factory);
        feeToken = IERC20(_feeToken);
        listingFee = _listingFee;
        owner = msg.sender;
    }

    // =====================================================================
    // USER FUNCTIONS
    // =====================================================================

    /**
     * @notice Pay listing fee to create a new pair on the custom factory.
     * @param token      The token to list
     * @param pairedWith The token to pair with (usually WETH)
     */
    function listToken(address token, address pairedWith) external returns (address pair) {
        require(factory.getPair(token, pairedWith) == address(0), "Pair already exists");

        // Collect listing fee
        bool success = feeToken.transferFrom(msg.sender, address(this), listingFee);
        require(success, "Fee payment failed");

        // Create pair on factory
        pair = factory.createPair(token, pairedWith);

        emit TokenListed(token, pairedWith, pair, msg.sender, listingFee);
    }

    // =====================================================================
    // OWNER FUNCTIONS
    // =====================================================================

    /**
     * @notice Owner can list tokens without fee (for initial pairs, partnerships, etc.)
     */
    function listTokenFree(address token, address pairedWith) external onlyOwner returns (address pair) {
        require(factory.getPair(token, pairedWith) == address(0), "Pair already exists");
        pair = factory.createPair(token, pairedWith);
        emit TokenListed(token, pairedWith, pair, msg.sender, 0);
    }

    function setListingFee(uint256 _fee) external onlyOwner {
        listingFee = _fee;
        emit ListingFeeUpdated(_fee);
    }

    function withdrawFees(address to) external onlyOwner {
        uint256 balance = feeToken.balanceOf(address(this));
        require(balance > 0, "No fees to withdraw");
        bool success = feeToken.transfer(to, balance);
        require(success, "Transfer failed");
        emit FeesWithdrawn(to, balance);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // =====================================================================
    // VIEW FUNCTIONS
    // =====================================================================

    function pairExists(address tokenA, address tokenB) external view returns (bool) {
        return factory.getPair(tokenA, tokenB) != address(0);
    }
}
