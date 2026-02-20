import { useState, useMemo, useRef, useEffect } from 'react'
import { useFpl } from '../../hooks/useFplData'
import { getTeamBadgeUrl, getDifficultyColor } from '../../services/fplApi'
import styles from './Fixtures.module.css'

export default function Fixtures() {
    const { fixtures, teams, currentGw, loading } = useFpl()
    const startGwDefault = currentGw?.id || 1
    const [startGw, setStartGw] = useState(startGwDefault)
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const dropdownRef = useRef(null)
    const span = isMobile ? 2 : 6

    useEffect(() => {
        function handleResize() { setIsMobile(window.innerWidth <= 768) }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        function handleClick(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const gwRange = useMemo(() => {
        const gws = []
        for (let i = startGw; i < startGw + span && i <= 38; i++) gws.push(i)
        return gws
    }, [startGw, span])

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
                })
            })
            return row
        }).sort((a, b) => a.team.name.localeCompare(b.team.name))
    }, [fixtures, teams, gwRange])

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
                        <span>From GW{startGw}</span>
                        <img src="/bottom.svg" alt="Toggle" className={`${styles.selectArrow} ${dropdownOpen ? styles.selectArrowOpen : ''}`} />
                    </button>
                    {dropdownOpen && (
                        <div className={styles.selectDropdown}>
                            {Array.from({ length: 38 }, (_, i) => i + 1).map(g => (
                                <div
                                    key={g}
                                    className={`${styles.selectOption} ${g === startGw ? styles.selectOptionActive : ''}`}
                                    onClick={() => { setStartGw(g); setDropdownOpen(false) }}
                                >
                                    GW{g}
                                </div>
                            ))}
                        </div>
                    )}
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
                                    if (matches.length === 0) {
                                        return <td key={gw} style={{ color: 'var(--text-muted)' }}>-</td>
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
