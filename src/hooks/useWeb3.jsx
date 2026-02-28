import { createContext, useContext, useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useAccount } from 'wagmi'
import { swapAddresses, routerAbi } from '../services/swapConstants'

const Web3Context = createContext(null)

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
    const [routerContract, setRouterContract] = useState(null)
    const [balanceRefreshTrigger, setBalanceRefreshTrigger] = useState(0)

    useEffect(() => {
        if (isConnected && address && window.ethereum) {
            const web3Provider = new ethers.BrowserProvider(window.ethereum)
            web3Provider.getSigner().then(web3Signer => {
                setProvider(web3Provider)
                setSigner(web3Signer)
                setUserAddress(address)
                const router = new ethers.Contract(swapAddresses.router, routerAbi, web3Signer)
                setRouterContract(router)
            }).catch(console.error)
        } else if (!isConnected) {
            setProvider(null)
            setSigner(null)
            setUserAddress(null)
            setRouterContract(null)
        }
    }, [isConnected, address])

    const refreshBalances = () => {
        setBalanceRefreshTrigger(prev => prev + 1)
    }

    return (
        <Web3Context.Provider value={{
            provider, signer, userAddress, routerContract,
            refreshBalances, balanceRefreshTrigger,
        }}>
            {children}
        </Web3Context.Provider>
    )
}
