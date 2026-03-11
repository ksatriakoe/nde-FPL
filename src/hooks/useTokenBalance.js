import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWeb3 } from './useWeb3'
import { WETH_ADDRESS, erc20Abi } from '../services/swapConstants'
import { formatBalance } from '../services/formatBalance'

export function useTokenBalance(tokenAddress) {
    const { userAddress, readProvider, balanceRefreshTrigger } = useWeb3()
    const [balance, setBalance] = useState('0.0')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        let isMounted = true
        let retryCount = 0

        const fetchBalance = async () => {
            if (!tokenAddress || !userAddress || !readProvider) {
                if (isMounted) { setBalance('0.0'); setLoading(false) }
                return
            }

            setLoading(true)
            try {
                const checksumAddress = ethers.getAddress(tokenAddress)

                if (checksumAddress.toLowerCase() === WETH_ADDRESS.toLowerCase()) {
                    // ETH balance via public RPC — fast & reliable
                    const bal = await readProvider.getBalance(userAddress)
                    if (isMounted) { setBalance(ethers.formatEther(bal)); setLoading(false) }
                } else {
                    // Token balance via public RPC
                    const tokenContract = new ethers.Contract(checksumAddress, erc20Abi, readProvider)
                    const [decimals, bal] = await Promise.all([
                        tokenContract.decimals(),
                        tokenContract.balanceOf(userAddress),
                    ])
                    if (isMounted) { setBalance(ethers.formatUnits(bal, decimals)); setLoading(false) }
                }
            } catch {
                if (retryCount < 2 && isMounted) {
                    retryCount++
                    setTimeout(() => { if (isMounted) fetchBalance() }, retryCount * 1500)
                } else if (isMounted) {
                    setBalance('0.0'); setLoading(false)
                }
            }
        }
        fetchBalance()
        return () => { isMounted = false }
    }, [userAddress, tokenAddress, readProvider, balanceRefreshTrigger])

    return { balance, formattedBalance: formatBalance(balance), loading }
}


