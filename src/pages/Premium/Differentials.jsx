import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFpl } from '../../hooks/useFplData'
import { getTeamBadgeUrl, getPositionShort, getDifficultyColor } from '../../services/fplApi'
import styles from './Premium.module.css'

export default function Differentials() {
    const { players, fixtures, teams, currentGw, loading, getTeam } = useFpl()
    const navigate = useNavigate()
    const [posFilter, setPosFilter] = useState('ALL')
    const [maxOwnership, setMaxOwnership] = useState(10)
    const [search, setSearch] = useState('')

    const differentials = useMemo(() => {
        if (!players.length || !fixtures.length || !currentGw) return []
        const gwStart = currentGw.id

        return players
            .filter(p => {
                if (parseFloat(p.selected_by_percent) >= maxOwnership) return false
                if (parseFloat(p.form) < 4.0) return false
                if (p.minutes < 200) return false
                if (posFilter !== 'ALL' && getPositionShort(p.element_type) !== posFilter) return false
                if (search && !p.web_name.toLowerCase().includes(search.toLowerCase())) return false
                return true
            })
            .map(p => {
                const upcoming = fixtures
                    .filter(f => f.event >= gwStart && f.event <= gwStart + 4 && (f.team_h === p.team || f.team_a === p.team))
                    .map(f => {
                        const isHome = f.team_h === p.team
                        return {
                            gw: f.event,
                            difficulty: isHome ? f.team_h_difficulty : f.team_a_difficulty,
                            isHome,
                            opponent: teams.find(t => t.id === (isHome ? f.team_a : f.team_h))?.short_name || '?',
                        }
                    })
                const avgFDR = upcoming.length > 0
                    ? (upcoming.reduce((s, f) => s + f.difficulty, 0) / upcoming.length).toFixed(1)
                    : 5
                return { ...p, upcoming, avgFDR: parseFloat(avgFDR) }
            })
            .sort((a, b) => a.avgFDR - b.avgFDR || parseFloat(b.form) - parseFloat(a.form))
    }, [players, fixtures, teams, currentGw, posFilter, maxOwnership, search])

    const posClass = (t) => {
        const map = { 1: styles.posGKP, 2: styles.posDEF, 3: styles.posMID, 4: styles.posFWD }
        return map[t] || styles.posTag
    }

    const fdrClass = (val) => val <= 2.5 ? styles.fdrGood : val <= 3.5 ? styles.fdrMid : styles.fdrBad

    if (loading) {
        return (
            <div className={styles.page}>
                <h1 className="page-title">Differentials Finder</h1>
                <div className="shimmer" style={{ height: 400, borderRadius: 'var(--radius)' }} />
            </div>
        )
    }

    return (
        <div className={styles.page}>
            <div className={styles.premiumHeader}>
                <h1 className="page-title">Differentials Finder</h1>
                <span className={styles.premiumBadge}>PREMIUM</span>
            </div>
            <p className={styles.subtitle}>
                Low-ownership players with high form and favorable upcoming fixtures
            </p>

            <div className={styles.toolbar}>
                <input
                    className={styles.searchInput}
                    type="text"
                    placeholder="Search player..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <div className={styles.filters}>
                    {['ALL', 'GKP', 'DEF', 'MID', 'FWD'].map(pos => (
                        <button
                            key={pos}
                            className={posFilter === pos ? styles.filterBtnActive : styles.filterBtn}
                            onClick={() => setPosFilter(pos)}
                        >
                            {pos}
                        </button>
                    ))}
                    <button
                        className={maxOwnership === 5 ? styles.filterBtnActive : styles.filterBtn}
                        onClick={() => setMaxOwnership(maxOwnership === 5 ? 10 : 5)}
                    >
                        {'<'}{maxOwnership}% owned
                    </button>
                </div>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Player</th>
                            <th>Pos</th>
                            <th>Price</th>
                            <th>Form</th>
                            <th>Own%</th>
                            <th>Avg FDR</th>
                            <th>Next 5 Fixtures</th>
                        </tr>
                    </thead>
                    <tbody>
                        {differentials.map((p, i) => {
                            const team = getTeam(p.team)
                            return (
                                <tr key={p.id} onClick={() => navigate(`/players/${p.id}`)} style={{ cursor: 'pointer' }}>
                                    <td className={styles.textMuted}>{i + 1}</td>
                                    <td>
                                        <div className={styles.playerCell}>
                                            {team && <img src={getTeamBadgeUrl(team.code)} alt="" className={styles.teamBadge} />}
                                            <div>
                                                <div className={styles.playerName}>{p.web_name}</div>
                                                <div className={styles.playerTeam}>{team?.short_name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span className={posClass(p.element_type)}>{getPositionShort(p.element_type)}</span></td>
                                    <td>£{(p.now_cost / 10).toFixed(1)}m</td>
                                    <td className={styles.formHigh}>{p.form}</td>
                                    <td>{p.selected_by_percent}%</td>
                                    <td className={fdrClass(p.avgFDR)}>{p.avgFDR}</td>
                                    <td>
                                        <div className={styles.fdrRow}>
                                            {p.upcoming.map((f, j) => (
                                                <span key={j} className={styles.fdrCell} style={{ background: getDifficultyColor(f.difficulty) }}>
                                                    {f.opponent} ({f.isHome ? 'H' : 'A'})
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            {differentials.length === 0 && (
                <div className={styles.emptyState}>
                    No differentials found with current filters
                </div>
            )}
        </div>
    )
}
