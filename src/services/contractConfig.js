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

// TEST token on Base
export const TOKEN_ADDRESS = '0x48e72A7FEAeA5e7B6DADbc7D82ac706F93CEf96C'

// Replace with your deployed contract address after deploying
export const FPL_SUBSCRIPTION_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x6fB4931995931b5E4bf821088fe4C3e6bf092054'
