import { useMemo } from 'react'
import { useFpl } from '../../hooks/useFplData'
import { getTeamBadgeUrl } from '../../services/fplApi'
import styles from './Standings.module.css'

export default function Standings() {
    const { fixtures, teams, loading } = useFpl()

    const table = useMemo(() => {
        if (!fixtures || !teams.length) return []

        const stats = {}
        teams.forEach(t => {
            stats[t.id] = {
                team: t,
                played: 0, won: 0, drawn: 0, lost: 0,
                gf: 0, ga: 0, gd: 0, points: 0,
                form: [],
            }
        })

        const finishedFixtures = fixtures
            .filter(f => f.finished && f.team_h_score !== null)
            .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))

        finishedFixtures.forEach(f => {
            const h = stats[f.team_h], a = stats[f.team_a]
            if (!h || !a) return
            h.played++; a.played++
            h.gf += f.team_h_score; h.ga += f.team_a_score
            a.gf += f.team_a_score; a.ga += f.team_h_score

            if (f.team_h_score > f.team_a_score) {
                h.won++; h.points += 3; a.lost++
                h.form.push('W'); a.form.push('L')
            } else if (f.team_h_score < f.team_a_score) {
                a.won++; a.points += 3; h.lost++
                h.form.push('L'); a.form.push('W')
            } else {
                h.drawn++; a.drawn++; h.points++; a.points++
                h.form.push('D'); a.form.push('D')
            }
        })

        return Object.values(stats)
            .map(s => ({ ...s, gd: s.gf - s.ga, form: s.form.slice(-5) }))
            .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
    }, [fixtures, teams])

    const getZoneClass = (pos) => {
        if (pos <= 4) return styles.champZone
        if (pos === 5) return styles.europaZone
        if (pos === 6 || pos === 7) return styles.confZone
        if (pos >= 18) return styles.relegationZone
        return ''
    }

    if (loading) {
        return (
            <div className={styles.page}>
                <h1 className="page-title">Standings</h1>
                <div className="shimmer" style={{ height: 500, borderRadius: 'var(--radius)' }} />
            </div>
        )
    }

    return (
        <div className={styles.page}>
            <h1 className="page-title">Premier League Standings</h1>

            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Team</th>
                        <th>P</th>
                        <th>W</th>
                        <th>D</th>
                        <th>L</th>
                        <th>GF</th>
                        <th>GA</th>
                        <th>GD</th>
                        <th>Pts</th>
                        <th>Form</th>
                    </tr>
                </thead>
                <tbody>
                    {table.map((row, i) => {
                        const pos = i + 1
                        return (
                            <tr key={row.team.id}>
                                <td className={`${styles.posCol} ${getZoneClass(pos)}`}>{pos}</td>
                                <td>
                                    <div className={styles.teamCell}>
                                        <img src={getTeamBadgeUrl(row.team.code)} alt="" className={styles.badge} />
                                        <span className={styles.teamName}>{row.team.name}</span>
                                    </div>
                                </td>
                                <td>{row.played}</td>
                                <td>{row.won}</td>
                                <td>{row.drawn}</td>
                                <td>{row.lost}</td>
                                <td>{row.gf}</td>
                                <td>{row.ga}</td>
                                <td className={row.gd >= 0 ? styles.gdPos : styles.gdNeg}>
                                    {row.gd > 0 ? '+' : ''}{row.gd}
                                </td>
                                <td className={styles.pts}>{row.points}</td>
                                <td>
                                    <div className={styles.formDots}>
                                        {row.form.map((f, j) => (
                                            <span key={j} className={f === 'W' ? styles.formW : f === 'D' ? styles.formD : styles.formL}>
                                                {f}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>

            <div className={styles.legend}>
                <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: 'var(--blue)' }} />
                    Champions League
                </div>
                <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: 'var(--yellow)' }} />
                    Europa League
                </div>
                <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: 'var(--green)' }} />
                    Conference League
                </div>
                <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: 'var(--red)' }} />
                    Relegation
                </div>
            </div>
        </div>
    )
}
