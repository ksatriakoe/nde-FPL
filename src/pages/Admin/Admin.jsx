import { useState, useEffect, useCallback } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import { supabase } from '../../services/supabase'
import { stakingAddress, stakingAbi, erc20Abi } from '../../services/swapConstants'
import s from './Admin.module.css'

// ── Admin wallet (deployer) — change to your deployer address ──
const ADMIN_WALLET = '0x484E0cAA0e211309771d1Be3A59EbC5F4cD0Cb4c'.toLowerCase()

const TOKEN_ADDRESS = '0x48e72A7FEAeA5e7B6DADbc7D82ac706F93CEf96C'
const BASE_RPC = 'https://base-rpc.publicnode.com'

/* ============================================================= */
/*  Alert system                                                  */
/* ============================================================= */
function useAlerts() {
    const [alerts, setAlerts] = useState([])
    const idRef = { current: 0 }
    const show = (message, type = 'info') => {
        const id = ++idRef.current
        setAlerts(prev => [...prev, { id, message, type }])
        setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 4000)
    }
    const dismiss = id => setAlerts(prev => prev.filter(a => a.id !== id))
    return { alerts, show, dismiss }
}

/* ============================================================= */
/*  Card 1 — Manual Subscription                                 */
/* ============================================================= */
function ManualSubscriptionCard({ showAlert }) {
    const [walletInput, setWalletInput] = useState('')
    const [duration, setDuration] = useState('30')
    const [busy, setBusy] = useState(false)
    const [subscribers, setSubscribers] = useState([])
    const [loadingSubs, setLoadingSubs] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    const fetchSubscribers = useCallback(async () => {
        if (!supabase) return
        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .order('expires_at', { ascending: false })
            if (!error && data) setSubscribers(data)
        } catch { /* ignore */ }
        setLoadingSubs(false)
    }, [])

    useEffect(() => {
        fetchSubscribers()
    }, [fetchSubscribers])

    const isValidAddress = (addr) => /^0x[a-fA-F0-9]{40}$/.test(addr)

    const handleAdd = async () => {
        if (!supabase) { showAlert('Supabase not configured', 'error'); return }
        if (!isValidAddress(walletInput)) { showAlert('Invalid wallet address', 'error'); return }

        setBusy(true)
        try {
            const now = new Date()
            // Check if existing subscription still active, stack on top
            const existing = subscribers.find(
                sub => sub.wallet_address === walletInput.toLowerCase() &&
                    new Date(sub.expires_at) > now
            )
            const base = existing ? new Date(existing.expires_at) : now
            base.setDate(base.getDate() + parseInt(duration))

            const { error } = await supabase.from('subscriptions').upsert({
                wallet_address: walletInput.toLowerCase(),
                tx_hash: 'manual_admin',
                plan: 'premium_monthly',
                expires_at: base.toISOString(),
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
            }, { onConflict: 'wallet_address' })

            if (error) {
                showAlert('Failed: ' + error.message, 'error')
            } else {
                showAlert(`Subscription added for ${duration} days!`, 'success')
                setWalletInput('')
                fetchSubscribers()
            }
        } catch (err) {
            showAlert('Error: ' + err.message, 'error')
        }
        setBusy(false)
    }

    const handleRevoke = async (address) => {
        if (!supabase) return
        try {
            // Set expires_at to past to revoke (no DELETE policy in RLS)
            const { error } = await supabase
                .from('subscriptions')
                .update({
                    expires_at: new Date(0).toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('wallet_address', address)

            if (error) {
                showAlert('Revoke failed: ' + error.message, 'error')
            } else {
                showAlert('Subscription revoked', 'success')
                fetchSubscribers()
            }
        } catch (err) {
            showAlert('Error: ' + err.message, 'error')
        }
    }

    const activeSubscribers = subscribers.filter(sub => new Date(sub.expires_at) > new Date())
    const filteredSubscribers = searchQuery
        ? activeSubscribers.filter(sub => sub.wallet_address.toLowerCase().includes(searchQuery.toLowerCase()))
        : activeSubscribers

    return (
        <div className={s.card}>
            <div className={s.cardHeader}>
                <span className={s.cardTitle}>Manual Subscription</span>
                <img src="/calender.svg" alt="" className={s.cardIconSvg} />
            </div>

            {/* Form */}
            <div className={s.formGroup}>
                <label className={s.label}>Wallet Address</label>
                <input
                    className={s.inputMono}
                    type="text"
                    value={walletInput}
                    onChange={e => setWalletInput(e.target.value)}
                    placeholder="0x..."
                />
            </div>
            <div className={s.formGroup}>
                <label className={s.label}>Duration (Days)</label>
                <div className={s.durationRow}>
                    <div className={s.durationPresets}>
                        {['30', '60', '90'].map(d => (
                            <button
                                key={d}
                                className={`${s.presetBtn} ${duration === d ? s.presetBtnActive : ''}`}
                                onClick={() => setDuration(d)}
                            >
                                {d}d
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <button
                className={s.primaryBtn}
                onClick={handleAdd}
                disabled={busy || !walletInput || !duration || parseInt(duration) < 1}
            >
                {busy ? 'Adding...' : `Add Subscription · ${duration || '—'} Days`}
            </button>

            {/* Active Subscribers Table */}
            <div className={s.tableWrap}>
                <div className={s.tableHeader}>
                    <div className={s.tableTitle}>Active Subscribers ({activeSubscribers.length})</div>
                    {activeSubscribers.length > 0 && (
                        <input
                            className={s.searchInput}
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search address..."
                        />
                    )}
                </div>
                <div className={s.tableScroll}>
                    <table className={s.table}>
                        <thead>
                            <tr>
                                <th>Address</th>
                                <th>Expires</th>
                                <th>Type</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingSubs ? (
                                <tr><td colSpan="4" className={s.emptyRow}>Loading...</td></tr>
                            ) : filteredSubscribers.length === 0 ? (
                                <tr><td colSpan="4" className={s.emptyRow}>{searchQuery ? 'No match found' : 'No active subscribers'}</td></tr>
                            ) : (
                                filteredSubscribers.map(sub => (
                                    <tr key={sub.wallet_address}>
                                        <td className={s.addrCell}>
                                            {sub.wallet_address.slice(0, 6)}…{sub.wallet_address.slice(-4)}
                                        </td>
                                        <td>
                                            {new Date(sub.expires_at).toLocaleDateString('en-GB', {
                                                day: 'numeric', month: 'short', year: 'numeric'
                                            })}
                                        </td>
                                        <td>
                                            {sub.tx_hash === 'manual_admin'
                                                ? <span className={s.manualBadge}>Manual</span>
                                                : <span className={s.cryptoBadge}>Crypto</span>
                                            }
                                        </td>
                                        <td>
                                            <button
                                                className={s.dangerBtn}
                                                onClick={() => handleRevoke(sub.wallet_address)}
                                            >
                                                Revoke
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

/* ============================================================= */
/*  Card 2 — Set APY Staking (on-chain)                          */
/* ============================================================= */
function StakingControlCard({ showAlert }) {
    const [stakingData, setStakingData] = useState({
        totalStaked: '0', rewardBalance: '0',
        apyBasisPoints: 0, minStake: '0',
    })
    const [loading, setLoading] = useState(true)
    const [newApy, setNewApy] = useState('')
    const [newMinStake, setNewMinStake] = useState('')
    const [busyApy, setBusyApy] = useState(false)
    const [busyMin, setBusyMin] = useState(false)

    const fetchStakingData = useCallback(async () => {
        if (!stakingAddress) { setLoading(false); return }
        try {
            const rpcProvider = new ethers.JsonRpcProvider(BASE_RPC, {
                chainId: 8453, name: 'base',
            }, { staticNetwork: true })
            const contract = new ethers.Contract(stakingAddress, stakingAbi, rpcProvider)
            const [totalStaked, apyBP, minStake, rewardBal] = await Promise.all([
                contract.totalStaked(),
                contract.apyBasisPoints(),
                contract.minStake(),
                contract.rewardBalance(),
            ])
            setStakingData({
                totalStaked: ethers.formatEther(totalStaked),
                apyBasisPoints: Number(apyBP),
                minStake: ethers.formatEther(minStake),
                rewardBalance: ethers.formatEther(rewardBal),
            })
        } catch (err) {
            console.error('Staking read error:', err)
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        fetchStakingData()
    }, [fetchStakingData])

    const getSigner = async () => {
        if (!window.ethereum) throw new Error('No wallet detected')
        const provider = new ethers.BrowserProvider(window.ethereum)
        return provider.getSigner()
    }

    const handleSetApy = async () => {
        if (!newApy || parseFloat(newApy) < 0) return
        setBusyApy(true)
        try {
            const signer = await getSigner()
            const contract = new ethers.Contract(stakingAddress, stakingAbi, signer)
            const basisPoints = Math.round(parseFloat(newApy) * 100)
            showAlert(`Setting APY to ${newApy}%...`, 'info')
            const tx = await contract.setAPY(basisPoints)
            await tx.wait()
            showAlert(`APY updated to ${newApy}%!`, 'success')
            setNewApy('')
            fetchStakingData()
        } catch (err) {
            const msg = err?.reason || err?.message || 'Transaction failed'
            showAlert(msg.length > 80 ? msg.slice(0, 80) + '…' : msg, 'error')
        }
        setBusyApy(false)
    }

    const handleSetMinStake = async () => {
        if (!newMinStake || parseFloat(newMinStake) < 0) return
        setBusyMin(true)
        try {
            const signer = await getSigner()
            const contract = new ethers.Contract(stakingAddress, stakingAbi, signer)
            const weiAmount = ethers.parseEther(newMinStake)
            showAlert(`Setting min stake to ${newMinStake} TEST...`, 'info')
            const tx = await contract.setMinStake(weiAmount)
            await tx.wait()
            showAlert(`Min stake updated to ${newMinStake} TEST!`, 'success')
            setNewMinStake('')
            fetchStakingData()
        } catch (err) {
            const msg = err?.reason || err?.message || 'Transaction failed'
            showAlert(msg.length > 80 ? msg.slice(0, 80) + '…' : msg, 'error')
        }
        setBusyMin(false)
    }

    const apy = stakingData.apyBasisPoints / 100
    const fmt = (v) => {
        const n = parseFloat(v)
        if (isNaN(n)) return '0'
        return n % 1 === 0 ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 4 })
    }

    return (
        <div className={s.card}>
            <div className={s.cardHeader}>
                <span className={s.cardTitle}>Staking Control</span>
                <img src="/gear-swap.svg" alt="" className={s.cardIconSvg} />
            </div>

            {/* Current Stats */}
            <div className={s.statsGrid}>
                <div className={s.statItem}>
                    <div className={s.statLabel}>Current APY</div>
                    <div className={s.statValueAccent}>{loading ? '...' : `${fmt(apy.toString())}%`}</div>
                </div>
                <div className={s.statItem}>
                    <div className={s.statLabel}>Total Staked</div>
                    <div className={s.statValue}>{loading ? '...' : fmt(stakingData.totalStaked)}<span className={s.statUnit}>TEST</span></div>
                </div>
                <div className={s.statItem}>
                    <div className={s.statLabel}>Min Stake</div>
                    <div className={s.statValue}>{loading ? '...' : fmt(stakingData.minStake)}<span className={s.statUnit}>TEST</span></div>
                </div>
            </div>

            <hr className={s.divider} />

            {/* Set APY */}
            <div className={s.formGroup}>
                <label className={s.label}>Set New APY</label>
                <div className={s.formRow}>
                    <div className={s.inputWithUnit}>
                        <input
                            className={s.input}
                            type="number"
                            step="0.1"
                            min="0"
                            value={newApy}
                            onChange={e => setNewApy(e.target.value)}
                            placeholder={`${apy}`}
                        />
                        <span className={s.inputUnit}>%</span>
                    </div>
                    <button
                        className={s.primaryBtn}
                        onClick={handleSetApy}
                        disabled={busyApy || !newApy}
                        style={{ maxWidth: '140px' }}
                    >
                        {busyApy ? 'Sending...' : 'Update APY'}
                    </button>
                </div>
                <div className={s.inputHint}>Enter percentage directly, e.g. 50 = 50% APY (auto-converts to {newApy ? Math.round(parseFloat(newApy) * 100) : '—'} basis points)</div>
            </div>

            {/* Set Min Stake */}
            <div className={s.formGroup}>
                <label className={s.label}>Set Min Stake</label>
                <div className={s.formRow}>
                    <div className={s.inputWithUnit}>
                        <input
                            className={s.input}
                            type="number"
                            step="1"
                            min="0"
                            value={newMinStake}
                            onChange={e => setNewMinStake(e.target.value)}
                            placeholder={`${fmt(stakingData.minStake)}`}
                        />
                        <span className={s.inputUnit}>TEST</span>
                    </div>
                    <button
                        className={s.primaryBtn}
                        onClick={handleSetMinStake}
                        disabled={busyMin || !newMinStake}
                        style={{ maxWidth: '140px' }}
                    >
                        {busyMin ? 'Sending...' : 'Update'}
                    </button>
                </div>
                <div className={s.inputHint}>Enter token amount directly, e.g. 100 = 100 TEST (auto-converts to wei)</div>
            </div>

        </div>
    )
}

/* ============================================================= */
/*  Main Admin Page                                               */
/* ============================================================= */
export default function Admin() {
    const { address, isConnected } = useAccount()
    const { alerts, show: showAlert, dismiss } = useAlerts()

    const isAdmin = isConnected && address?.toLowerCase() === ADMIN_WALLET

    return (
        <div className={s.page}>
            {/* Alerts */}
            {alerts.length > 0 && (
                <div className={s.alertContainer}>
                    {alerts.map(a => (
                        <div key={a.id} className={`${s.alert} ${a.type === 'success' ? s.alertSuccess : a.type === 'error' ? s.alertError : s.alertInfo}`}>
                            <span>{a.message}</span>
                            <button className={s.alertClose} onClick={() => dismiss(a.id)}>×</button>
                        </div>
                    ))}
                </div>
            )}

            {/* Not connected */}
            {!isConnected && (
                <div className={s.gateWrap}>
                    <img src="/lock.svg" alt="" className={s.gateIcon} />
                    <h2 className={s.gateTitle}>Connect Wallet</h2>
                    <p className={s.gateMsg}>Connect your admin wallet to access the dashboard</p>
                    <ConnectButton />
                </div>
            )}

            {/* Connected but not admin */}
            {isConnected && !isAdmin && (
                <div className={s.gateWrap}>
                    <img src="/lock.svg" alt="" className={s.gateIcon} />
                    <h2 className={s.gateTitle}>Access Denied</h2>
                    <p className={s.gateMsg}>This wallet is not authorized to access the admin dashboard</p>
                </div>
            )}

            {/* Admin authenticated */}
            {isAdmin && (
                <>
                    <div className={s.pageHeader}>
                        <h1 className={s.pageTitle}>Admin Dashboard</h1>
                        <span className={s.pageBadge}>OWNER</span>
                    </div>

                    <ManualSubscriptionCard showAlert={showAlert} />
                    <StakingControlCard showAlert={showAlert} />
                </>
            )}
        </div>
    )
}
