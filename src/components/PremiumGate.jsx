import { useAuth } from '../hooks/useAuth'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useNavigate } from 'react-router-dom'

export default function PremiumGate({ children }) {
    const { wallet, isPremium, loading } = useAuth()
    const navigate = useNavigate()

    if (loading) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div className="shimmer" style={{ height: 300, borderRadius: 'var(--radius)' }} />
            </div>
        )
    }

    if (!wallet) {
        return (
            <div style={{
                padding: '3rem',
                textAlign: 'center',
                maxWidth: 450,
                margin: '2rem auto',
            }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
                <h2 style={{ marginBottom: '0.5rem' }}>Connect Wallet</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    Connect your wallet to check your premium subscription status
                </p>
                <ConnectButton />
            </div>
        )
    }

    if (!isPremium) {
        return (
            <div style={{
                padding: '3rem',
                textAlign: 'center',
                maxWidth: 450,
                margin: '2rem auto',
            }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⭐</div>
                <h2 style={{ marginBottom: '0.5rem' }}>Premium Required</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    This feature requires an active premium subscription
                </p>
                <button
                    onClick={() => navigate('/subscribe')}
                    style={{
                        padding: '0.65rem 1.5rem',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: 'var(--accent-gradient)',
                        color: 'var(--bg-primary)',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                    }}
                >
                    Subscribe Now
                </button>
            </div>
        )
    }

    return children
}
