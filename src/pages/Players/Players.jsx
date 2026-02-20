import { useState, useMemo } from 'react'
import { useFpl } from '../../hooks/useFplData'
import { getTeamBadgeUrl, getPositionShort } from '../../services/fplApi'
import styles from './Players.module.css'

const PER_PAGE = 25

export default function Players() {
    const { players, teams, loading, getTeam } = useFpl()
    const [search, setSearch] = useState('')
    const [posFilter, setPosFilter] = useState('ALL')
    const [teamFilter, setTeamFilter] = useState('ALL')
    const [sortKey, setSortKey] = useState('total_points')
    const [sortDir, setSortDir] = useState('desc')
    const [page, setPage] = useState(0)

    const handleSort = (key) => {
        if (sortKey === key) {
            setSortDir(d => d === 'desc' ? 'asc' : 'desc')
        } else {
            setSortKey(key)
            setSortDir('desc')
        }
        setPage(0)
    }

    const filtered = useMemo(() => {
        return players
            .filter(p => {
                if (posFilter !== 'ALL' && getPositionShort(p.element_type) !== posFilter) return false
                if (teamFilter !== 'ALL' && p.team !== Number(teamFilter)) return false
                if (search) {
                    const q = search.toLowerCase()
                    return p.web_name.toLowerCase().includes(q) ||
                        p.first_name.toLowerCase().includes(q) ||
                        p.second_name.toLowerCase().includes(q)
                }
                return true
            })
            .sort((a, b) => {
                let av = a[sortKey], bv = b[sortKey]
                if (typeof av === 'string') av = parseFloat(av) || 0
                if (typeof bv === 'string') bv = parseFloat(bv) || 0
                return sortDir === 'desc' ? bv - av : av - bv
            })
    }, [players, search, posFilter, teamFilter, sortKey, sortDir])

    const totalPages = Math.ceil(filtered.length / PER_PAGE)
    const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

    const SortTh = ({ label, field }) => (
        <th onClick={() => handleSort(field)}>
            {label}
            {sortKey === field && (
                <span className={styles.sortIcon}>{sortDir === 'desc' ? '▼' : '▲'}</span>
            )}
        </th>
    )

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

    if (loading) {
        return (
            <div className={styles.page}>
                <h1 className="page-title">Player Stats</h1>
                <div className="shimmer" style={{ height: 500, borderRadius: 'var(--radius)' }} />
            </div>
        )
    }

    return (
        <div className={styles.page}>
            <h1 className="page-title">Player Stats</h1>

            <div className={styles.controls}>
                <input
                    className={styles.searchInput}
                    placeholder="Search player..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(0) }}
                />
                {['ALL', 'GKP', 'DEF', 'MID', 'FWD'].map(pos => (
                    <button
                        key={pos}
                        className={posFilter === pos ? styles.filterBtnActive : styles.filterBtn}
                        onClick={() => { setPosFilter(pos); setPage(0) }}
                    >
                        {pos}
                    </button>
                ))}
                <select
                    className={styles.select}
                    value={teamFilter}
                    onChange={e => { setTeamFilter(e.target.value); setPage(0) }}
                >
                    <option value="ALL">All Teams</option>
                    {teams.sort((a, b) => a.name.localeCompare(b.name)).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </div>

            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Player</th>
                        <SortTh label="Pos" field="element_type" />
                        <SortTh label="Price" field="now_cost" />
                        <SortTh label="Pts" field="total_points" />
                        <SortTh label="Form" field="form" />
                        <SortTh label="GS" field="goals_scored" />
                        <SortTh label="A" field="assists" />
                        <SortTh label="CS" field="clean_sheets" />
                        <SortTh label="Mins" field="minutes" />
                        <SortTh label="Own%" field="selected_by_percent" />
                    </tr>
                </thead>
                <tbody>
                    {paginated.map((p, i) => {
                        const team = getTeam(p.team)
                        return (
                            <tr key={p.id}>
                                <td style={{ color: 'var(--text-muted)' }}>{page * PER_PAGE + i + 1}</td>
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
                                <td style={{ fontWeight: 700 }}>{p.total_points}</td>
                                <td><span className={formClass(p.form)}>{p.form}</span></td>
                                <td>{p.goals_scored}</td>
                                <td>{p.assists}</td>
                                <td>{p.clean_sheets}</td>
                                <td>{p.minutes}</td>
                                <td>{p.selected_by_percent}%</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>

            <div className={styles.paginationRow}>
                <span>{filtered.length} players found</span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button className={styles.pageBtn} onClick={() => setPage(p => p - 1)} disabled={page === 0}>◀ Prev</button>
                    <span>Page {page + 1} of {totalPages}</span>
                    <button className={styles.pageBtn} onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Next ▶</button>
                </div>
            </div>
        </div>
    )
}
