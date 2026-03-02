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

// Dummy tokens untuk tampilan (Sepolia testnet)
export const swapTokenList = [
    {
        chainId: 11155111,
        address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
        name: 'Tether USD',
        symbol: 'USDT',
        decimals: 6,
        logoURI: 'https://cryptologos.cc/logos/tether-usdt-logo.svg?v=040',
    },
    {
        chainId: 11155111,
        address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=040',
    },
    {
        chainId: 11155111,
        address: '0x68194a729C2450ad26072b3D33ADaCbcef39D574',
        name: 'Dai Stablecoin',
        symbol: 'DAI',
        decimals: 18,
        logoURI: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.svg?v=040',
    },
    {
        chainId: 11155111,
        address: '0x29f2D40B0605204364af54EC677bD022dA425d03',
        name: 'Wrapped Bitcoin',
        symbol: 'WBTC',
        decimals: 8,
        logoURI: 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.svg?v=040',
    },
    {
        chainId: 11155111,
        address: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        name: 'Chainlink',
        symbol: 'LINK',
        decimals: 18,
        logoURI: 'https://cryptologos.cc/logos/chainlink-link-logo.svg?v=040',
    },
    {
        chainId: 11155111,
        address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
        name: 'Uniswap',
        symbol: 'UNI',
        decimals: 18,
        logoURI: 'https://cryptologos.cc/logos/uniswap-uni-logo.svg?v=040',
    },
    {
        chainId: 11155111,
        address: '0x88541670E55cC13bF6dCb5B22c54D12b9Ae8E20e',
        name: 'Aave',
        symbol: 'AAVE',
        decimals: 18,
        logoURI: 'https://cryptologos.cc/logos/aave-aave-logo.svg?v=040',
    },
    {
        chainId: 11155111,
        address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
        name: 'Pepe',
        symbol: 'PEPE',
        decimals: 18,
        logoURI: 'https://cryptologos.cc/logos/pepe-pepe-logo.svg?v=040',
    },
]
