import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ethers } from 'ethers'
import { useWeb3 } from '../../hooks/useWeb3'
import { swapTokenList, defaultSwapToken, erc20Abi, swapAddresses } from '../../services/swapConstants'
import { formatBalance } from '../../services/formatBalance'
import s from './Swap.module.css'

export default function TokenSelectModal({ onClose, onSelect, excludeToken }) {
    const { userAddress, provider } = useWeb3()
    const [search, setSearch] = useState('')
    const [tokens, setTokens] = useState([])
    const [importAddr, setImportAddr] = useState('')
    const [importing, setImporting] = useState(false)

    useEffect(() => { loadTokens() }, [])

    const loadTokens = async () => {
        let all = [defaultSwapToken, ...swapTokenList]
        const saved = JSON.parse(localStorage.getItem('customTokens') || '[]')
        all = [...all, ...saved]
        if (excludeToken) all = all.filter(t => t.address.toLowerCase() !== excludeToken.address.toLowerCase())

        // Fetch balances
        if (userAddress && window.ethereum) {
            try {
                const web3Provider = new ethers.BrowserProvider(window.ethereum)
                const withBal = await Promise.all(all.map(async (t) => {
                    try {
                        let bal = '0'
                        if (t.address.toLowerCase() === swapAddresses.weth.toLowerCase()) {
                            const hex = await window.ethereum.request({ method: 'eth_getBalance', params: [userAddress, 'latest'] })
                            bal = ethers.formatEther(BigInt(hex))
                        } else {
                            const c = new ethers.Contract(t.address, erc20Abi, web3Provider)
                            const [dec, b] = await Promise.all([c.decimals(), c.balanceOf(userAddress)])
                            bal = ethers.formatUnits(b, dec)
                        }
                        return { ...t, balance: parseFloat(bal) }
                    } catch { return { ...t, balance: 0 } }
                }))
                withBal.sort((a, b) => b.balance - a.balance)
                setTokens(withBal)
            } catch { setTokens(all.map(t => ({ ...t, balance: 0 }))) }
        } else {
            setTokens(all.map(t => ({ ...t, balance: 0 })))
        }
    }

    const handleImport = async () => {
        if (!importAddr || !window.ethereum) return
        setImporting(true)
        try {
            const web3Provider = new ethers.BrowserProvider(window.ethereum)
            const addr = ethers.getAddress(importAddr)
            const contract = new ethers.Contract(addr, erc20Abi, web3Provider)
            const [name, symbol, decimals] = await Promise.all([contract.name(), contract.symbol(), contract.decimals()])
            const newToken = { address: addr, name, symbol, decimals: Number(decimals), logoURI: '', chainId: 5003 }
            const saved = JSON.parse(localStorage.getItem('customTokens') || '[]')
            if (!saved.find(t => t.address.toLowerCase() === addr.toLowerCase())) {
                saved.push(newToken)
                localStorage.setItem('customTokens', JSON.stringify(saved))
            }
            onSelect(newToken)
        } catch { /* ignore invalid */ }
        finally { setImporting(false) }
    }

    const filtered = search
        ? tokens.filter(t => t.symbol.toLowerCase().includes(search.toLowerCase()) || t.name.toLowerCase().includes(search.toLowerCase()) || t.address.toLowerCase().includes(search.toLowerCase()))
        : tokens

    const TokenIcon = ({ token }) => {
        const [err, setErr] = useState(false)
        if (err || !token?.logoURI) return <div className={s.tokenIconPlaceholder}>?</div>
        return <img src={token.logoURI} alt={token.symbol} className={s.tokenListIcon} onError={() => setErr(true)} />
    }

    return createPortal(
        <>
            <div className={s.modalBackdrop} onClick={onClose} />
            <div className={s.modalCenter}>
                <div className={s.modal}>
                    <div className={s.modalHeader}>
                        <span className={s.modalTitle}>Select Token</span>
                        <button className={s.modalClose} onClick={onClose}>&times;</button>
                    </div>
                    <div className={s.modalBody}>
                        <input className={s.tokenSearch} placeholder="Search token name" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
                        <div className={s.tokenList}>
                            {filtered.length === 0 ? (
                                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0', fontSize: '0.8rem' }}>No tokens found</div>
                            ) : filtered.map(token => (
                                <div key={token.address} className={s.tokenListItem} onClick={() => onSelect(token)}>
                                    <div className={s.tokenListLeft}>
                                        <TokenIcon token={token} />
                                        <div>
                                            <div className={s.tokenListName}>{token.symbol}</div>
                                            <div className={s.tokenListAddr}>{token.name}</div>
                                        </div>
                                    </div>
                                    <div className={s.tokenListBal}>{token.balance > 0 ? formatBalance(token.balance) : ''}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>,
        document.body
    )
}
