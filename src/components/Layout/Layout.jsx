import { useState, useRef, useEffect, useMemo } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useFpl } from '../../hooks/useFplData'
import { useAuth } from '../../hooks/useAuth'
import { SettingsProvider } from '../../hooks/useSettings'
import styles from './Layout.module.css'

const navItems = [
    { label: 'Free', section: true },
    { to: '/', icon: <img src="/dashboard.svg" alt="" className="nav-svg-icon" />, label: 'Dashboard' },
    { to: '/live', icon: <img src="/circle-menu.svg" alt="" className="nav-svg-icon" />, label: 'Live Scores' },
    { to: '/fixtures', icon: <img src="/calender.svg" alt="" className="nav-svg-icon" />, label: 'Fixtures' },
    { to: '/players', icon: <img src="/player.svg" alt="" className="nav-svg-icon" />, label: 'Players' },
    { to: '/price-changes', icon: <img src="/money.svg" alt="" className="nav-svg-icon" />, label: 'Price Changes' },
    { to: '/standings', icon: <img src="/trophy.svg" alt="" className="nav-svg-icon" />, label: 'Standings' },
    { to: '/my-team', icon: <img src="/user-group.svg" alt="" className="nav-svg-icon" />, label: 'My Team' },
    { to: '/watchlist', icon: <img src="/bookmark.svg" alt="" className="nav-svg-icon" />, label: 'Watchlist' },
    { label: 'AI Features', section: true, premium: true },
    { to: '/captain-picks', icon: <img src="/crown.svg" alt="" className="nav-svg-icon" />, label: 'Captain Picks' },
    { to: '/match-predictions', icon: <img src="/prediction.svg" alt="" className="nav-svg-icon" />, label: 'Predictions' },
    { to: '/gw-summary', icon: <img src="/document.svg" alt="" className="nav-svg-icon" />, label: 'GW Summary' },
    { to: '/transfers', icon: <img src="/robot.svg" alt="" className="nav-svg-icon" />, label: 'Transfers AI' },
    { label: 'Analytics', section: true, premium: true },
    { to: '/differentials', icon: <img src="/pie-chart.svg" alt="" className="nav-svg-icon" />, label: 'Differentials' },
    { to: '/injuries', icon: <img src="/medical.svg" alt="" className="nav-svg-icon" />, label: 'Injury Alerts' },
    { to: '/form-fixture', icon: <img src="/calender.svg" alt="" className="nav-svg-icon" />, label: 'Form×Fixture' },
    { to: '/consistency-fixture', icon: <img src="/card.svg" alt="" className="nav-svg-icon" />, label: 'Con×Fixture' },
    { to: '/ownership', icon: <img src="/target.svg" alt="" className="nav-svg-icon" />, label: 'Ownership & EO' },
    { to: '/crypto-charts', icon: <img src="/chart-line.svg" alt="" className="nav-svg-icon" />, label: 'Crypto Charts' },
    { label: 'Account', section: true },
    { to: '/subscribe', icon: <img src="/premium.svg" alt="" className="nav-svg-icon" />, label: 'Subscribe' },
    { to: '/swap', icon: <img src="/exchange.svg" alt="" className="nav-svg-icon" />, label: 'Swap' },
    { to: '/staking', icon: <img src="/money-swap.svg" alt="" className="nav-svg-icon" />, label: 'Staking' },
]

export default function Layout() {
    const { currentGw, nextGw, loading } = useFpl()
    const { isPremium, wallet } = useAuth()
    const navigate = useNavigate()
    const [mobileOpen, setMobileOpen] = useState(false)
    const [desktopCollapsed, setDesktopCollapsed] = useState(false)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_key') || '')
    const settingsRef = useRef(null)

    useEffect(() => {
        function handleClick(e) {
            if (settingsRef.current && !settingsRef.current.contains(e.target)) {
                setSettingsOpen(false)
            }
        }
        if (settingsOpen) {
            document.addEventListener('mousedown', handleClick)
            return () => document.removeEventListener('mousedown', handleClick)
        }
    }, [settingsOpen])

    const saveKey = (k) => {
        setApiKey(k)
        localStorage.setItem('gemini_key', k)
    }

    const gwLabel = currentGw ? `GW${currentGw.id}` : nextGw ? `GW${nextGw.id}` : ''

    return (
        <div className={styles.layout}>
            {mobileOpen && <div className={styles.overlay} onClick={() => setMobileOpen(false)} />}
            <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''} ${desktopCollapsed ? styles.sidebarCollapsed : ''}`}>
                <div className={styles.logo} onClick={() => { if (window.innerWidth > 768) setDesktopCollapsed(true) }} role="button" title="Hide sidebar">
                    <img src="/NdeFPL.png" alt="Nde-FPL" className={styles.logoImg} />
                    <div className={styles.logoText}><span>Nde</span>-FPL</div>
                </div>
                <nav className={styles.nav}>
                    {navItems.map((item, i) => {
                        if (item.section) {
                            return (
                                <div key={i} className={styles.sectionLabel}>
                                    {item.label}
                                    {item.premium && <span className={styles.premiumBadge}>PREMIUM</span>}
                                </div>
                            )
                        }
                        return (
                            <NavLink
                                key={item.to + i}
                                to={item.to}
                                end={item.to === '/'}
                                className={({ isActive }) =>
                                    isActive ? styles.navLinkActive : styles.navLink
                                }
                                onClick={() => setMobileOpen(false)}
                            >
                                <span className={styles.navIcon}>{item.icon}</span>
                                {item.label}
                            </NavLink>
                        )
                    })}
                </nav>
            </aside>

            <div className={styles.main}>
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <button
                            className={styles.mobileToggle}
                            onClick={() => setMobileOpen(!mobileOpen)}
                        >
                            ☰
                        </button>
                        {desktopCollapsed && (
                            <div className={styles.headerLogo} onClick={() => setDesktopCollapsed(false)} role="button" title="Show sidebar">
                                <img src="/NdeFPL.png" alt="Nde-FPL" className={styles.headerLogoImg} />
                                <span className={styles.headerLogoText}><span>Nde</span>-FPL</span>
                            </div>
                        )}
                        {gwLabel && <span className={styles.gwBadge}>{gwLabel}</span>}
                        <span className={styles.seasonFull}>Fantasy Premier League 2025/26</span>
                        <span className={styles.seasonMobile}>FPL 25/26</span>
                    </div>
                    <div className={styles.headerRight}>
                        {!loading && currentGw && !currentGw.finished && (
                            <div className={styles.liveIndicator}>
                                <span className={styles.liveDot}></span>
                                LIVE
                            </div>
                        )}
                        <div className={styles.settingsWrapper} ref={settingsRef}>
                            <button
                                className={styles.settingsBtn}
                                onClick={() => setSettingsOpen(!settingsOpen)}
                                title="AI Settings"
                            >
                                <img src="/gear.svg" alt="Settings" className={styles.settingsIcon} />
                                <span className={styles.settingsBadge}>PREMIUM</span>
                            </button>
                            {settingsOpen && (
                                <div className={styles.settingsPopup}>
                                    {isPremium ? (
                                        <>
                                            <div className={styles.settingsHeader}>
                                                <img src="/gear.svg" alt="" className={styles.popupGearIcon} />
                                                <span>AI Settings</span>
                                                <span className={styles.settingsProTag}>PREMIUM</span>
                                            </div>
                                            <p className={styles.settingsDesc}>
                                                Enter your Gemini API key to unlock AI-powered features like Captain Picks, Predictions, GW Summary, and Transfer Suggestions.
                                            </p>
                                            <label className={styles.settingsLabel}>Gemini API Key</label>
                                            <input
                                                className={styles.settingsInput}
                                                type="password"
                                                placeholder="Enter your API key..."
                                                value={apiKey}
                                                onChange={e => saveKey(e.target.value)}
                                            />
                                            <div className={styles.settingsHint}>
                                                <img src="/lock.svg" alt="" className={styles.hintIcon} /> Stored locally — never sent to our servers
                                            </div>
                                            <div className={styles.settingsGuide}>
                                                <div className={styles.guideTitle}><img src="/book.svg" alt="" className={styles.hintIcon} /> How to get your API key:</div>
                                                <ol className={styles.guideSteps}>
                                                    <li>Go to <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className={styles.guideLink}>Google AI Studio</a></li>
                                                    <li>Sign in with your Google account</li>
                                                    <li>Click <strong>"Create API Key"</strong></li>
                                                    <li>Copy the key and paste it above</li>
                                                </ol>
                                                <div className={styles.guideFree}><img src="/magic-pro.svg" alt="" className={styles.hintIcon} /> It's free — no credit card required</div>
                                            </div>
                                            {apiKey && (
                                                <div className={styles.settingsStatus}>
                                                    <span className={styles.statusDot}></span>
                                                    API key configured
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div className={styles.settingsHeader}>
                                                <img src="/lock.svg" alt="" className={styles.hintIcon} />
                                                <span>Premium Required</span>
                                            </div>
                                            <p className={styles.settingsDesc}>
                                                Subscribe to Premium to access AI-powered features including AI Captain Picks, Match Predictions, GW Summary, Differentials, and more!
                                            </p>
                                            <button
                                                className={styles.settingsSubscribeBtn}
                                                onClick={() => { navigate('/subscribe'); setSettingsOpen(false) }}
                                            >
                                                Subscribe Now
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        <ConnectButton accountStatus="avatar" chainStatus="icon" showBalance={false} />
                    </div>
                </header>
                <div className={styles.content}>
                    <SettingsProvider value={{ openSettings: () => setSettingsOpen(true) }}>
                        <Outlet />
                    </SettingsProvider>
                </div>
            </div>
        </div>
    )
}
