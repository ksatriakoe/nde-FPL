// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

/**
 * @title FPLSubscription
 * @notice Payment-only contract. Receives ERC-20 tokens and emits event.
 *         Subscription data is stored off-chain (Supabase).
 */
contract FPLSubscription {
    address public owner;
    IERC20 public paymentToken;
    uint256 public price;

    event Paid(address indexed subscriber, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _token, uint256 _price) {
        owner = msg.sender;
        paymentToken = IERC20(_token);
        price = _price;
    }

    /**
     * @notice Pay for subscription. Token goes to contract, event emitted.
     *         Subscription tracking is done off-chain.
     */
    function pay() external {
        require(paymentToken.allowance(msg.sender, address(this)) >= price, "Approve tokens first");
        bool success = paymentToken.transferFrom(msg.sender, address(this), price);
        require(success, "Transfer failed");
        emit Paid(msg.sender, price);
    }

    function setPrice(uint256 newPrice) external onlyOwner {
        price = newPrice;
    }

    function withdraw(address to) external onlyOwner {
        uint256 balance = paymentToken.balanceOf(address(this));
        require(balance > 0, "No balance");
        (bool success, ) = address(paymentToken).call(
            abi.encodeWithSelector(bytes4(keccak256("transfer(address,uint256)")), to, balance)
        );
        require(success, "Withdraw failed");
        emit Withdrawn(to, balance);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
}
