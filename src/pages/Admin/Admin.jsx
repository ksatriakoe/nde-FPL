import { useState, useEffect, useCallback } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import { supabase } from '../../services/supabase'
import { useTokenList } from '../../hooks/useTokenList'
import { stakingAddress, stakingAbi, erc20Abi, listingManagerAddress, listingManagerAbi } from '../../services/swapConstants'
import { FPL_SUBSCRIPTION_ABI, FPL_SUBSCRIPTION_ADDRESS, ERC20_ABI } from '../../services/contractConfig'
import s from './Admin.module.css'

// ── Admin wallet (deployer) — change to your deployer address ──
const ADMIN_WALLET = '0x47bc2f5f9b55f5bb8d4f1ed508492ba5c8b6d45e'.toLowerCase()

const TOKEN_ADDRESS = '0x37a42A15B04a573692c6b02f10fa12bd35041936'
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
/*  Card 2 — Subscription Price Control (on-chain)               */
/* ============================================================= */
function SubscriptionPriceCard({ showAlert }) {
    const [currentPrice, setCurrentPrice] = useState('0')
    const [tokenSymbol, setTokenSymbol] = useState('TOKEN')
    const [tokenDecimals, setTokenDecimals] = useState(18)
    const [contractBalance, setContractBalance] = useState('0')
    const [loading, setLoading] = useState(true)
    const [newPrice, setNewPrice] = useState('')
    const [busyPrice, setBusyPrice] = useState(false)
    const [busyWithdraw, setBusyWithdraw] = useState(false)

    const fetchContractData = useCallback(async () => {
        try {
            const rpcProvider = new ethers.JsonRpcProvider(BASE_RPC, {
                chainId: 8453, name: 'base',
            }, { staticNetwork: true })

            const subContract = new ethers.Contract(FPL_SUBSCRIPTION_ADDRESS, FPL_SUBSCRIPTION_ABI, rpcProvider)
            const [priceRaw, paymentTokenAddr] = await Promise.all([
                subContract.price(),
                subContract.paymentToken(),
            ])

            const tokenContract = new ethers.Contract(paymentTokenAddr, ERC20_ABI, rpcProvider)
            const [decimals, symbol, balance] = await Promise.all([
                tokenContract.decimals(),
                tokenContract.symbol(),
                tokenContract.balanceOf(FPL_SUBSCRIPTION_ADDRESS),
            ])

            const dec = Number(decimals)
            setTokenDecimals(dec)
            setTokenSymbol(symbol)
            setCurrentPrice(ethers.formatUnits(priceRaw, dec))
            setContractBalance(ethers.formatUnits(balance, dec))
        } catch (err) {
            console.error('Subscription read error:', err)
        }
        setLoading(false)
    }, [])

    useEffect(() => { fetchContractData() }, [fetchContractData])

    const getSigner = async () => {
        if (!window.ethereum) throw new Error('No wallet detected')
        const provider = new ethers.BrowserProvider(window.ethereum)
        return provider.getSigner()
    }

    const handleSetPrice = async () => {
        const priceNum = parseFloat(newPrice)
        if (isNaN(priceNum) || priceNum <= 0) return
        setBusyPrice(true)
        try {
            const signer = await getSigner()
            const contract = new ethers.Contract(FPL_SUBSCRIPTION_ADDRESS, FPL_SUBSCRIPTION_ABI, signer)
            const priceWei = ethers.parseUnits(newPrice, tokenDecimals)
            showAlert(`Setting price to ${newPrice} ${tokenSymbol}...`, 'info')
            const tx = await contract.setPrice(priceWei)
            await tx.wait()
            showAlert(`Price updated to ${newPrice} ${tokenSymbol}!`, 'success')
            setNewPrice('')
            fetchContractData()
        } catch (err) {
            if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
                showAlert('User rejected', 'error')
            } else {
                const msg = err?.reason || err?.shortMessage || err?.message || 'Transaction failed'
                showAlert(msg.length > 80 ? msg.slice(0, 80) + '…' : msg, 'error')
            }
        }
        setBusyPrice(false)
    }

    const handleWithdraw = async () => {
        setBusyWithdraw(true)
        try {
            const signer = await getSigner()
            const signerAddress = await signer.getAddress()
            const contract = new ethers.Contract(FPL_SUBSCRIPTION_ADDRESS, FPL_SUBSCRIPTION_ABI, signer)
            showAlert('Withdrawing subscription fees...', 'info')
            const tx = await contract.withdraw(signerAddress)
            await tx.wait()
            showAlert('Subscription fees withdrawn!', 'success')
            fetchContractData()
        } catch (err) {
            if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
                showAlert('User rejected', 'error')
            } else {
                const msg = err?.reason || err?.shortMessage || err?.message || 'Transaction failed'
                showAlert(msg.length > 80 ? msg.slice(0, 80) + '…' : msg, 'error')
            }
        }
        setBusyWithdraw(false)
    }

    const fmtBal = (v) => {
        const n = parseFloat(v)
        if (isNaN(n)) return '0'
        return n.toLocaleString(undefined, { maximumFractionDigits: 4 })
    }

    return (
        <div className={s.card}>
            <div className={s.cardHeader}>
                <span className={s.cardTitle}>Subscription Price</span>
                <img src="/calender.svg" alt="" className={s.cardIconSvg} />
            </div>

            <div className={s.statsGrid}>
                <div className={s.statItem}>
                    <div className={s.statLabel}>Current Price</div>
                    <div className={s.statValueAccent}>
                        {loading ? '...' : `${fmtBal(currentPrice)}`}
                        <span className={s.statUnit}>{tokenSymbol}</span>
                    </div>
                </div>
                <div className={s.statItem}>
                    <div className={s.statLabel}>Contract Balance</div>
                    <div className={s.statValue}>
                        {loading ? '...' : fmtBal(contractBalance)}
                        <span className={s.statUnit}>{tokenSymbol}</span>
                    </div>
                </div>
            </div>

            <hr className={s.divider} />

            <div className={s.formGroup}>
                <label className={s.label}>Set New Price</label>
                <div className={s.formRow}>
                    <div className={s.inputWithUnit}>
                        <input
                            className={s.input}
                            type="number"
                            step="0.01"
                            min="0"
                            value={newPrice}
                            onChange={e => setNewPrice(e.target.value)}
                            placeholder={currentPrice}
                        />
                        <span className={s.inputUnit}>{tokenSymbol}</span>
                    </div>
                    <button
                        className={s.primaryBtn}
                        onClick={handleSetPrice}
                        disabled={busyPrice || !newPrice || parseFloat(newPrice) <= 0}
                        style={{ maxWidth: '140px' }}
                    >
                        {busyPrice ? 'Sending...' : 'Update'}
                    </button>
                </div>
                <div className={s.inputHint}>Enter token amount, e.g. 100 = 100 {tokenSymbol} per subscription</div>
            </div>

            <hr className={s.divider} />

            <div className={s.formGroup}>
                <label className={s.label}>Withdraw Subscription Fees</label>
                <div className={s.feeWithdrawRow}>
                    <div className={s.feeBalanceInfo}>
                        <div className={s.statValueAccent} style={{ fontSize: '1.25rem' }}>
                            {loading ? '...' : fmtBal(contractBalance)}
                            <span className={s.statUnit}>{tokenSymbol}</span>
                        </div>
                        <div className={s.inputHint}>Accumulated from subscription payments</div>
                    </div>
                    <button
                        className={s.primaryBtn}
                        onClick={handleWithdraw}
                        disabled={busyWithdraw || loading || parseFloat(contractBalance) <= 0}
                        style={{ maxWidth: '160px' }}
                    >
                        {busyWithdraw ? 'Withdrawing...' : 'Withdraw'}
                    </button>
                </div>
            </div>
        </div>
    )
}

/* ============================================================= */
/*  Card 3 — Staking Control (on-chain, Fixed APY)               */
/* ============================================================= */
function StakingControlCard({ showAlert }) {
    const [stakingData, setStakingData] = useState({
        totalStaked: '0', rewardPool: '0',
        apy: 0, minStake: '0',
    })
    const [tokenDecimals, setTokenDecimals] = useState(18)
    const [tokenSymbol, setTokenSymbol] = useState('NDESO')
    const [loading, setLoading] = useState(true)
    const [newMinStake, setNewMinStake] = useState('')
    const [depositAmount, setDepositAmount] = useState('')
    const [newApy, setNewApy] = useState('')
    const [busyMin, setBusyMin] = useState(false)
    const [busyDeposit, setBusyDeposit] = useState(false)
    const [busyApy, setBusyApy] = useState(false)
    const [withdrawAmount, setWithdrawAmount] = useState('')
    const [busyEmergency, setBusyEmergency] = useState(false)

    const [busySync, setBusySync] = useState(false)

    const fetchStakingData = useCallback(async () => {
        if (!stakingAddress) { setLoading(false); return }
        try {
            const rpcProvider = new ethers.JsonRpcProvider(BASE_RPC, {
                chainId: 8453, name: 'base',
            }, { staticNetwork: true })
            const contract = new ethers.Contract(stakingAddress, stakingAbi, rpcProvider)

            // Read staking token address and its decimals/symbol dynamically
            const stakingTokenAddr = await contract.stakingToken()
            const tokenContract = new ethers.Contract(stakingTokenAddr, erc20Abi, rpcProvider)
            const [decimals, symbol] = await Promise.all([
                tokenContract.decimals(),
                tokenContract.symbol(),
            ])
            const dec = Number(decimals)
            setTokenDecimals(dec)
            setTokenSymbol(symbol)

            const [totalStaked, minStake, rewardPoolVal, apyBP] = await Promise.all([
                contract.totalStaked(),
                contract.minStake(),
                contract.rewardPool(),
                contract.getAPY(),
            ])
            setStakingData({
                totalStaked: ethers.formatUnits(totalStaked, dec),
                minStake: ethers.formatUnits(minStake, dec),
                rewardPool: ethers.formatUnits(rewardPoolVal, dec),
                apy: Number(apyBP) / 100,
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

    const handleSetAPY = async () => {
        const apyNum = parseFloat(newApy)
        if (isNaN(apyNum) || apyNum < 0) return
        setBusyApy(true)
        try {
            const signer = await getSigner()
            const contract = new ethers.Contract(stakingAddress, stakingAbi, signer)
            const basisPoints = Math.round(apyNum * 100) // e.g. 12.5% → 1250 BP
            showAlert(`Setting APY to ${apyNum}%...`, 'info')
            const tx = await contract.setAPY(basisPoints)
            await tx.wait()
            showAlert(`APY updated to ${apyNum}%!`, 'success')
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
            const weiAmount = ethers.parseUnits(newMinStake, tokenDecimals)
            showAlert(`Setting min stake to ${newMinStake} ${tokenSymbol}...`, 'info')
            const tx = await contract.setMinStake(weiAmount)
            await tx.wait()
            showAlert(`Min stake updated to ${newMinStake} ${tokenSymbol}!`, 'success')
            setNewMinStake('')
            fetchStakingData()
        } catch (err) {
            const msg = err?.reason || err?.message || 'Transaction failed'
            showAlert(msg.length > 80 ? msg.slice(0, 80) + '…' : msg, 'error')
        }
        setBusyMin(false)
    }

    const handleDepositRewards = async () => {
        if (!depositAmount || parseFloat(depositAmount) <= 0) return
        setBusyDeposit(true)
        try {
            const signer = await getSigner()
            const signerAddress = await signer.getAddress()
            const stakingContract = new ethers.Contract(stakingAddress, stakingAbi, signer)

            // Read the actual staking token from the contract
            const stakingTokenAddr = await stakingContract.stakingToken()
            const tokenContract = new ethers.Contract(stakingTokenAddr, erc20Abi, signer)
            const decimals = await tokenContract.decimals()
            const dec = Number(decimals)
            const parsedAmount = ethers.parseUnits(depositAmount, dec)

            // Check balance first
            const balance = await tokenContract.balanceOf(signerAddress)
            if (balance < parsedAmount) {
                showAlert(`Insufficient balance. You have ${ethers.formatUnits(balance, dec)} ${tokenSymbol}`, 'error')
                setBusyDeposit(false)
                return
            }

            // Check and do approval — always re-approve if not enough
            const allowance = await tokenContract.allowance(signerAddress, stakingAddress)
            if (allowance < parsedAmount) {
                showAlert('Approving tokens...', 'info')
                // Reset allowance to 0 first (some tokens require this)
                if (allowance > 0n) {
                    const resetTx = await tokenContract.approve(stakingAddress, 0)
                    await resetTx.wait(1)
                }
                const approveTx = await tokenContract.approve(stakingAddress, ethers.MaxUint256)
                await approveTx.wait(1)
                showAlert('Approval confirmed! Depositing...', 'info')
            }

            // Re-verify allowance after approval
            const newAllowance = await tokenContract.allowance(signerAddress, stakingAddress)
            if (newAllowance < parsedAmount) {
                showAlert('Approval failed — allowance still insufficient', 'error')
                setBusyDeposit(false)
                return
            }

            showAlert(`Depositing ${depositAmount} ${tokenSymbol} rewards...`, 'info')
            const tx = await stakingContract.depositRewards(parsedAmount)
            await tx.wait(1)
            showAlert(`Deposited ${depositAmount} ${tokenSymbol} into reward pool!`, 'success')
            setDepositAmount('')
            fetchStakingData()
        } catch (err) {
            if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
                showAlert('User rejected', 'error')
            } else {
                const reason = err?.reason || err?.shortMessage || ''
                const msg = reason || err?.message || 'Transaction failed'
                console.error('Deposit error:', err)
                showAlert(msg.length > 80 ? msg.slice(0, 80) + '…' : msg, 'error')
            }
        }
        setBusyDeposit(false)
    }

    const handleSyncPool = async () => {
        setBusySync(true)
        try {
            const signer = await getSigner()
            const contract = new ethers.Contract(stakingAddress, stakingAbi, signer)
            showAlert('Syncing reward pool...', 'info')
            const tx = await contract.syncRewardPool()
            await tx.wait()
            showAlert('Reward pool synced!', 'success')
            fetchStakingData()
        } catch (err) {
            const msg = err?.reason || err?.message || 'Transaction failed'
            showAlert(msg.length > 80 ? msg.slice(0, 80) + '…' : msg, 'error')
        }
        setBusySync(false)
    }

    const fmt = (v) => {
        const n = parseFloat(v)
        if (isNaN(n)) return '0'
        if (n % 1 === 0) return n.toString()
        // Up to 4 decimal places, remove trailing zeros
        return parseFloat(n.toFixed(4)).toString()
    }

    // Estimate days remaining based on fixed APY
    const totalStakedNum = parseFloat(stakingData.totalStaked)
    const rewardPoolNum = parseFloat(stakingData.rewardPool)
    const apyDecimal = stakingData.apy / 100 // percentage to decimal
    const dailyRate = totalStakedNum > 0 && apyDecimal > 0 ? (totalStakedNum * apyDecimal / 365) : 0
    const estimatedDays = dailyRate > 0 ? Math.floor(rewardPoolNum / dailyRate) : 0

    return (
        <div className={s.card}>
            <div className={s.cardHeader}>
                <span className={s.cardTitle}>Staking Control</span>
                <img src="/gear-swap.svg" alt="" className={s.cardIconSvg} />
            </div>

            <div className={s.statsGrid}>
                <div className={s.statItem}>
                    <div className={s.statLabel}>Current APY</div>
                    <div className={s.statValueAccent}>{loading ? '...' : `${fmt(stakingData.apy.toString())}%`}</div>
                </div>
                <div className={s.statItem}>
                    <div className={s.statLabel}>Reward Pool</div>
                    <div className={s.statValue}>{loading ? '...' : fmt(stakingData.rewardPool)}<span className={s.statUnit}>{tokenSymbol}</span></div>
                </div>
                <div className={s.statItem}>
                    <div className={s.statLabel}>Total Staked</div>
                    <div className={s.statValue}>{loading ? '...' : fmt(stakingData.totalStaked)}<span className={s.statUnit}>{tokenSymbol}</span></div>
                </div>
                <div className={s.statItem}>
                    <div className={s.statLabel}>Min Stake</div>
                    <div className={s.statValue}>{loading ? '...' : fmt(stakingData.minStake)}<span className={s.statUnit}>{tokenSymbol}</span></div>
                </div>
            </div>

            {!loading && estimatedDays > 0 && (
                <div className={s.inputHint} style={{ marginBottom: '0.75rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                    <img src="/clock-admin.svg" alt="" style={{ width: '14px', height: '14px', opacity: 0.7 }} /> Reward pool estimated to last ~{estimatedDays} days at current APY
                </div>
            )}

            <hr className={s.divider} />

            <div className={s.formGroup}>
                <label className={s.label}>Set APY (%)</label>
                <div className={s.formRow}>
                    <div className={s.inputWithUnit}>
                        <input
                            className={s.input}
                            type="number"
                            step="0.01"
                            min="0"
                            value={newApy}
                            onChange={e => setNewApy(e.target.value)}
                            placeholder={`${fmt(stakingData.apy.toString())}`}
                        />
                        <span className={s.inputUnit}>%</span>
                    </div>
                    <button
                        className={s.primaryBtn}
                        onClick={handleSetAPY}
                        disabled={busyApy || !newApy || parseFloat(newApy) < 0}
                        style={{ maxWidth: '140px' }}
                    >
                        {busyApy ? 'Sending...' : 'Set APY'}
                    </button>
                </div>
                <div className={s.inputHint}>Enter percentage, e.g. 12 = 12% APY, 5.5 = 5.5% APY</div>
            </div>

            <div className={s.formGroup}>
                <label className={s.label}>Deposit Rewards</label>
                <div className={s.formRow}>
                    <div className={s.inputWithUnit}>
                        <input
                            className={s.input}
                            type="number"
                            step="1"
                            min="0"
                            value={depositAmount}
                            onChange={e => setDepositAmount(e.target.value)}
                            placeholder="Amount"
                        />
                        <span className={s.inputUnit}>{tokenSymbol}</span>
                    </div>
                    <button
                        className={s.primaryBtn}
                        onClick={handleDepositRewards}
                        disabled={busyDeposit || !depositAmount || parseFloat(depositAmount) <= 0}
                        style={{ maxWidth: '140px' }}
                    >
                        {busyDeposit ? 'Sending...' : 'Deposit'}
                    </button>
                </div>
                <div className={s.inputHint}>Deposit tokens to fund the reward pool. APY rate is set separately.</div>
                <button
                    className={s.secondaryBtn}
                    onClick={handleSyncPool}
                    disabled={busySync}
                    style={{ marginTop: '0.5rem', width: '100%' }}
                >
                    {busySync ? 'Syncing...' : <><img src="/reload.svg" alt="" style={{ width: '14px', height: '14px', verticalAlign: 'middle', marginRight: '0.3rem' }} />Sync Reward Pool (if tokens sent via direct transfer)</>}
                </button>
            </div>

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
                        <span className={s.inputUnit}>{tokenSymbol}</span>
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
                <div className={s.inputHint}>Enter token amount directly, e.g. 100 = 100 {tokenSymbol} (auto-converts to smallest unit)</div>
            </div>

            <hr className={s.divider} />

            <div className={s.formGroup}>
                <label className={s.label} style={{ color: '#ef4444' }}>Emergency Withdraw</label>
                <div className={s.formRow}>
                    <div className={s.inputWithUnit}>
                        <input
                            className={s.input}
                            type="number"
                            step="1"
                            min="0"
                            value={withdrawAmount}
                            onChange={e => setWithdrawAmount(e.target.value)}
                            placeholder={`Max: ${fmt(stakingData.rewardPool)}`}
                        />
                        <span className={s.inputUnit}>{tokenSymbol}</span>
                    </div>
                    <button
                        className={s.dangerBtn}
                        onClick={async () => {
                            if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return
                            setBusyEmergency(true)
                            try {
                                const signer = await getSigner()
                                const contract = new ethers.Contract(stakingAddress, stakingAbi, signer)
                                const parsedAmount = ethers.parseUnits(withdrawAmount, tokenDecimals)
                                showAlert(`Emergency withdrawing ${withdrawAmount} ${tokenSymbol}...`, 'info')
                                const tx = await contract.emergencyWithdraw(parsedAmount)
                                await tx.wait()
                                showAlert(`Withdrawn ${withdrawAmount} ${tokenSymbol} from reward pool!`, 'success')
                                setWithdrawAmount('')
                                fetchStakingData()
                            } catch (err) {
                                const msg = err?.reason || err?.message || 'Transaction failed'
                                showAlert(msg.length > 80 ? msg.slice(0, 80) + '…' : msg, 'error')
                            }
                            setBusyEmergency(false)
                        }}
                        disabled={busyEmergency || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                        style={{ maxWidth: '140px' }}
                    >
                        {busyEmergency ? 'Sending...' : 'Withdraw'}
                    </button>
                </div>
                <div className={s.inputHint}>Withdraw reward tokens from the pool back to owner wallet</div>
            </div>

        </div>
    )
}

/* ============================================================= */
/*  Card 3 — Token Management (Supabase CRUD)                    */
/* ============================================================= */
function TokenManagementCard({ showAlert }) {
    const { refresh: refreshTokenList } = useTokenList()
    const [tokens, setTokens] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [busy, setBusy] = useState(false)
    const [form, setForm] = useState({ address: '', name: '', symbol: '', decimals: '18', logo_uri: '' })

    // Listing fee withdraw state
    const [feeBalance, setFeeBalance] = useState('0')
    const [currentListingFee, setCurrentListingFee] = useState('0')
    const [newListingFee, setNewListingFee] = useState('')
    const [loadingFee, setLoadingFee] = useState(true)
    const [busyWithdraw, setBusyWithdraw] = useState(false)
    const [busySetFee, setBusySetFee] = useState(false)

    const fetchTokens = useCallback(async () => {
        if (!supabase) { setLoading(false); return }
        try {
            const { data, error } = await supabase
                .from('swap_tokens')
                .select('*')
                .order('sort_order', { ascending: true })
            if (!error && data) setTokens(data)
        } catch { /* ignore */ }
        setLoading(false)
    }, [])

    useEffect(() => { fetchTokens() }, [fetchTokens])

    const fetchFeeBalance = useCallback(async () => {
        if (!listingManagerAddress) { setLoadingFee(false); return }
        try {
            const rpcProvider = new ethers.JsonRpcProvider(BASE_RPC, { chainId: 8453, name: 'base' }, { staticNetwork: true })
            const lmContract = new ethers.Contract(listingManagerAddress, listingManagerAbi, rpcProvider)
            const feeTokenAddr = await lmContract.feeToken()
            const tokenContract = new ethers.Contract(feeTokenAddr, erc20Abi, rpcProvider)
            const [balance, feeRaw, decimals] = await Promise.all([
                tokenContract.balanceOf(listingManagerAddress),
                lmContract.listingFee(),
                tokenContract.decimals(),
            ])
            setFeeBalance(ethers.formatUnits(balance, decimals))
            setCurrentListingFee(ethers.formatUnits(feeRaw, decimals))
        } catch (err) { console.error('Fee balance error:', err) }
        setLoadingFee(false)
    }, [])

    useEffect(() => { fetchFeeBalance() }, [fetchFeeBalance])

    const handleWithdrawFees = async () => {
        setBusyWithdraw(true)
        try {
            if (!window.ethereum) throw new Error('No wallet detected')
            const provider = new ethers.BrowserProvider(window.ethereum)
            const signer = await provider.getSigner()
            const signerAddress = await signer.getAddress()
            const lmContract = new ethers.Contract(listingManagerAddress, listingManagerAbi, signer)
            showAlert('Withdrawing listing fees...', 'info')
            const tx = await lmContract.withdrawFees(signerAddress)
            await tx.wait()
            showAlert('Listing fees withdrawn!', 'success')
            fetchFeeBalance()
        } catch (err) {
            if (err.code === 4001 || err.code === 'ACTION_REJECTED') showAlert('User rejected', 'error')
            else {
                const msg = err?.reason || err?.shortMessage || err?.message || 'Transaction failed'
                showAlert(msg.length > 80 ? msg.slice(0, 80) + '…' : msg, 'error')
            }
        }
        setBusyWithdraw(false)
    }

    const handleSetListingFee = async () => {
        const feeNum = parseFloat(newListingFee)
        if (isNaN(feeNum) || feeNum < 0) return
        setBusySetFee(true)
        try {
            if (!window.ethereum) throw new Error('No wallet detected')
            const provider = new ethers.BrowserProvider(window.ethereum)
            const signer = await provider.getSigner()
            const lmContract = new ethers.Contract(listingManagerAddress, listingManagerAbi, signer)
            // Read actual fee token decimals from contract
            const feeTokenAddr = await lmContract.feeToken()
            const tokenContract = new ethers.Contract(feeTokenAddr, erc20Abi, signer)
            const decimals = await tokenContract.decimals()
            const feeWei = ethers.parseUnits(newListingFee, decimals)
            showAlert(`Setting listing fee to ${newListingFee} NDESO...`, 'info')
            const tx = await lmContract.setListingFee(feeWei)
            await tx.wait()
            showAlert(`Listing fee updated to ${newListingFee} NDESO!`, 'success')
            setNewListingFee('')
            fetchFeeBalance()
        } catch (err) {
            if (err.code === 4001 || err.code === 'ACTION_REJECTED') showAlert('User rejected', 'error')
            else {
                const msg = err?.reason || err?.shortMessage || err?.message || 'Transaction failed'
                showAlert(msg.length > 80 ? msg.slice(0, 80) + '…' : msg, 'error')
            }
        }
        setBusySetFee(false)
    }

    const resetForm = () => {
        setForm({ address: '', name: '', symbol: '', decimals: '18', logo_uri: '' })
        setShowForm(false)
    }

    const handleAdd = async () => {
        if (!supabase) { showAlert('Supabase not configured', 'error'); return }
        if (!form.address || !form.name || !form.symbol) {
            showAlert('Address, name, and symbol are required', 'error'); return
        }
        if (!/^0x[a-fA-F0-9]{40}$/.test(form.address)) {
            showAlert('Invalid contract address', 'error'); return
        }
        setBusy(true)
        try {
            const maxOrder = tokens.length > 0 ? Math.max(...tokens.map(t => t.sort_order || 0)) : 0
            const { error } = await supabase.from('swap_tokens').insert({
                address: form.address,
                name: form.name,
                symbol: form.symbol.toUpperCase(),
                decimals: parseInt(form.decimals) || 18,
                logo_uri: form.logo_uri || null,
                sort_order: maxOrder + 1,
                is_active: true,
            })
            if (error) {
                if (error.code === '23505') showAlert('Token with this address already exists', 'error')
                else showAlert('Failed: ' + error.message, 'error')
            } else {
                showAlert(`${form.symbol.toUpperCase()} added!`, 'success')
                resetForm()
                fetchTokens()
                refreshTokenList()
            }
        } catch (err) {
            showAlert('Error: ' + err.message, 'error')
        }
        setBusy(false)
    }

    const handleToggleActive = async (token) => {
        if (!supabase) return
        try {
            const { error } = await supabase
                .from('swap_tokens')
                .update({ is_active: !token.is_active, updated_at: new Date().toISOString() })
                .eq('id', token.id)
            if (error) {
                showAlert('Toggle failed: ' + error.message, 'error')
            } else {
                showAlert(`${token.symbol} ${token.is_active ? 'disabled' : 'enabled'}`, 'success')
                fetchTokens()
                refreshTokenList()
            }
        } catch (err) {
            showAlert('Error: ' + err.message, 'error')
        }
    }

    const handleDelete = async (token) => {
        if (!supabase) return
        try {
            const { error } = await supabase
                .from('swap_tokens')
                .delete()
                .eq('id', token.id)
            if (error) {
                showAlert('Delete failed: ' + error.message, 'error')
            } else {
                showAlert(`${token.symbol} deleted`, 'success')
                fetchTokens()
                refreshTokenList()
            }
        } catch (err) {
            showAlert('Error: ' + err.message, 'error')
        }
    }

    return (
        <div className={s.card}>
            <div className={s.cardHeader}>
                <span className={s.cardTitle}>Token Management</span>
                <img src="/gear-swap.svg" alt="" className={s.cardIconSvg} />
            </div>

            {!showForm ? (
                <button className={s.primaryBtn} onClick={() => setShowForm(true)}>
                    + Add Token
                </button>
            ) : (
                <div style={{ marginBottom: '1rem' }}>
                    <div className={s.formGroup}>
                        <label className={s.label}>Contract Address</label>
                        <input
                            className={s.inputMono}
                            type="text"
                            value={form.address}
                            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                            placeholder="0x..."
                        />
                    </div>
                    <div className={s.formRow}>
                        <div className={s.formGroup}>
                            <label className={s.label}>Name</label>
                            <input
                                className={s.input}
                                type="text"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="e.g. My Token"
                            />
                        </div>
                        <div className={s.formGroup}>
                            <label className={s.label}>Symbol</label>
                            <input
                                className={s.input}
                                type="text"
                                value={form.symbol}
                                onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))}
                                placeholder="e.g. MTK"
                            />
                        </div>
                    </div>
                    <div className={s.formRow}>
                        <div className={s.formGroup}>
                            <label className={s.label}>Decimals</label>
                            <input
                                className={s.input}
                                type="number"
                                value={form.decimals}
                                onChange={e => setForm(f => ({ ...f, decimals: e.target.value }))}
                                placeholder="18"
                            />
                        </div>
                        <div className={s.formGroup}>
                            <label className={s.label}>Logo URL</label>
                            <input
                                className={s.input}
                                type="text"
                                value={form.logo_uri}
                                onChange={e => setForm(f => ({ ...f, logo_uri: e.target.value }))}
                                placeholder="/logo.png or https://..."
                            />
                        </div>
                    </div>
                    <div className={s.formRow}>
                        <button className={s.secondaryBtn} onClick={resetForm}>Cancel</button>
                        <button
                            className={s.primaryBtn}
                            onClick={handleAdd}
                            disabled={busy || !form.address || !form.name || !form.symbol}
                        >
                            {busy ? 'Adding...' : 'Add Token'}
                        </button>
                    </div>
                </div>
            )}

            <div className={s.tableWrap}>
                <div className={s.tableHeader}>
                    <div className={s.tableTitle}>Swap Tokens ({tokens.length})</div>
                </div>
                <div className={s.tableScroll}>
                    <table className={s.table}>
                        <thead>
                            <tr>
                                <th>Token</th>
                                <th>Address</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" className={s.emptyRow}>Loading...</td></tr>
                            ) : tokens.length === 0 ? (
                                <tr><td colSpan="4" className={s.emptyRow}>No tokens added</td></tr>
                            ) : (
                                tokens.map(token => (
                                    <tr key={token.id} style={{ opacity: token.is_active ? 1 : 0.5 }}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                {token.logo_uri ? (
                                                    <img src={token.logo_uri} alt="" style={{ width: 18, height: 18, borderRadius: '50%' }} onError={e => e.target.style.display = 'none'} />
                                                ) : (
                                                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', color: '#fff', fontWeight: 700 }}>{token.symbol?.charAt(0)}</div>
                                                )}
                                                <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{token.symbol}</span>
                                            </div>
                                        </td>
                                        <td className={s.addrCell}>
                                            {token.address.slice(0, 6)}…{token.address.slice(-4)}
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => handleToggleActive(token)}
                                                className={token.is_active ? s.cryptoBadge : s.manualBadge}
                                                style={{ cursor: 'pointer', border: 'none' }}
                                            >
                                                {token.is_active ? 'Active' : 'Disabled'}
                                            </button>
                                        </td>
                                        <td>
                                            <button
                                                className={s.dangerBtn}
                                                onClick={() => handleDelete(token)}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ===== LISTING FEE CONTROL ===== */}
            <hr className={s.divider} />
            <div className={s.formGroup}>
                <label className={s.label}>Listing Fee (ListingManager)</label>
                <div className={s.statsGrid} style={{ marginBottom: '0.75rem' }}>
                    <div className={s.statItem}>
                        <div className={s.statLabel}>Current Fee</div>
                        <div className={s.statValueAccent}>
                            {loadingFee ? '...' : parseFloat(currentListingFee).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                            <span className={s.statUnit}>NDESO</span>
                        </div>
                    </div>
                    <div className={s.statItem}>
                        <div className={s.statLabel}>Collected Fees</div>
                        <div className={s.statValue}>
                            {loadingFee ? '...' : parseFloat(feeBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                            <span className={s.statUnit}>NDESO</span>
                        </div>
                    </div>
                </div>

                <div className={s.formRow}>
                    <div className={s.inputWithUnit}>
                        <input
                            className={s.input}
                            type="number"
                            step="1"
                            min="0"
                            value={newListingFee}
                            onChange={e => setNewListingFee(e.target.value)}
                            placeholder={currentListingFee}
                        />
                        <span className={s.inputUnit}>NDESO</span>
                    </div>
                    <button
                        className={s.primaryBtn}
                        onClick={handleSetListingFee}
                        disabled={busySetFee || !newListingFee || parseFloat(newListingFee) < 0}
                        style={{ maxWidth: '140px' }}
                    >
                        {busySetFee ? 'Sending...' : 'Update Fee'}
                    </button>
                </div>
                <div className={s.inputHint}>Fee charged when users create a new trading pair, e.g. 100 = 100 NDESO</div>

                <div className={s.feeWithdrawRow} style={{ marginTop: '0.75rem' }}>
                    <div className={s.feeBalanceInfo}>
                        <div className={s.inputHint}>Withdraw accumulated listing fees to your wallet</div>
                    </div>
                    <button
                        className={s.primaryBtn}
                        onClick={handleWithdrawFees}
                        disabled={busyWithdraw || loadingFee || parseFloat(feeBalance) <= 0}
                        style={{ maxWidth: '160px' }}
                    >
                        {busyWithdraw ? 'Withdrawing...' : 'Withdraw Fees'}
                    </button>
                </div>
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

            {!isConnected && (
                <div className={s.gateWrap}>
                    <img src="/lock.svg" alt="" className={s.gateIcon} />
                    <h2 className={s.gateTitle}>Connect Wallet</h2>
                    <p className={s.gateMsg}>Connect your admin wallet to access the dashboard</p>
                    <ConnectButton />
                </div>
            )}

            {isConnected && !isAdmin && (
                <div className={s.gateWrap}>
                    <img src="/lock.svg" alt="" className={s.gateIcon} />
                    <h2 className={s.gateTitle}>Access Denied</h2>
                    <p className={s.gateMsg}>This wallet is not authorized to access the admin dashboard</p>
                </div>
            )}

            {isAdmin && (
                <>
                    <div className={s.pageHeader}>
                        <h1 className={s.pageTitle}>Admin Dashboard</h1>
                        <span className={s.pageBadge}>OWNER</span>
                    </div>

                    <ManualSubscriptionCard showAlert={showAlert} />
                    <SubscriptionPriceCard showAlert={showAlert} />
                    <StakingControlCard showAlert={showAlert} />
                    <TokenManagementCard showAlert={showAlert} />
                </>
            )}
        </div>
    )
}
