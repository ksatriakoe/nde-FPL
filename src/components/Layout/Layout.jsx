import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useFpl } from '../../hooks/useFplData'
import styles from './Layout.module.css'

const navItems = [
    { label: 'Free', section: true },
    { to: '/', icon: <img src="/dashboard.svg" alt="" className="nav-svg-icon" />, label: 'Dashboard' },
    { to: '/live', icon: <img src="/circle-menu.svg" alt="" className="nav-svg-icon" />, label: 'Live Scores' },
    { to: '/fixtures', icon: <img src="/calender.svg" alt="" className="nav-svg-icon" />, label: 'Fixtures' },
    { to: '/players', icon: <img src="/player.svg" alt="" className="nav-svg-icon" />, label: 'Players' },
    { to: '/price-changes', icon: <img src="/money.svg" alt="" className="nav-svg-icon" />, label: 'Price Changes' },
    { to: '/standings', icon: <img src="/trophy.svg" alt="" className="nav-svg-icon" />, label: 'Standings' },
    { label: 'Premium', section: true, premium: true },
    { to: '#', icon: '🤖', label: 'AI Picks', locked: true },
    { to: '#', icon: '📊', label: 'Analytics', locked: true },
    { to: '#', icon: '🗓️', label: 'Planner', locked: true },
]

export default function Layout() {
    const { currentGw, nextGw, loading } = useFpl()
    const [mobileOpen, setMobileOpen] = useState(false)

    const gwLabel = currentGw ? `GW${currentGw.id}` : nextGw ? `GW${nextGw.id}` : ''

    return (
        <div className={styles.layout}>
            <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>F</div>
                    <div className={styles.logoText}><span>FPL</span> Scout</div>
                </div>
                <nav className={styles.nav}>
                    {navItems.map((item, i) => {
                        if (item.section) {
                            return (
                                <div key={i} className={styles.sectionLabel}>
                                    {item.label}
                                    {item.premium && <span className={styles.premiumBadge}>PRO</span>}
                                </div>
                            )
                        }
                        return (
                            <NavLink
                                key={item.to + i}
                                to={item.to}
                                end={item.to === '/'}
                                className={({ isActive }) =>
                                    isActive && !item.locked ? styles.navLinkActive : styles.navLink
                                }
                                onClick={() => setMobileOpen(false)}
                            >
                                <span className={styles.navIcon}>{item.icon}</span>
                                {item.label}
                                {item.locked && <span className={styles.premiumBadge}>🔒</span>}
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
                        {gwLabel && <span className={styles.gwBadge}>{gwLabel}</span>}
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Fantasy Premier League 2025/26
                        </span>
                    </div>
                    <div className={styles.headerRight}>
                        {!loading && currentGw && !currentGw.finished && (
                            <div className={styles.liveIndicator}>
                                <span className={styles.liveDot}></span>
                                LIVE
                            </div>
                        )}
                    </div>
                </header>
                <div className={styles.content}>
                    <Outlet />
                </div>
            </div>
        </div>
    )
}
