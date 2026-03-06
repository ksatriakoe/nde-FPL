// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title FPLStaking
 * @notice Stake TEST tokens to earn TEST rewards at a fixed APY.
 *         - No lock period: stake/unstake anytime
 *         - Owner sets APY in basis points (e.g. 4800 = 48%)
 *         - Owner deposits reward tokens into the contract
 *         - rewardRate auto-recalculates when APY or totalStaked changes
 *
 *         Uses Synthetix RewardPerToken accumulator pattern
 *         with APY-derived rewardRate.
 */
contract FPLStaking {
    IERC20 public stakingToken;
    address public owner;

    // --- APY & Reward state ---
    uint256 public apyBasisPoints;            // e.g. 4800 = 48%
    uint256 public rewardPerTokenStored;
    uint256 public lastUpdateTime;

    // --- Staking state ---
    uint256 public totalStaked;
    uint256 public minStake;

    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    // --- Reentrancy guard ---
    uint256 private _locked;

    // --- Events ---
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event APYUpdated(uint256 newAPY);
    event RewardsDeposited(uint256 amount);
    event MinStakeUpdated(uint256 newMinStake);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier nonReentrant() {
        require(_locked == 0, "Reentrant");
        _locked = 1;
        _;
        _locked = 0;
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    /**
     * @param _stakingToken  Address of the TEST ERC-20 token
     * @param _minStake      Minimum stake amount (in wei)
     * @param _apyBasisPoints  APY in basis points (4800 = 48%)
     */
    constructor(address _stakingToken, uint256 _minStake, uint256 _apyBasisPoints) {
        owner = msg.sender;
        stakingToken = IERC20(_stakingToken);
        minStake = _minStake;
        apyBasisPoints = _apyBasisPoints;
        lastUpdateTime = block.timestamp;
    }

    // =====================================================================
    // INTERNAL
    // =====================================================================

    /**
     * @dev Derives rewardRate (wei/sec) from APY and current totalStaked.
     *      rewardRate = totalStaked * apyBasisPoints / 10000 / 365.25 days
     */
    function _currentRewardRate() internal view returns (uint256) {
        if (totalStaked == 0 || apyBasisPoints == 0) return 0;
        return (totalStaked * apyBasisPoints) / 10000 / 365 days;
    }

    // =====================================================================
    // VIEW FUNCTIONS
    // =====================================================================

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }
        uint256 rate = _currentRewardRate();
        return rewardPerTokenStored + (
            (block.timestamp - lastUpdateTime) * rate * 1e18 / totalStaked
        );
    }

    function earned(address account) public view returns (uint256) {
        return (
            stakedBalance[account] * (rewardPerToken() - userRewardPerTokenPaid[account]) / 1e18
        ) + rewards[account];
    }

    function getStakeInfo(address account) external view returns (
        uint256 _totalStaked,
        uint256 _userStaked,
        uint256 _userRewards,
        uint256 _apyBasisPoints,
        uint256 _minStake
    ) {
        _totalStaked = totalStaked;
        _userStaked = stakedBalance[account];
        _userRewards = earned(account);
        _apyBasisPoints = apyBasisPoints;
        _minStake = minStake;
    }

    // =====================================================================
    // USER FUNCTIONS
    // =====================================================================

    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        require(amount >= minStake, "Below min stake");
        bool success = stakingToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");
        stakedBalance[msg.sender] += amount;
        totalStaked += amount;
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot unstake 0");
        require(stakedBalance[msg.sender] >= amount, "Exceeds staked");
        stakedBalance[msg.sender] -= amount;
        totalStaked -= amount;
        bool success = stakingToken.transfer(msg.sender, amount);
        require(success, "Transfer failed");
        emit Unstaked(msg.sender, amount);
    }

    function claimRewards() external nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "No rewards");
        rewards[msg.sender] = 0;
        bool success = stakingToken.transfer(msg.sender, reward);
        require(success, "Transfer failed");
        emit RewardsClaimed(msg.sender, reward);
    }

    // =====================================================================
    // OWNER FUNCTIONS
    // =====================================================================

    /**
     * @notice Set APY. Can be changed anytime.
     * @param _apyBasisPoints APY in basis points (4800 = 48%, 10000 = 100%)
     */
    function setAPY(uint256 _apyBasisPoints) external onlyOwner updateReward(address(0)) {
        apyBasisPoints = _apyBasisPoints;
        emit APYUpdated(_apyBasisPoints);
    }

    /**
     * @notice Owner deposits reward tokens into the contract.
     *         Must approve this contract first.
     */
    function depositRewards(uint256 amount) external onlyOwner {
        require(amount > 0, "Cannot deposit 0");
        bool success = stakingToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");
        emit RewardsDeposited(amount);
    }

    function setMinStake(uint256 _minStake) external onlyOwner {
        minStake = _minStake;
        emit MinStakeUpdated(_minStake);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @notice Emergency: withdraw excess reward tokens.
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        bool success = stakingToken.transfer(owner, amount);
        require(success, "Transfer failed");
    }

    /**
     * @notice View how many reward tokens are available in the contract
     *         (excluding staked tokens).
     */
    function rewardBalance() external view returns (uint256) {
        uint256 contractBalance = stakingToken.balanceOf(address(this));
        return contractBalance > totalStaked ? contractBalance - totalStaked : 0;
    }
}
