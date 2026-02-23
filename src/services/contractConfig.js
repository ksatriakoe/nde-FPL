// ABI for FPLSubscription.sol (payment-only version)
export const FPL_SUBSCRIPTION_ABI = [
    {
        name: 'pay',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        name: 'price',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'Paid',
        type: 'event',
        inputs: [
            { name: 'subscriber', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
        ],
    },
]

// ERC-20 token ABI (approve + allowance + balanceOf + decimals + symbol)
export const ERC20_ABI = [
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'decimals',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint8' }],
    },
    {
        name: 'symbol',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'string' }],
    },
]

// TEST token on Sepolia
export const TOKEN_ADDRESS = '0x91F193c3F24BaE45A0c592E7833354DE00A872C2'

// Replace with your deployed contract address after deploying
export const FPL_SUBSCRIPTION_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000'
