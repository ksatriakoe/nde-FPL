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
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                textAlign: 'center',
                maxWidth: 400,
                margin: '3rem auto',
                gap: '0.25rem',
            }}>
                <img src="/lock.svg" alt="" style={{ width: 52, height: 52, marginBottom: '1.25rem' }} />
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Connect Wallet</h2>
                <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 1.75rem', fontSize: '0.85rem', lineHeight: 1.5, maxWidth: 300 }}>
                    Connect your wallet to check your premium subscription status
                </p>
                <ConnectButton />
            </div>
        )
    }

    if (!isPremium) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                textAlign: 'center',
                maxWidth: 400,
                margin: '3rem auto',
                gap: '0.25rem',
            }}>
                <img src="/stars.svg" alt="" style={{ width: 52, height: 52, marginBottom: '1.25rem' }} />
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Premium Required</h2>
                <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 1.75rem', fontSize: '0.85rem', lineHeight: 1.5, maxWidth: 300 }}>
                    This feature requires an active premium subscription
                </p>
                <button
                    onClick={() => navigate('/subscribe')}
                    style={{
                        padding: '0.6rem 1.25rem',
                        borderRadius: '9999px',
                        border: 'none',
                        background: '#8B5CF6',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#7c3aed'}
                    onMouseLeave={e => e.currentTarget.style.background = '#8B5CF6'}
                >
                    Subscribe Now
                </button>
            </div>
        )
    }

    return children
}
