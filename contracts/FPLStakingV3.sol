// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title FPLStaking V3 — Fixed APY
 * @notice Stake TEST tokens to earn TEST rewards with a fixed APY set by the owner.
 *         - No lock period: stake/unstake anytime
 *         - APY is set by the owner (e.g. 1200 = 12%)
 *         - Reward rate = totalStaked × APY% / year
 *         - Owner deposits reward tokens into the contract to fund rewards
 *         - Rewards are distributed proportionally from the available pool
 *         - Distribution auto-stops when rewardPool is exhausted
 *
 *         Uses Synthetix RewardPerToken accumulator pattern
 *         with fixed-APY-derived rewardRate.
 */
contract FPLStakingV3 {
    IERC20 public stakingToken;
    address public owner;

    // --- Reward state ---
    uint256 public rewardPerTokenStored;
    uint256 public lastUpdateTime;

    // --- Staking state ---
    uint256 public totalStaked;
    uint256 public minStake;

    // --- Fixed APY ---
    // Stored in basis points: 1200 = 12.00%, 500 = 5.00%, 10000 = 100%
    uint256 public apyBasisPoints;

    // --- Reward pool tracking ---
    // Tracks reward tokens deposited minus rewards already distributed
    uint256 public rewardPool;

    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    // --- Reentrancy guard ---
    uint256 private _locked;

    // --- Events ---
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardsDeposited(uint256 amount);
    event MinStakeUpdated(uint256 newMinStake);
    event APYUpdated(uint256 newAPYBasisPoints);
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
        // Settle any accrued rewards before state changes
        uint256 newRewardPerToken = rewardPerToken();
        
        // Calculate how much reward was distributed since last update
        if (totalStaked > 0) {
            uint256 rewardDistributed = _rewardsSinceLastUpdate();
            // Decrease rewardPool by the amount distributed
            if (rewardDistributed > rewardPool) {
                rewardDistributed = rewardPool;
            }
            rewardPool -= rewardDistributed;
        }
        
        rewardPerTokenStored = newRewardPerToken;
        lastUpdateTime = block.timestamp;
        
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    /**
     * @param _stakingToken    Address of the TEST ERC-20 token
     * @param _minStake        Minimum stake amount (in wei)
     * @param _apyBasisPoints  Initial APY in basis points (e.g. 1200 = 12%)
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
     * @dev Derives rewardRate (wei/sec) from totalStaked and fixed APY.
     *      rewardRate = totalStaked × apyBasisPoints / 10000 / 365 days
     *      Returns 0 if rewardPool is empty (no funds to distribute).
     */
    function _currentRewardRate() internal view returns (uint256) {
        if (totalStaked == 0 || rewardPool == 0 || apyBasisPoints == 0) return 0;
        return (totalStaked * apyBasisPoints) / 10000 / 365 days;
    }

    /**
     * @dev Calculate rewards accrued since last update, capped at rewardPool.
     */
    function _rewardsSinceLastUpdate() internal view returns (uint256) {
        uint256 rate = _currentRewardRate();
        uint256 elapsed = block.timestamp - lastUpdateTime;
        uint256 accrued = elapsed * rate;
        if (accrued > rewardPool) {
            accrued = rewardPool;
        }
        return accrued;
    }

    // =====================================================================
    // VIEW FUNCTIONS
    // =====================================================================

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }
        uint256 rewardAccrued = _rewardsSinceLastUpdate();
        return rewardPerTokenStored + (
            rewardAccrued * 1e18 / totalStaked
        );
    }

    function earned(address account) public view returns (uint256) {
        return (
            stakedBalance[account] * (rewardPerToken() - userRewardPerTokenPaid[account]) / 1e18
        ) + rewards[account];
    }

    /**
     * @notice Returns the current fixed APY in basis points.
     *         e.g. 1200 = 12.00% APY
     */
    function getAPY() public view returns (uint256) {
        return apyBasisPoints;
    }

    function getStakeInfo(address account) external view returns (
        uint256 _totalStaked,
        uint256 _userStaked,
        uint256 _userRewards,
        uint256 _rewardPool,
        uint256 _minStake,
        uint256 _apy
    ) {
        _totalStaked = totalStaked;
        _userStaked = stakedBalance[account];
        _userRewards = earned(account);
        _rewardPool = rewardPool;
        _minStake = minStake;
        _apy = apyBasisPoints;
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
     * @notice Owner deposits reward tokens into the contract.
     *         Must approve this contract first.
     *         Deposited tokens fund the fixed APY rewards.
     */
    function depositRewards(uint256 amount) external onlyOwner updateReward(address(0)) {
        require(amount > 0, "Cannot deposit 0");
        bool success = stakingToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");
        rewardPool += amount;
        emit RewardsDeposited(amount);
    }

    /**
     * @notice Owner sets the fixed APY rate.
     * @param _apyBasisPoints  APY in basis points (e.g. 1200 = 12%)
     */
    function setAPY(uint256 _apyBasisPoints) external onlyOwner updateReward(address(0)) {
        apyBasisPoints = _apyBasisPoints;
        emit APYUpdated(_apyBasisPoints);
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
     * @notice Emergency: withdraw excess reward tokens from pool.
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner updateReward(address(0)) {
        require(amount <= rewardPool, "Exceeds reward pool");
        rewardPool -= amount;
        bool success = stakingToken.transfer(owner, amount);
        require(success, "Transfer failed");
    }

    /**
     * @notice Sync rewardPool with actual contract balance.
     *         Use this if tokens were sent directly via transfer()
     *         instead of depositRewards().
     */
    function syncRewardPool() external onlyOwner updateReward(address(0)) {
        uint256 contractBalance = stakingToken.balanceOf(address(this));
        uint256 accounted = totalStaked + rewardPool;
        if (contractBalance > accounted) {
            uint256 unaccounted = contractBalance - accounted;
            rewardPool += unaccounted;
            emit RewardsDeposited(unaccounted);
        }
    }

    /**
     * @notice View how many reward tokens are available in the contract
     *         (excluding staked tokens). Uses the tracked rewardPool.
     */
    function rewardBalance() external view returns (uint256) {
        uint256 contractBalance = stakingToken.balanceOf(address(this));
        return contractBalance > totalStaked ? contractBalance - totalStaked : 0;
    }
}
