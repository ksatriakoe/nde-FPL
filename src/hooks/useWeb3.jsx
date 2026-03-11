import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { ethers } from 'ethers'
import { useAccount } from 'wagmi'
import {
    customAddresses, uniswapAddresses, WETH_ADDRESS,
    routerAbi, factoryAbi, pairAbi, aggregatorAbi, listingManagerAbi,
    aggregatorAddress, listingManagerAddress,
} from '../services/swapConstants'

const Web3Context = createContext(null)

// ── Public RPC for read-only calls (same approach as Uniswap) ──
// Wallet provider is ONLY used for signing transactions.
// All reads (balances, reserves, token info) go through this fast public RPC.
const BASE_RPC = 'https://base-rpc.publicnode.com'

export function useWeb3() {
    const ctx = useContext(Web3Context)
    if (!ctx) throw new Error('useWeb3 must be inside Web3Provider')
    return ctx
}

export function Web3Provider({ children }) {
    const { address, isConnected } = useAccount()

    const [provider, setProvider] = useState(null)
    const [signer, setSigner] = useState(null)
    const [userAddress, setUserAddress] = useState(null)
    const [balanceRefreshTrigger, setBalanceRefreshTrigger] = useState(0)

    // Public RPC read provider — created once, never depends on wallet
    const readProvider = useMemo(() => new ethers.JsonRpcProvider(BASE_RPC, {
        chainId: 8453, name: 'base',
    }, { staticNetwork: true }), [])

    // Dual router contracts (signer-connected — for transactions)
    const [customRouter, setCustomRouter] = useState(null)
    const [uniswapRouter, setUniswapRouter] = useState(null)
    const [customFactory, setCustomFactory] = useState(null)
    const [uniswapFactory, setUniswapFactory] = useState(null)
    const [aggregatorContract, setAggregatorContract] = useState(null)
    const [listingManagerContract, setListingManagerContract] = useState(null)

    // Read-only contracts (public RPC — for quotes, getAmountsOut, etc.)
    const readCustomRouter = useMemo(() => new ethers.Contract(customAddresses.router, routerAbi, readProvider), [readProvider])
    const readUniswapRouter = useMemo(() => new ethers.Contract(uniswapAddresses.router, routerAbi, readProvider), [readProvider])
    const readAggregator = useMemo(() => aggregatorAddress !== ethers.ZeroAddress
        ? new ethers.Contract(aggregatorAddress, aggregatorAbi, readProvider) : null, [readProvider])

    // Legacy compat
    const [routerContract, setRouterContract] = useState(null)

    useEffect(() => {
        if (isConnected && address && window.ethereum) {
            const web3Provider = new ethers.BrowserProvider(window.ethereum)
            web3Provider.getSigner().then(web3Signer => {
                setProvider(web3Provider)
                setSigner(web3Signer)
                setUserAddress(address)

                // Custom router & factory (factory uses readProvider for fast reads)
                const cRouter = new ethers.Contract(customAddresses.router, routerAbi, web3Signer)
                setCustomRouter(cRouter)
                setRouterContract(cRouter) // legacy compat
                setCustomFactory(new ethers.Contract(customAddresses.factory, factoryAbi, readProvider))

                // Uniswap official router & factory
                setUniswapRouter(new ethers.Contract(uniswapAddresses.router, routerAbi, web3Signer))
                setUniswapFactory(new ethers.Contract(uniswapAddresses.factory, factoryAbi, readProvider))

                // Aggregator
                if (aggregatorAddress !== ethers.ZeroAddress) {
                    setAggregatorContract(new ethers.Contract(aggregatorAddress, aggregatorAbi, web3Signer))
                }

                // ListingManager
                if (listingManagerAddress !== ethers.ZeroAddress) {
                    setListingManagerContract(new ethers.Contract(listingManagerAddress, listingManagerAbi, web3Signer))
                }
            }).catch(console.error)
        } else if (!isConnected) {
            setProvider(null)
            setSigner(null)
            setUserAddress(null)
            setCustomRouter(null)
            setUniswapRouter(null)
            setCustomFactory(null)
            setUniswapFactory(null)
            setAggregatorContract(null)
            setListingManagerContract(null)
            setRouterContract(null)
        }
    }, [isConnected, address])

    const refreshBalances = () => {
        setBalanceRefreshTrigger(prev => prev + 1)
    }

    /**
     * Find the right router for a given token pair.
     * Skips pairs with negligible liquidity (e.g. after all LP removed).
     * Uses totalSupply check instead of reserves — works for all token decimals.
     * Returns: { router, factory, source: 'custom'|'uniswap' } or null
     */
    const MIN_LP_SUPPLY = 10n ** 9n // Skip pools with LP totalSupply below this

    const findRouter = async (tokenA, tokenB) => {
        if (!customFactory || !uniswapFactory) return null
        try {
            // Check custom factory first
            const customPair = await customFactory.getPair(tokenA, tokenB)
            if (customPair !== ethers.ZeroAddress) {
                const pc = new ethers.Contract(customPair, pairAbi, readProvider)
                const totalSupply = await pc.totalSupply()
                if (totalSupply > MIN_LP_SUPPLY) {
                    return { router: customRouter, readRouter: readCustomRouter, factory: customFactory, source: 'custom' }
                }
            }
            // Check Uniswap factory
            const uniPair = await uniswapFactory.getPair(tokenA, tokenB)
            if (uniPair !== ethers.ZeroAddress) {
                const pc = new ethers.Contract(uniPair, pairAbi, readProvider)
                const totalSupply = await pc.totalSupply()
                if (totalSupply > MIN_LP_SUPPLY) {
                    return { router: uniswapRouter, readRouter: readUniswapRouter, factory: uniswapFactory, source: 'uniswap' }
                }
            }
        } catch { /* ignore */ }
        return null
    }

    /**
     * Check if a cross-swap route is available via the Aggregator.
     * Returns: { routerInFirst: 0|1, source: 'aggregator' } or null
     */
    const findCrossRoute = async (tokenIn, tokenOut) => {
        if (!readAggregator) return null
        try {
            const route = await readAggregator.findCrossRoute(tokenIn, tokenOut)
            if (route < 2) return { routerInFirst: route, source: 'aggregator' }
        } catch { /* ignore */ }
        return null
    }

    return (
        <Web3Context.Provider value={{
            provider, readProvider, signer, userAddress,
            customRouter, uniswapRouter, routerContract,
            readCustomRouter, readUniswapRouter, readAggregator,
            customFactory, uniswapFactory,
            aggregatorContract, listingManagerContract,
            refreshBalances, balanceRefreshTrigger,
            findRouter, findCrossRoute,
        }}>
            {children}
        </Web3Context.Provider>
    )
}
