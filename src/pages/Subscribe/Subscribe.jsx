import { useState, useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatUnits } from 'viem'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../services/supabase'
import {
    FPL_SUBSCRIPTION_ABI, FPL_SUBSCRIPTION_ADDRESS,
    ERC20_ABI, TOKEN_ADDRESS,
} from '../../services/contractConfig'
import styles from './Subscribe.module.css'

const SUBSCRIPTION_DAYS = 30

export default function Subscribe() {
    const { address, isConnected } = useAccount()
    const { isPremium, subscription, checkSubscription } = useAuth()
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [step, setStep] = useState('idle')
    const [copied, setCopied] = useState(false)

    const isContractReady = FPL_SUBSCRIPTION_ADDRESS !== '0x0000000000000000000000000000000000000000'

    /* ── Contract reads ── */
    const { data: contractPrice } = useReadContract({
        address: FPL_SUBSCRIPTION_ADDRESS, abi: FPL_SUBSCRIPTION_ABI,
        functionName: 'price', query: { enabled: isContractReady },
    })
    const { data: tokenDecimals } = useReadContract({
        address: TOKEN_ADDRESS, abi: ERC20_ABI, functionName: 'decimals',
    })
    const { data: tokenSymbol } = useReadContract({
        address: TOKEN_ADDRESS, abi: ERC20_ABI, functionName: 'symbol',
    })
    const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
        address: TOKEN_ADDRESS, abi: ERC20_ABI, functionName: 'balanceOf',
        args: address ? [address] : undefined, query: { enabled: !!address },
    })
    const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
        address: TOKEN_ADDRESS, abi: ERC20_ABI, functionName: 'allowance',
        args: address ? [address, FPL_SUBSCRIPTION_ADDRESS] : undefined,
        query: { enabled: !!address && isContractReady },
    })

    /* ── Writes ── */
    const { writeContract: writeApprove, data: approveTxHash, isPending: isApprovePending, error: approveError } = useWriteContract()
    const { writeContract: writePay, data: payTxHash, isPending: isPayPending, error: payError } = useWriteContract()
    const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash })
    const { isSuccess: payConfirmed } = useWaitForTransactionReceipt({ hash: payTxHash })

    /* ── Derived ── */
    const dec = tokenDecimals ?? 18
    const sym = tokenSymbol || 'NDESO'
    const price = contractPrice ? formatUnits(contractPrice, dec) : '—'
    const balance = tokenBalance !== undefined ? Math.floor(Number(formatUnits(tokenBalance, dec))).toString() : '—'
    const canAfford = tokenBalance !== undefined && contractPrice !== undefined && tokenBalance >= contractPrice
    const hasAllowance = currentAllowance !== undefined && contractPrice !== undefined && currentAllowance >= contractPrice
    const expiry = subscription?.expires_at ? new Date(subscription.expires_at) : null
    const isExpired = expiry && expiry <= new Date()

    /* ── Actions ── */
    const approve = () => {
        if (!contractPrice) return
        setError(''); setSuccess(''); setStep('approving')
        writeApprove({ address: TOKEN_ADDRESS, abi: ERC20_ABI, functionName: 'approve', args: [FPL_SUBSCRIPTION_ADDRESS, contractPrice] })
    }

    const pay = () => {
        setError(''); setSuccess(''); setStep('paying')
        writePay({ address: FPL_SUBSCRIPTION_ADDRESS, abi: FPL_SUBSCRIPTION_ABI, functionName: 'pay' })
    }

    const copyAddress = () => {
        if (!address) return
        navigator.clipboard.writeText(address)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    useEffect(() => {
        if (approveConfirmed && step === 'approving') refetchAllowance().then(() => pay())
    }, [approveConfirmed])

    useEffect(() => {
        if (payConfirmed && step === 'paying') saveSubscription()
    }, [payConfirmed])

    const saveSubscription = async () => {
        if (!address || !supabase) { setError('Database not configured'); setStep('idle'); return }
        const base = (expiry && expiry > new Date()) ? new Date(expiry) : new Date()
        base.setDate(base.getDate() + SUBSCRIPTION_DAYS)
        const { error: dbErr } = await supabase.from('subscriptions').upsert({
            wallet_address: address.toLowerCase(),
            tx_hash: payTxHash,
            plan: 'premium_monthly',
            expires_at: base.toISOString(),
            created_at: new Date().toISOString(),
        }, { onConflict: 'wallet_address' })
        if (dbErr) { console.error(dbErr); setError('Payment OK but save failed: ' + dbErr.message) }
        else { setSuccess('🎉 Premium active for 30 days!'); await checkSubscription() }
        refetchBalance(); refetchAllowance(); setStep('idle')
    }

    useEffect(() => {
        const e = approveError || payError
        if (e) { setStep('idle'); setError(e.shortMessage?.includes('User rejected') ? 'Transaction cancelled' : (e.shortMessage || e.message)) }
    }, [approveError, payError])

    /* ── Button ── */
    const btn = (() => {
        if (!isContractReady) return { text: 'Contract not configured', disabled: true }
        if (!canAfford) return { text: `Insufficient ${sym}`, disabled: true }
        if (step === 'approving') return { text: isApprovePending ? 'Approve in wallet…' : 'Confirming approval…', disabled: true }
        if (step === 'paying') return { text: isPayPending ? 'Confirm in wallet…' : 'Confirming payment…', disabled: true }
        if (hasAllowance) return { text: `Subscribe · ${price} ${sym}`, disabled: false, action: pay }
        return { text: `Approve & Subscribe · ${price} ${sym}`, disabled: false, action: approve }
    })()

    return (
        <div className={styles.page}>

            {/* Wallet Card */}
            {isConnected && (
                <div className={styles.walletCard}>
                    <div className={styles.walletRow}>
                        <span className={styles.walletLabel}>Wallet</span>
                        <button className={styles.copyBtn} onClick={copyAddress} title="Copy address">
                            <span className={styles.walletAddr}>{address}</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                            </svg>
                        </button>
                    </div>
                    {copied && <span className={styles.copiedToast}>Copied!</span>}
                    <div className={styles.walletMeta}>
                        <span>{balance} {sym}</span>
                        <span>Base Mainnet</span>
                    </div>
                </div>
            )}

            {/* Plan Card */}
            <div className={styles.planCard}>
                <div className={styles.planHeader}>
                    <span className={styles.planName}>Premium</span>
                    <span className={styles.planBadge}>MONTHLY</span>
                </div>

                {isConnected && (
                    <div className={styles.statusRow}>
                        <span className={styles.statusLabel}>Status</span>
                        <span className={isPremium ? styles.statusActive : styles.statusInactive}>
                            {isPremium ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                )}
                {expiry && (
                    <div className={styles.statusRow}>
                        <span className={styles.statusLabel}>{isExpired ? 'Expired' : 'Expires'}</span>
                        <span className={styles.statusValue}>
                            {expiry.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                )}

                <div className={styles.planPrice}>{price} <span>{sym} / month</span></div>

                <ul className={styles.features}>
                    <li>AI Captain Picks</li>
                    <li>Match Predictions</li>
                    <li>GW Summary & Preview</li>
                    <li>Transfer Suggestions</li>
                    <li>Differentials Finder</li>
                    <li>Injury & Suspension Alerts</li>
                    <li>Form × Fixture Matrix</li>
                    <li>Ownership & EO Data</li>
                    <li>Consistency x Fixture</li>
                    <li>Crypto Charts</li>
                </ul>

                <hr className={styles.divider} />

                <div className={styles.ctaArea}>
                    {!isConnected ? (
                        <>
                            <span className={styles.ctaLabel}>Connect wallet to subscribe</span>
                            <ConnectButton />
                        </>
                    ) : isPremium && !isExpired ? (
                        <div className={styles.activeBadge}>
                            <p>✓ Active Subscription</p>
                        </div>
                    ) : (
                        <>
                            {error && <div className={styles.error}>{error}</div>}
                            {success && <div className={styles.success}>{success}</div>}
                            <button className={styles.subscribeBtn} onClick={btn.action} disabled={btn.disabled}>
                                {isExpired ? `Renew · ${price} ${sym}` : btn.text}
                            </button>
                            {(approveTxHash || payTxHash) && (
                                <div className={styles.txLink}>
                                    <span>{payTxHash ? 'Payment' : 'Approval'}: </span>
                                    <a href={`https://basescan.org/tx/${payTxHash || approveTxHash}`}
                                        target="_blank" rel="noopener noreferrer">
                                        {(payTxHash || approveTxHash)?.slice(0, 12)}…{(payTxHash || approveTxHash)?.slice(-8)}
                                    </a>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Info */}
            <div className={styles.infoCard}>
                <div className={styles.infoTitle}>How it works</div>
                <ul className={styles.infoSteps}>
                    <li><span className={styles.stepNum}>1</span>Click Subscribe below</li>
                    <li><span className={styles.stepNum}>2</span>Approve token spend in your wallet</li>
                    <li><span className={styles.stepNum}>3</span>Confirm payment — {price} {sym} is transferred</li>
                    <li><span className={styles.stepNum}>4</span>Premium unlocks instantly for 30 days</li>
                </ul>
                <div className={styles.addressInfo}>
                    <div className={styles.addressRow}>
                        <span className={styles.addressLabel}>Token</span>
                        <span className={styles.addressValue}>{TOKEN_ADDRESS}</span>
                    </div>
                    <div className={styles.addressRow}>
                        <span className={styles.addressLabel}>Contract</span>
                        <span className={styles.addressValue}>{FPL_SUBSCRIPTION_ADDRESS}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
