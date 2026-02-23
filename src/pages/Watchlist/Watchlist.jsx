import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFpl } from '../../hooks/useFplData'
import { getTeamBadgeUrl, getPositionShort, getDifficultyColor } from '../../services/fplApi'
import styles from './Watchlist.module.css'

function useWatchlist() {
    const [ids, setIds] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('watchlist') || '[]')
        } catch { return [] }
    })

    const save = (newIds) => {
        setIds(newIds)
        localStorage.setItem('watchlist', JSON.stringify(newIds))
    }

    const add = (id) => { if (!ids.includes(id)) save([...ids, id]) }
    const remove = (id) => save(ids.filter(i => i !== id))
    const has = (id) => ids.includes(id)

    return { ids, add, remove, has }
}

export default function Watchlist() {
    const { players, fixtures, teams, currentGw, loading, getTeam } = useFpl()
    const navigate = useNavigate()
    const watchlist = useWatchlist()
    const [search, setSearch] = useState('')
    const [posFilter, setPosFilter] = useState('ALL')

    const watchedPlayers = useMemo(() => {
        if (!players.length) return []
        return watchlist.ids
            .map(id => players.find(p => p.id === id))
            .filter(Boolean)
            .filter(p => posFilter === 'ALL' || getPositionShort(p.element_type) === posFilter)
            .map(p => {
                if (!fixtures.length || !currentGw) return p
                const upcoming = fixtures
                    .filter(f => f.event >= currentGw.id && f.event <= currentGw.id + 2 && (f.team_h === p.team || f.team_a === p.team))
                    .map(f => {
                        const isHome = f.team_h === p.team
                        return {
                            difficulty: isHome ? f.team_h_difficulty : f.team_a_difficulty,
                            opponent: teams.find(t => t.id === (isHome ? f.team_a : f.team_h))?.short_name || '?',
                            isHome
                        }
                    })
                return { ...p, upcoming }
            })
    }, [players, watchlist.ids, posFilter, fixtures, teams, currentGw])

    const searchResults = useMemo(() => {
        if (!search || search.length < 2 || !players.length) return []
        const q = search.toLowerCase()
        return players
            .filter(p => p.web_name.toLowerCase().includes(q) || p.first_name?.toLowerCase().includes(q) || p.second_name?.toLowerCase().includes(q))
            .filter(p => !watchlist.has(p.id))
            .slice(0, 10)
    }, [search, players, watchlist])

    const posClass = (t) => {
        const map = { 1: styles.posGKP, 2: styles.posDEF, 3: styles.posMID, 4: styles.posFWD }
        return map[t] || styles.posTag
    }

    const formClass = (f) => {
        const v = parseFloat(f)
        if (v >= 6) return styles.formHigh
        if (v >= 3.5) return styles.formMid
        return styles.formLow
    }

    const statusClass = (s) => {
        const map = { a: styles.statusAvail, i: styles.statusInjured, d: styles.statusDoubtful }
        return map[s] || styles.statusUnavail
    }

    const statusLabel = (s) => {
        const map = { a: 'Available', i: 'Injured', d: 'Doubtful' }
        return map[s] || 'Unavail'
    }

    if (loading) {
        return (
            <div className={styles.page}>
                <h1 className="page-title">Watchlist</h1>
                <div className="shimmer" style={{ height: 400, borderRadius: 'var(--radius)' }} />
            </div>
        )
    }

    return (
        <div className={styles.page}>
            <h1 className="page-title">Watchlist</h1>
            <p className={styles.subtitle}>Pantau pemain yang kamu incar — data tersimpan di browser</p>

            {/* Add Player */}
            <div className={styles.addPanel}>
                <div className={styles.addTitle}>➕ Tambah Pemain</div>
                <input
                    className={styles.searchInput}
                    placeholder="Cari pemain untuk ditambahkan..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: '100%', marginBottom: searchResults.length > 0 ? '0.5rem' : 0 }}
                />
                {searchResults.length > 0 && (
                    <div className={styles.addResults}>
                        {searchResults.map(p => {
                            const team = getTeam(p.team)
                            return (
                                <div key={p.id} className={styles.addRow}>
                                    <div className={styles.playerCell}>
                                        {team && <img src={getTeamBadgeUrl(team.code)} alt="" className={styles.teamBadge} />}
                                        <div>
                                            <span style={{ fontWeight: 600 }}>{p.web_name}</span>
                                            <span className={styles.addPlayerInfo}>
                                                {team?.short_name} · {getPositionShort(p.element_type)} · £{(p.now_cost / 10).toFixed(1)}m
                                            </span>
                                        </div>
                                    </div>
                                    <button className={styles.addBtn} onClick={() => { watchlist.add(p.id); setSearch('') }}>
                                        + Add
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Filters */}
            {watchedPlayers.length > 0 && (
                <div className={styles.controls}>
                    {['ALL', 'GKP', 'DEF', 'MID', 'FWD'].map(pos => (
                        <button
                            key={pos}
                            className={posFilter === pos ? styles.filterBtnActive : styles.filterBtn}
                            onClick={() => setPosFilter(pos)}
                        >
                            {pos}
                        </button>
                    ))}
                </div>
            )}

            {/* Watchlist Table */}
            {watchedPlayers.length > 0 ? (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Player</th>
                                <th>Pos</th>
                                <th>Price</th>
                                <th>Form</th>
                                <th>Pts</th>
                                <th>Own%</th>
                                <th>Status</th>
                                <th>Next Fixtures</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {watchedPlayers.map(p => {
                                const team = getTeam(p.team)
                                return (
                                    <tr key={p.id}>
                                        <td>
                                            <div className={styles.playerCell}>
                                                {team && <img src={getTeamBadgeUrl(team.code)} alt="" className={styles.teamBadge} />}
                                                <div>
                                                    <div className={styles.playerName} onClick={() => navigate(`/players/${p.id}`)}>
                                                        {p.web_name}
                                                    </div>
                                                    <div className={styles.playerTeam}>{team?.short_name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className={posClass(p.element_type)}>{getPositionShort(p.element_type)}</span></td>
                                        <td>£{(p.now_cost / 10).toFixed(1)}m</td>
                                        <td><span className={formClass(p.form)}>{p.form}</span></td>
                                        <td style={{ fontWeight: 700 }}>{p.total_points}</td>
                                        <td>{p.selected_by_percent}%</td>
                                        <td>
                                            <span className={statusClass(p.status)}>
                                                {statusLabel(p.status)}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles.fdrRow}>
                                                {(p.upcoming || []).map((f, j) => (
                                                    <span
                                                        key={j}
                                                        className={styles.fdrCell}
                                                        style={{ background: getDifficultyColor(f.difficulty) }}
                                                    >
                                                        {f.opponent}({f.isHome ? 'H' : 'A'})
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <button className={styles.removeBtn} onClick={() => watchlist.remove(p.id)} title="Remove">
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className={styles.empty}>
                    <div className={styles.emptyIcon}>👀</div>
                    <div>Belum ada pemain di watchlist</div>
                    <div className={styles.emptyHint}>Cari dan tambah pemain yang ingin kamu pantau</div>
                </div>
            )}
        </div>
    )
}
