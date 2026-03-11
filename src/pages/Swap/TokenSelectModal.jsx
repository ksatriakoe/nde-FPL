import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ethers } from 'ethers'
import { useWeb3 } from '../../hooks/useWeb3'
import { swapTokenList, defaultSwapToken, erc20Abi, WETH_ADDRESS } from '../../services/swapConstants'
import { formatBalance } from '../../services/formatBalance'
import s from './Swap.module.css'

export default function TokenSelectModal({ onClose, onSelect, excludeToken }) {
    const { userAddress, readProvider } = useWeb3()
    const [search, setSearch] = useState('')
    const [tokens, setTokens] = useState([])
    const [importToken, setImportToken] = useState(null)
    const [importLoading, setImportLoading] = useState(false)

    useEffect(() => { loadTokens() }, [])

    // Auto-detect contract address in search and fetch token info
    useEffect(() => {
        let cancelled = false
        const query = search.trim()
        if (query.startsWith('0x') && query.length === 42) {
            const exists = tokens.find(t => t.address.toLowerCase() === query.toLowerCase())
            if (exists) {
                setImportToken(null)
                return
            }
            setImportLoading(true)
            setImportToken(null)
                ; (async () => {
                    try {
                        // Use readProvider for token lookup (no wallet dependency)
                        const rpcProvider = readProvider || new ethers.BrowserProvider(window.ethereum)
                        const addr = ethers.getAddress(query)
                        const contract = new ethers.Contract(addr, erc20Abi, rpcProvider)
                        const [name, symbol, decimals] = await Promise.all([contract.name(), contract.symbol(), contract.decimals()])
                        let balance = 0
                        if (userAddress) {
                            try {
                                const bal = await contract.balanceOf(userAddress)
                                balance = parseFloat(ethers.formatUnits(bal, decimals))
                            } catch { /* ignore */ }
                        }
                        if (!cancelled) {
                            setImportToken({ address: addr, name, symbol, decimals: Number(decimals), logoURI: '', balance })
                            setImportLoading(false)
                        }
                    } catch {
                        if (!cancelled) { setImportToken(null); setImportLoading(false) }
                    }
                })()
        } else {
            setImportToken(null)
            setImportLoading(false)
        }
        return () => { cancelled = true }
    }, [search, tokens])

    const loadTokens = async () => {
        let all = [defaultSwapToken, ...swapTokenList]
        const saved = JSON.parse(localStorage.getItem('customTokens') || '[]')
        all = [...all, ...saved]
        if (excludeToken) all = all.filter(t => t.address.toLowerCase() !== excludeToken.address.toLowerCase())

        if (userAddress && readProvider) {
            try {
                const withBal = await Promise.all(all.map(async (t) => {
                    try {
                        let bal = '0'
                        if (t.address.toLowerCase() === WETH_ADDRESS.toLowerCase()) {
                            const b = await readProvider.getBalance(userAddress)
                            bal = ethers.formatEther(b)
                        } else {
                            const c = new ethers.Contract(t.address, erc20Abi, readProvider)
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

    const handleImportAndSelect = (token) => {
        const saved = JSON.parse(localStorage.getItem('customTokens') || '[]')
        if (!saved.find(t => t.address.toLowerCase() === token.address.toLowerCase())) {
            saved.push({ address: token.address, name: token.name, symbol: token.symbol, decimals: token.decimals, logoURI: '' })
            localStorage.setItem('customTokens', JSON.stringify(saved))
        }
        onSelect(token)
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
                        <input className={s.tokenSearch} placeholder="Search name or paste contract address" value={search} onChange={e => setSearch(e.target.value)} />
                        <div className={s.tokenList}>
                            {importLoading && (
                                <div style={{ color: '#9ca3af', textAlign: 'center', padding: '1rem 0', fontSize: '0.85rem' }}>Looking up token...</div>
                            )}
                            {importToken && (
                                <div className={s.tokenListItem} onClick={() => handleImportAndSelect(importToken)}>
                                    <div className={s.tokenListLeft}>
                                        <TokenIcon token={importToken} />
                                        <div>
                                            <div className={s.tokenListName}>{importToken.symbol}</div>
                                            <div className={s.tokenListAddr}>{importToken.name}</div>
                                        </div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); handleImportAndSelect(importToken) }} style={{ background: '#1D4ED8', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.4rem 1rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}>Import</button>
                                </div>
                            )}
                            {filtered.length === 0 && !importToken && !importLoading ? (
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
