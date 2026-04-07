import { useState, useMemo, useRef, useEffect } from 'react'
import { useFpl } from '../../hooks/useFplData'
import { getTeamBadgeUrl, getDifficultyColor } from '../../services/fplApi'
import styles from './Fixtures.module.css'

const FILTER_OPTIONS = [
    { label: 'All Fixtures', value: 'all' },
    { label: 'Next 2 GWs', value: 2 },
    { label: 'Next 3 GWs', value: 3 },
    { label: 'Next 4 GWs', value: 4 },
    { label: 'Next 5 GWs', value: 5 },
    { label: 'Next 6 GWs', value: 6 },
    { label: 'Next 8 GWs', value: 8 },
    { label: 'Custom Range', value: 'custom' },
]

export default function Fixtures() {
    const { fixtures, teams, targetGw, loading } = useFpl()
    const gwStart = targetGw?.id || 1

    const [filter, setFilter] = useState(6)
    const [customFrom, setCustomFrom] = useState(gwStart)
    const [customTo, setCustomTo] = useState(38)
    const [venueFilter, setVenueFilter] = useState('all')
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [fromOpen, setFromOpen] = useState(false)
    const [toOpen, setToOpen] = useState(false)
    const dropdownRef = useRef(null)
    const fromRef = useRef(null)
    const toRef = useRef(null)

    useEffect(() => {
        if (gwStart > 1) setCustomFrom(gwStart)
    }, [gwStart])

    useEffect(() => {
        function handleClick(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false)
            if (fromRef.current && !fromRef.current.contains(e.target)) setFromOpen(false)
            if (toRef.current && !toRef.current.contains(e.target)) setToOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const gwRange = useMemo(() => {
        const gws = []
        if (filter === 'custom') {
            for (let i = customFrom; i <= customTo && i <= 38; i++) gws.push(i)
        } else if (filter === 'all') {
            for (let i = gwStart; i <= 38; i++) gws.push(i)
        } else {
            for (let i = gwStart; i < gwStart + filter && i <= 38; i++) gws.push(i)
        }
        return gws
    }, [filter, gwStart, customFrom, customTo])

    const selectedLabel = FILTER_OPTIONS.find(o => o.value === filter)?.label || ''

    const teamFixtures = useMemo(() => {
        if (!fixtures || !teams.length) return []
        return teams.map(team => {
            const row = { team }
            gwRange.forEach(gw => {
                const matches = fixtures.filter(
                    f => f.event === gw && (f.team_h === team.id || f.team_a === team.id)
                )
                row[`gw${gw}`] = matches.map(m => {
                    const isHome = m.team_h === team.id
                    const oppId = isHome ? m.team_a : m.team_h
                    const opp = teams.find(t => t.id === oppId)
                    return {
                        opponent: opp?.short_name || '?',
                        isHome,
                        difficulty: isHome ? m.team_h_difficulty : m.team_a_difficulty,
                    }
                }).filter(m => {
                    if (venueFilter === 'home') return m.isHome
                    if (venueFilter === 'away') return !m.isHome
                    return true
                })
                row[`gw${gw}_total`] = matches.length
            })
            return row
        }).sort((a, b) => a.team.name.localeCompare(b.team.name))
    }, [fixtures, teams, gwRange, venueFilter])

    if (loading) {
        return (
            <div className={styles.page}>
                <h1 className="page-title">Fixture Calendar</h1>
                <div className="shimmer" style={{ height: 400, borderRadius: 'var(--radius)' }} />
            </div>
        )
    }

    return (
        <div className={styles.page}>
            <h1 className="page-title">Fixture Calendar</h1>

            <div className={styles.controls}>
                <div className={styles.customSelect} ref={dropdownRef}>
                    <button className={styles.selectBtn} onClick={() => setDropdownOpen(!dropdownOpen)}>
                        <span>{selectedLabel}</span>
                        <img src="/bottom.svg" alt="Toggle" className={`${styles.selectArrow} ${dropdownOpen ? styles.selectArrowOpen : ''}`} />
                    </button>
                    {dropdownOpen && (
                        <div className={styles.selectDropdown}>
                            {FILTER_OPTIONS.map(opt => (
                                <div
                                    key={opt.value}
                                    className={`${styles.selectOption} ${filter === opt.value ? styles.selectOptionActive : ''}`}
                                    onClick={() => { setFilter(opt.value); setDropdownOpen(false) }}
                                >
                                    {opt.label}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {filter === 'custom' && (
                    <div className={styles.customRange}>
                        <span className={styles.rangeLabel}>GW</span>
                        <div className={styles.customSelect} ref={fromRef}>
                            <button className={styles.selectBtn} onClick={() => setFromOpen(!fromOpen)}>
                                <span>{customFrom}</span>
                                <img src="/bottom.svg" alt="Toggle" className={`${styles.selectArrow} ${fromOpen ? styles.selectArrowOpen : ''}`} />
                            </button>
                            {fromOpen && (
                                <div className={styles.selectDropdown}>
                                    {Array.from({ length: 38 - gwStart + 1 }, (_, i) => gwStart + i).map(g => (
                                        <div
                                            key={g}
                                            className={`${styles.selectOption} ${g === customFrom ? styles.selectOptionActive : ''}`}
                                            onClick={() => { setCustomFrom(g); if (g >= customTo) setCustomTo(Math.min(g + 1, 38)); setFromOpen(false) }}
                                        >
                                            {g}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <span className={styles.rangeSep}>—</span>
                        <div className={styles.customSelect} ref={toRef}>
                            <button className={styles.selectBtn} onClick={() => setToOpen(!toOpen)}>
                                <span>{customTo}</span>
                                <img src="/bottom.svg" alt="Toggle" className={`${styles.selectArrow} ${toOpen ? styles.selectArrowOpen : ''}`} />
                            </button>
                            {toOpen && (
                                <div className={styles.selectDropdown}>
                                    {Array.from({ length: 38 - customFrom }, (_, i) => customFrom + 1 + i).map(g => (
                                        <div
                                            key={g}
                                            className={`${styles.selectOption} ${g === customTo ? styles.selectOptionActive : ''}`}
                                            onClick={() => { setCustomTo(g); if (g < customFrom) setCustomFrom(g); setToOpen(false) }}
                                        >
                                            {g}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <div className={styles.venueFilter}>
                    {['all', 'home', 'away'].map(v => (
                        <button
                            key={v}
                            className={venueFilter === v ? styles.venueActive : styles.venueBtn}
                            onClick={() => setVenueFilter(v)}
                        >
                            {v === 'all' ? 'All' : v === 'home' ? 'Home' : 'Away'}
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.fixtureTable}>
                    <thead>
                        <tr>
                            <th>Team</th>
                            {gwRange.map(gw => <th key={gw}>GW{gw}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {teamFixtures.map(row => (
                            <tr key={row.team.id}>
                                <td>
                                    <div className={styles.teamRow}>
                                        <img
                                            src={getTeamBadgeUrl(row.team.code)}
                                            alt={row.team.short_name}
                                            className={styles.teamBadgeSmall}
                                        />
                                        {row.team.short_name}
                                    </div>
                                </td>
                                {gwRange.map(gw => {
                                    const matches = row[`gw${gw}`] || []
                                    const totalMatches = row[`gw${gw}_total`] || 0
                                    const isDGW = totalMatches >= 2
                                    const isBGW = totalMatches === 0
                                    if (matches.length === 0) {
                                        return (
                                            <td key={gw}>
                                                {isBGW ? (
                                                    <span className={styles.bgwBadge}>BGW</span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                                                )}
                                            </td>
                                        )
                                    }
                                    return (
                                        <td key={gw}>

                                            {matches.map((m, i) => (
                                                <div
                                                    key={i}
                                                    className={styles.fdrCell}
                                                    style={{ background: getDifficultyColor(m.difficulty), marginBottom: matches.length > 1 ? 2 : 0 }}
                                                >
                                                    {m.opponent} ({m.isHome ? 'H' : 'A'})
                                                </div>
                                            ))}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
