// =============================================================
// Custom UniswapV2 — Deployed on Base Mainnet
// Replace these with your deployed contract addresses
// =============================================================
export const customAddresses = {
    factory: '0xf42548Ba89dc2314408f44b16506F88769abDED5',
    router: '0x313049192Cb0d4027A0De419a1dD169F9eFB48c7',
}

// =============================================================
// Uniswap V2 Official — Base Mainnet
// =============================================================
export const uniswapAddresses = {
    factory: '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6',
    router: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24',
}

// =============================================================
// Shared
// =============================================================
export const WETH_ADDRESS = '0x4200000000000000000000000000000000000006' // Base WETH

// =============================================================
// Aggregator & ListingManager — Deployed on Base Mainnet
// Replace these with your deployed contract addresses
// =============================================================
export const aggregatorAddress = '0xBd5447Ff67852627c841bC695b99626BB60AcC8a'
export const listingManagerAddress = '0x3EF993BEe30c99A840c4b61fc1c9d08FCEdA3857'

// =============================================================
// ABIs
// =============================================================

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
    'function allPairsLength() external view returns (uint)',
    'function allPairs(uint) external view returns (address pair)',
    'function setListingManager(address _listingManager) external',
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

export const aggregatorAbi = [
    'function crossSwap(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, uint8 routerInFirst) external',
    'function getAmountsOutCross(address tokenIn, address tokenOut, uint256 amountIn, uint8 routerInFirst) external view returns (uint256)',
    'function findCrossRoute(address tokenIn, address tokenOut) external view returns (uint8)',
]

export const listingManagerAbi = [
    'function listToken(address token, address pairedWith) external returns (address pair)',
    'function listTokenFree(address token, address pairedWith) external returns (address pair)',
    'function listingFee() external view returns (uint256)',
    'function pairExists(address tokenA, address tokenB) external view returns (bool)',
    'function setListingFee(uint256 _fee) external',
    'function withdrawFees(address to) external',
]

// =============================================================
// Default token (native ETH on Base, represented as WETH)
// =============================================================
export const defaultSwapToken = {
    address: WETH_ADDRESS,
    symbol: 'ETH',
    name: 'Ethereum',
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
    decimals: 18,
}

// =============================================================
// Token list — Base Mainnet
// Replace TEST address after deploying on Base
// =============================================================
export const swapTokenList = [
    {
        address: '0x48e72A7FEAeA5e7B6DADbc7D82ac706F93CEf96C',
        name: 'TEST',
        symbol: 'TEST',
        decimals: 18,
        logoURI: '/NdeFPL.png',
    },
    {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
    },
    {
        address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
        name: 'Dai Stablecoin',
        symbol: 'DAI',
        decimals: 18,
        logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png',
    },
    {
        address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
        name: 'Tether USD',
        symbol: 'USDT',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
    },
]

// =============================================================
// Legacy compatibility alias
// =============================================================
export const swapAddresses = {
    factory: customAddresses.factory,
    weth: WETH_ADDRESS,
    router: customAddresses.router,
}

// =============================================================
// Staking Contract — Base Mainnet
// Replace with your deployed staking contract on Base
// =============================================================
export const stakingAddress = '0xe2C52d3Bfb69a0Bff9bA6a1a1C28e24BE23AAE16'

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
    // Owner functions (admin dashboard)
    'function setAPY(uint256 _apyBasisPoints) external',
    'function setMinStake(uint256 _minStake) external',
    'function depositRewards(uint256 amount) external',
]
