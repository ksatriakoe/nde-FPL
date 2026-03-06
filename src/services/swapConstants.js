// =============================================================
// UniswapV2 — Deployed Contract Addresses
// =============================================================
export const swapAddresses = {
    factory: '0x1EEd1a72fB7EFb4D695dd004B9BE017D6465E44F',
    weth: '0x129c44a4b21B8Da08D33C457769707250B43eb6D',
    router: '0xde15936D7d0C45058536bD0d5C270DAa488c3F3E',
    multicall: '0xe2C52d3Bfb69a0Bff9bA6a1a1C28e24BE23AAE16',
}

export const erc20Abi = [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function balanceOf(address account) external view returns (uint256)',
    'function decimals() external view returns (uint8)',
    'function name() external view returns (string)',
    'function symbol() external view returns (string)',
]

export const routerAbi = [
    'function factory() external pure returns (address)',
    'function WETH() external pure returns (address)',
    'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)',
    'function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)',
    'function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)',
    'function removeLiquidityETH(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external returns (uint amountToken, uint amountETH)',
    'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
    'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
]

export const factoryAbi = [
    'function getPair(address tokenA, address tokenB) external view returns (address pair)',
]

export const pairAbi = [
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
    'function balanceOf(address owner) external view returns (uint256)',
    'function totalSupply() external view returns (uint256)',
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
]

// Native token Sepolia = ETH
export const defaultSwapToken = {
    address: '0x129c44a4b21B8Da08D33C457769707250B43eb6D', // WETH9
    symbol: 'ETH',
    name: 'Ethereum',
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
    decimals: 18,
}

// Token list
export const swapTokenList = [
    {
        address: '0x91F193c3F24BaE45A0c592E7833354DE00A872C2',
        name: 'TEST',
        symbol: 'TEST',
        decimals: 18,
        logoURI: '/NdeFPL.png',
    },
]

// =============================================================
// Staking Contract
// =============================================================
export const stakingAddress = '0x994b5BE0100C706ACfa962C71D23AccD139Cc7a5' // TODO: paste new deployed address

export const stakingAbi = [
    'function stake(uint256 amount) external',
    'function unstake(uint256 amount) external',
    'function claimRewards() external',
    'function earned(address account) external view returns (uint256)',
    'function getStakeInfo(address account) external view returns (uint256 _totalStaked, uint256 _userStaked, uint256 _userRewards, uint256 _apyBasisPoints, uint256 _minStake)',
    'function stakedBalance(address) external view returns (uint256)',
    'function totalStaked() external view returns (uint256)',
    'function apyBasisPoints() external view returns (uint256)',
    'function minStake() external view returns (uint256)',
    'function rewardBalance() external view returns (uint256)',
    'function stakingToken() external view returns (address)',
]
