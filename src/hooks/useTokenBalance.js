import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWeb3 } from './useWeb3'
import { swapAddresses, erc20Abi } from '../services/swapConstants'
import { formatBalance } from '../services/formatBalance'

export function useTokenBalance(tokenAddress) {
    const { userAddress, balanceRefreshTrigger } = useWeb3()
    const [balance, setBalance] = useState('0.0')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        let isMounted = true
        let retryCount = 0

        const fetchBalance = async () => {
            if (!tokenAddress || !userAddress || !window.ethereum) {
                if (isMounted) { setBalance('0.0'); setLoading(false) }
                return
            }
            setLoading(true)
            try {
                const web3Provider = new ethers.BrowserProvider(window.ethereum)
                const checksumAddress = ethers.getAddress(tokenAddress)

                if (checksumAddress.toLowerCase() === swapAddresses.weth.toLowerCase()) {
                    const balanceHex = await window.ethereum.request({
                        method: 'eth_getBalance',
                        params: [userAddress, 'latest'],
                    })
                    if (isMounted) { setBalance(ethers.formatEther(BigInt(balanceHex))); setLoading(false) }
                } else {
                    const tokenContract = new ethers.Contract(checksumAddress, erc20Abi, web3Provider)
                    const [decimals, bal] = await Promise.all([
                        tokenContract.decimals(),
                        tokenContract.balanceOf(userAddress),
                    ])
                    if (isMounted) { setBalance(ethers.formatUnits(bal, decimals)); setLoading(false) }
                }
            } catch {
                if (retryCount < 3 && isMounted) {
                    retryCount++
                    setTimeout(() => { if (isMounted) fetchBalance() }, retryCount * 1000)
                } else if (isMounted) {
                    setBalance('0.0'); setLoading(false)
                }
            }
        }
        fetchBalance()
        return () => { isMounted = false }
    }, [userAddress, tokenAddress, balanceRefreshTrigger])

    return { balance, formattedBalance: formatBalance(balance), loading }
}
