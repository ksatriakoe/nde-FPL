import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { useWeb3 } from '../../hooks/useWeb3'
import { useTokenBalance } from '../../hooks/useTokenBalance'
import { formatSwapAmount } from '../../services/formatBalance'
import { stakingAddress, stakingAbi, erc20Abi } from '../../services/swapConstants'
import s from './Staking.module.css'

const TOKEN_ADDRESS = '0x91F193c3F24BaE45A0c592E7833354DE00A872C2'
const TOKEN_INFO = {
    address: TOKEN_ADDRESS,
    name: 'TEST Token',
    symbol: 'TEST',
    decimals: 18,
    logoURI: '/NdeFPL.png',
}

function TokenIcon({ token, size }) {
    const [err, setErr] = useState(false)
    const cls = size === 'lg' ? s.tokenIconLg : s.tokenIcon
    const placeholderCls = size === 'lg' ? s.tokenIconPlaceholderLg : s.tokenIconPlaceholder
    if (err || !token?.logoURI) return <div className={placeholderCls}>?</div>
    return <img src={token.logoURI} alt={token.symbol} className={cls} onError={() => setErr(true)} />
}

function useStakingContract(signer, provider, userAddress) {
    const [data, setData] = useState({
        totalStaked: '0',
        userStaked: '0',
        userRewards: '0',
        apyBasisPoints: 0,
        minStake: '0',
    })
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        if (!stakingAddress || !provider) {
            setLoading(false)
            return
        }
        try {
            const contract = new ethers.Contract(stakingAddress, stakingAbi, provider)
            const account = userAddress || ethers.ZeroAddress
            const info = await contract.getStakeInfo(account)
            setData({
                totalStaked: ethers.formatEther(info._totalStaked),
                userStaked: ethers.formatEther(info._userStaked),
                userRewards: ethers.formatEther(info._userRewards),
                apyBasisPoints: Number(info._apyBasisPoints),
                minStake: ethers.formatEther(info._minStake),
            })
        } catch (err) {
            console.error('Staking data fetch error:', err)
        }
        setLoading(false)
    }, [provider, userAddress])

    useEffect(() => {
        fetchData()
        const iv = setInterval(fetchData, 10000) // refresh every 10s
        return () => clearInterval(iv)
    }, [fetchData])

    return { data, loading, refresh: fetchData }
}

function StakeModal({ mode, onClose, showAlert, signer, provider, userAddress, stakeData, onSuccess }) {
    const [amount, setAmount] = useState('')
    const [busy, setBusy] = useState(false)
    const { formattedBalance } = useTokenBalance(TOKEN_ADDRESS)

    const maxAmount = mode === 'stake' ? formattedBalance : stakeData.userStaked

    const handleAction = async () => {
        if (!signer || !amount || parseFloat(amount) <= 0) return
        if (mode === 'stake') {
            if (parseFloat(amount) < parseFloat(stakeData.minStake)) {
                showAlert(`Minimum stake is ${formatSwapAmount(stakeData.minStake)} TEST`, 'error')
                return
            }
        }
        setBusy(true)
        try {
            const contract = new ethers.Contract(stakingAddress, stakingAbi, signer)
            const parsedAmount = ethers.parseEther(amount)

            if (mode === 'stake') {
                // Check and do approval
                const tokenContract = new ethers.Contract(TOKEN_ADDRESS, erc20Abi, signer)
                const allowance = await tokenContract.allowance(userAddress, stakingAddress)
                if (allowance < parsedAmount) {
                    showAlert('Approving tokens...', 'info')
                    const approveTx = await tokenContract.approve(stakingAddress, ethers.MaxUint256)
                    await approveTx.wait()
                }
                showAlert('Staking...', 'info')
                const tx = await contract.stake(parsedAmount)
                await tx.wait()
                showAlert(`Staked ${amount} TEST successfully!`, 'success')
            } else {
                showAlert('Unstaking...', 'info')
                const tx = await contract.unstake(parsedAmount)
                await tx.wait()
                showAlert(`Unstaked ${amount} TEST successfully!`, 'success')
            }
            onSuccess()
            onClose()
        } catch (err) {
            console.error(err)
            const msg = err?.reason || err?.message || 'Transaction failed'
            showAlert(msg.length > 80 ? msg.slice(0, 80) + '…' : msg, 'error')
        }
        setBusy(false)
    }

    // Check if stake amount meets minimum
    const belowMin = mode === 'stake' && amount && parseFloat(amount) > 0 &&
        parseFloat(amount) < parseFloat(stakeData.minStake)

    return (
        <>
            <div className={s.modalBackdrop} onClick={onClose} />
            <div className={s.modalCenter}>
                <div className={s.modal}>
                    <div className={s.modalHeader}>
                        <span className={s.modalTitle}>
                            {mode === 'stake' ? 'Stake' : 'Unstake'} TEST
                        </span>
                        <button className={s.modalClose} onClick={onClose}>×</button>
                    </div>
                    <div className={s.modalBody}>
                        <div className={s.inputSection}>
                            <div className={s.inputHeader}>
                                <span className={s.inputLabel}>
                                    {mode === 'stake' ? 'Amount to stake' : 'Amount to unstake'}
                                </span>
                                <div className={s.balanceRow}>
                                    <button className={s.percentBtn} onClick={() => setAmount((parseFloat(maxAmount) * 0.25).toString())}>25%</button>
                                    <button className={s.percentBtn} onClick={() => setAmount((parseFloat(maxAmount) * 0.5).toString())}>50%</button>
                                    <button className={s.percentBtn} onClick={() => setAmount(maxAmount)}>MAX</button>
                                </div>
                            </div>
                            <div className={s.inputRow}>
                                <div className={s.inputTokenInfo}>
                                    <TokenIcon token={TOKEN_INFO} />
                                    <span>TEST</span>
                                </div>
                                <input
                                    className={s.amountInput}
                                    type="text"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className={s.inputBalance}>
                                <img src="/wallet.svg" alt="" className={s.walletIcon} />
                                {mode === 'stake' ? `Balance: ${formattedBalance}` : `Staked: ${formatSwapAmount(stakeData.userStaked)}`} TEST
                            </div>
                        </div>

                        {mode === 'stake' && (
                            <div className={s.modalInfo}>
                                <div className={s.modalInfoRow}>
                                    <span className={s.modalInfoLabel}>Min Stake</span>
                                    <span className={s.modalInfoValue}>{formatSwapAmount(stakeData.minStake)} TEST</span>
                                </div>
                            </div>
                        )}

                        {mode === 'stake' ? (
                            <button
                                className={s.modalActionBtn}
                                onClick={handleAction}
                                disabled={!signer || !amount || parseFloat(amount) <= 0 || busy || belowMin}
                            >
                                {busy ? 'Processing...' : !signer ? 'Connect Wallet' : belowMin ? `Min ${formatSwapAmount(stakeData.minStake)} TEST` : 'Stake'}
                            </button>
                        ) : (
                            <button
                                className={s.modalActionBtnUnstake}
                                onClick={handleAction}
                                disabled={!signer || !amount || parseFloat(amount) <= 0 || busy}
                            >
                                {busy ? 'Processing...' : !signer ? 'Connect Wallet' : 'Unstake'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default function Staking() {
    const { signer, provider, userAddress } = useWeb3()
    const [alerts, setAlerts] = useState([])
    const [modalMode, setModalMode] = useState(null)
    const [claimBusy, setClaimBusy] = useState(false)

    const { data: stakeData, loading, refresh } = useStakingContract(signer, provider, userAddress)

    const showAlert = (message, type = 'info') => {
        const id = Date.now()
        setAlerts(prev => [...prev, { id, message, type }])
        setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 4000)
    }

    const handleClaim = async () => {
        if (!signer) return
        setClaimBusy(true)
        try {
            const contract = new ethers.Contract(stakingAddress, stakingAbi, signer)
            showAlert('Claiming rewards...', 'info')
            const tx = await contract.claimRewards()
            await tx.wait()
            showAlert(`Claimed ${formatSwapAmount(stakeData.userRewards)} TEST!`, 'success')
            refresh()
        } catch (err) {
            console.error(err)
            const msg = err?.reason || err?.message || 'Claim failed'
            showAlert(msg.length > 80 ? msg.slice(0, 80) + '…' : msg, 'error')
        }
        setClaimBusy(false)
    }

    // APY from contract (basis points → percentage)
    const apy = stakeData.apyBasisPoints / 100

    const contractReady = !!stakingAddress

    return (
        <div className={s.page}>
            {alerts.length > 0 && (
                <div className={s.alertContainer}>
                    {alerts.map(a => (
                        <div key={a.id} className={`${s.alert} ${a.type === 'success' ? s.alertSuccess : a.type === 'error' ? s.alertError : s.alertInfo}`}>
                            <span>{a.message}</span>
                            <button className={s.alertClose} onClick={() => setAlerts(prev => prev.filter(x => x.id !== a.id))}>×</button>
                        </div>
                    ))}
                </div>
            )}

            <div className={s.card}>
                {/* Header */}
                <div className={s.header}>
                    <div className={s.headerLeft}>
                        <TokenIcon token={TOKEN_INFO} size="lg" />
                        <div>
                            <h1 className={s.title}>Staking</h1>
                            <div className={s.subtitle}>Stake TEST to earn rewards</div>
                        </div>
                    </div>
                    <span className={s.aprText}>{apy > 0 ? `${formatSwapAmount(apy.toString())}%` : '—'} <span className={s.aprTextLabel}>APY</span></span>
                </div>

                {!contractReady && (
                    <div className={s.detailsBox} style={{ textAlign: 'center', padding: '1.5rem', color: '#9ca3af' }}>
                        Contract not deployed yet. Paste the deployed address in <code>swapConstants.js</code>
                    </div>
                )}

                {contractReady && (
                    <>
                        {/* Overview Stats */}
                        <div className={s.overviewGrid}>
                            <div className={s.overviewItem}>
                                <div className={s.overviewLabel}>Total Staked</div>
                                <div className={s.overviewValue}>{loading ? '...' : Math.floor(parseFloat(stakeData.totalStaked)).toLocaleString()}</div>
                                <div className={s.overviewUnit}>TEST</div>
                            </div>
                            <div className={s.overviewItem}>
                                <div className={s.overviewLabel}>Your Staked</div>
                                <div className={s.overviewValue}>{loading ? '...' : formatSwapAmount(stakeData.userStaked)}</div>
                                <div className={s.overviewUnit}>TEST</div>
                            </div>
                            <div className={s.overviewItem}>
                                <div className={s.overviewLabel}>Your Rewards</div>
                                <div className={s.overviewValueReward}>{loading ? '...' : formatSwapAmount(stakeData.userRewards)}</div>
                                <div className={s.overviewUnit}>TEST</div>
                            </div>
                        </div>

                        {/* Pool Details */}
                        <div className={s.detailsBox}>
                            <div className={s.detailRow}>
                                <span className={s.detailLabel}>Lock Period</span>
                                <span className={s.detailValue}>No Lock</span>
                            </div>
                            <div className={s.detailRow}>
                                <span className={s.detailLabel}>Min Stake</span>
                                <span className={s.detailValue}>{formatSwapAmount(stakeData.minStake)} TEST</span>
                            </div>
                            <div className={s.detailRow}>
                                <span className={s.detailLabel}>Reward Token</span>
                                <span className={s.detailValue}>TEST</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className={s.actionBtns}>
                            <button className={s.stakeBtn} onClick={() => setModalMode('stake')}>
                                Stake TEST
                            </button>
                            <button className={s.unstakeBtn} onClick={() => setModalMode('unstake')}>
                                Unstake
                            </button>
                        </div>

                        {/* Claim Rewards */}
                        {parseFloat(stakeData.userRewards) > 0 && (
                            <button
                                className={s.claimBtn}
                                onClick={handleClaim}
                                disabled={claimBusy}
                            >
                                {claimBusy ? 'Claiming...' : `Claim ${formatSwapAmount(stakeData.userRewards)} TEST`}
                            </button>
                        )}
                    </>
                )}
            </div>

            {modalMode && contractReady && (
                <StakeModal
                    mode={modalMode}
                    onClose={() => setModalMode(null)}
                    showAlert={showAlert}
                    signer={signer}
                    provider={provider}
                    userAddress={userAddress}
                    stakeData={stakeData}
                    onSuccess={refresh}
                />
            )}
        </div>
    )
}
