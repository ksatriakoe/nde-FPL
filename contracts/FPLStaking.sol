// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title FPLStaking V2
 * @notice Stake TEST tokens to earn TEST rewards with dynamic APR.
 *         - No lock period: stake/unstake anytime
 *         - APR = (rewardPool / totalStaked) × 100%
 *         - APR auto-adjusts when owner deposits rewards or when stakers join/leave
 *         - Owner deposits reward tokens into the contract
 *         - Rewards are distributed proportionally from the available pool over 1 year
 *
 *         Uses Synthetix RewardPerToken accumulator pattern
 *         with pool-derived rewardRate.
 */
contract FPLStaking {
    IERC20 public stakingToken;
    address public owner;

    // --- Reward state ---
    uint256 public rewardPerTokenStored;
    uint256 public lastUpdateTime;

    // --- Staking state ---
    uint256 public totalStaked;
    uint256 public minStake;

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
            uint256 rewardDistributed = (block.timestamp - lastUpdateTime) * _currentRewardRate();
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
     * @param _stakingToken  Address of the TEST ERC-20 token
     * @param _minStake      Minimum stake amount (in wei)
     */
    constructor(address _stakingToken, uint256 _minStake) {
        owner = msg.sender;
        stakingToken = IERC20(_stakingToken);
        minStake = _minStake;
        lastUpdateTime = block.timestamp;
    }

    // =====================================================================
    // INTERNAL
    // =====================================================================

    /**
     * @dev Derives rewardRate (wei/sec) from rewardPool and totalStaked.
     *      Distributes the entire rewardPool over 1 year proportionally.
     *      rewardRate = rewardPool / 365 days
     */
    function _currentRewardRate() internal view returns (uint256) {
        if (totalStaked == 0 || rewardPool == 0) return 0;
        return rewardPool / 365 days;
    }

    // =====================================================================
    // VIEW FUNCTIONS
    // =====================================================================

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }
        uint256 rate = _currentRewardRate();
        uint256 elapsed = block.timestamp - lastUpdateTime;
        uint256 rewardAccrued = elapsed * rate;
        
        // Cap reward accrued at remaining pool
        if (rewardAccrued > rewardPool) {
            rewardAccrued = rewardPool;
        }
        
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
     * @notice Returns the current APR in basis points.
     *         APR = (rewardPool / totalStaked) * 10000
     *         e.g. 5000 = 50% APR
     */
    function getAPR() public view returns (uint256) {
        if (totalStaked == 0) return 0;
        return (rewardPool * 10000) / totalStaked;
    }

    function getStakeInfo(address account) external view returns (
        uint256 _totalStaked,
        uint256 _userStaked,
        uint256 _userRewards,
        uint256 _rewardPool,
        uint256 _minStake,
        uint256 _apr
    ) {
        _totalStaked = totalStaked;
        _userStaked = stakedBalance[account];
        _userRewards = earned(account);
        _rewardPool = rewardPool;
        _minStake = minStake;
        _apr = getAPR();
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
     *         Depositing more tokens increases APR automatically.
     */
    function depositRewards(uint256 amount) external onlyOwner updateReward(address(0)) {
        require(amount > 0, "Cannot deposit 0");
        bool success = stakingToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");
        rewardPool += amount;
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
