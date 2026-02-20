import { useState, useMemo } from 'react'
import { useFpl } from '../../hooks/useFplData'
import { getTeamBadgeUrl, getDifficultyColor } from '../../services/fplApi'
import styles from './Fixtures.module.css'

export default function Fixtures() {
    const { fixtures, teams, currentGw, loading } = useFpl()
    const startGwDefault = currentGw?.id || 1
    const [startGw, setStartGw] = useState(startGwDefault)
    const span = 8

    const gwRange = useMemo(() => {
        const gws = []
        for (let i = startGw; i < startGw + span && i <= 38; i++) gws.push(i)
        return gws
    }, [startGw])

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
                <div className={styles.gwRange}>
                    <label>From GW:</label>
                    <select value={startGw} onChange={e => setStartGw(Number(e.target.value))}>
                        {Array.from({ length: 38 }, (_, i) => i + 1).map(g => (
                            <option key={g} value={g}>GW{g}</option>
                        ))}
                    </select>
                </div>
            </div>

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
    )
}
