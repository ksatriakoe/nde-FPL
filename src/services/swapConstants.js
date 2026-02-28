// =============================================================
// ⚠️ SEPOLIA TESTNET — Isi address setelah deploy kontrak sendiri
// =============================================================
export const swapAddresses = {
    factory: '0x0000000000000000000000000000000000000000', // TODO: deploy & isi Factory address di Sepolia
    weth: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',   // Sepolia WETH (official)
    router: '0x0000000000000000000000000000000000000000',  // TODO: deploy & isi Router address di Sepolia
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
    address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', // Sepolia WETH
    symbol: 'ETH',
    name: 'Ethereum',
    logoURI: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=040',
    decimals: 18,
}

// TODO: Tambahkan token yang sudah di-deploy di Sepolia
export const swapTokenList = [
    // Contoh:
    // {
    //     chainId: 11155111,
    //     address: '0x....',
    //     name: 'My Token',
    //     symbol: 'TKN',
    //     decimals: 18,
    //     logoURI: '',
    // },
]
