import { useMemo, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFpl } from '../../hooks/useFplData'
import { getTeamBadgeUrl, getPositionShort, normalizeText, getStatusInfo } from '../../services/fplApi'
import styles from './Premium.module.css'

const STATUS_OPTIONS = [
    { key: 'all', label: 'All Status' },
    { key: 'i', label: 'Injured' },
    { key: 'd', label: 'Doubtful' },
    { key: 's', label: 'Suspended' },
    { key: 'u', label: 'Unavailable' },
]

export default function InjuryAlerts() {
    const { players, teams, loading, getTeam } = useFpl()
    const navigate = useNavigate()
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [posFilter, setPosFilter] = useState('ALL')
    const [teamFilter, setTeamFilter] = useState('ALL')
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
    const [teamDropdownOpen, setTeamDropdownOpen] = useState(false)
    const statusDropdownRef = useRef(null)
    const teamDropdownRef = useRef(null)

    useEffect(() => {
        function handleClick(e) {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) {
                setStatusDropdownOpen(false)
            }
            if (teamDropdownRef.current && !teamDropdownRef.current.contains(e.target)) {
                setTeamDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const sortedTeams = useMemo(() => {
        return [...teams].sort((a, b) => a.name.localeCompare(b.name))
    }, [teams])

    const selectedTeamLabel = teamFilter === 'ALL'
        ? 'All Teams'
        : teams.find(t => t.id === Number(teamFilter))?.name || 'All Teams'

    const statusMap = {
        i: { label: 'Injured', class: styles.statusInjured },
        s: { label: 'Suspended', class: styles.statusSuspended },
        d: { label: 'Doubtful', class: styles.statusDoubtful },
        u: { label: 'Unavailable', class: styles.statusUnavail },
        n: { label: 'Not Available', class: styles.statusUnavail },
    }

    const unavailable = useMemo(() => {
        return players
            .filter(p => {
                if (p.status === 'a') return false
                if (statusFilter !== 'all' && p.status !== statusFilter) return false
                if (posFilter !== 'ALL' && getPositionShort(p.element_type) !== posFilter) return false
                if (teamFilter !== 'ALL' && p.team !== Number(teamFilter)) return false
                if (search) {
                    const q = normalizeText(search)
                    return normalizeText(p.web_name).includes(q)
                }
                return true
            })
            .sort((a, b) => {
                const priority = { i: 0, s: 1, d: 2, u: 3, n: 4 }
                if (priority[a.status] !== priority[b.status]) return priority[a.status] - priority[b.status]
                return parseFloat(b.selected_by_percent) - parseFloat(a.selected_by_percent)
            })
    }, [players, statusFilter, posFilter, teamFilter, search])

    const counts = useMemo(() => {
        const c = { all: 0, i: 0, s: 0, d: 0, u: 0, n: 0 }
        players.forEach(p => {
            if (p.status !== 'a') {
                c.all++
                c[p.status] = (c[p.status] || 0) + 1
            }
        })
        return c
    }, [players])

    const selectedStatusLabel = statusFilter === 'all'
        ? `All Status (${counts.all})`
        : `${STATUS_OPTIONS.find(o => o.key === statusFilter)?.label} (${statusFilter === 'u' ? counts.u + (counts.n || 0) : counts[statusFilter] || 0})`

    const posClass = (t) => {
        const map = { 1: styles.posGKP, 2: styles.posDEF, 3: styles.posMID, 4: styles.posFWD }
        return map[t] || styles.posTag
    }

    const chanceClass = (v) => {
        if (v === null || v === undefined) return styles.textMuted
        if (v >= 75) return styles.chanceHigh
        if (v >= 50) return styles.chanceMid
        if (v >= 25) return styles.chanceLow
        return styles.chanceNone
    }

    if (loading) {
        return (
            <div className={styles.page}>
                <h1 className="page-title">Injury & Suspension Alerts</h1>
                <div className="shimmer" style={{ height: 400, borderRadius: 'var(--radius)' }} />
            </div>
        )
    }

    return (
        <div className={styles.page}>
            <div className={styles.premiumHeader}>
                <h1 className="page-title">Injury & Suspension Alerts</h1>
                <span className={styles.premiumBadge}>PREMIUM</span>
            </div>
            <p className={styles.subtitle}>Players currently unavailable for selection</p>

            <div className={styles.controls}>
                <div className={styles.searchRow}>
                    <input
                        className={styles.searchInput}
                        placeholder="Search player..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className={styles.filterRow}>
                    {['ALL', 'GKP', 'DEF', 'MID', 'FWD'].map(pos => (
                        <button
                            key={pos}
                            className={posFilter === pos ? styles.filterBtnActive : styles.filterBtn}
                            onClick={() => setPosFilter(pos)}
                        >
                            {pos}
                        </button>
                    ))}
                    <div className={styles.customSelect} ref={statusDropdownRef}>
                        <button className={styles.selectBtn} onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}>
                            <span>{selectedStatusLabel}</span>
                            <img src="/bottom.svg" alt="Toggle" className={`${styles.selectArrow} ${statusDropdownOpen ? styles.selectArrowOpen : ''}`} />
                        </button>
                        {statusDropdownOpen && (
                            <div className={styles.selectDropdown}>
                                {STATUS_OPTIONS.map(opt => (
                                    <div
                                        key={opt.key}
                                        className={`${styles.selectOption} ${statusFilter === opt.key ? styles.selectOptionActive : ''}`}
                                        onClick={() => { setStatusFilter(opt.key); setStatusDropdownOpen(false) }}
                                    >
                                        {opt.label} ({opt.key === 'all' ? counts.all : opt.key === 'u' ? counts.u + (counts.n || 0) : counts[opt.key] || 0})
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className={styles.customSelect} ref={teamDropdownRef}>
                        <button className={styles.selectBtn} onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}>
                            <span>{selectedTeamLabel}</span>
                            <img src="/bottom.svg" alt="Toggle" className={`${styles.selectArrow} ${teamDropdownOpen ? styles.selectArrowOpen : ''}`} />
                        </button>
                        {teamDropdownOpen && (
                            <div className={styles.selectDropdown}>
                                <div
                                    className={`${styles.selectOption} ${teamFilter === 'ALL' ? styles.selectOptionActive : ''}`}
                                    onClick={() => { setTeamFilter('ALL'); setTeamDropdownOpen(false) }}
                                >
                                    All Teams
                                </div>
                                {sortedTeams.map(t => (
                                    <div
                                        key={t.id}
                                        className={`${styles.selectOption} ${teamFilter === String(t.id) ? styles.selectOptionActive : ''}`}
                                        onClick={() => { setTeamFilter(String(t.id)); setTeamDropdownOpen(false) }}
                                    >
                                        {t.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Player</th>
                            <th>Pos</th>
                            <th>Status</th>
                            <th>Chance</th>
                            <th>News</th>
                            <th>Own%</th>
                            <th>Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {unavailable.map((p, i) => {
                            const team = getTeam(p.team)
                            const st = statusMap[p.status] || statusMap.u
                            const chance = p.chance_of_playing_next_round
                            return (
                                <tr key={p.id} onClick={() => navigate(`/players/${p.id}`)}>
                                    <td className={styles.textMuted}>{i + 1}</td>
                                    <td>
                                        <div className={styles.playerCell}>
                                            {team && <img src={getTeamBadgeUrl(team.code)} alt="" className={styles.teamBadge} />}
                                            <div>
                                                <div className={styles.playerName}>{p.web_name}{getStatusInfo(p.status) && <span className="status-dot" style={{ background: getStatusInfo(p.status).color }} title={getStatusInfo(p.status).label} />}</div>
                                                <div className={styles.playerTeam}>{team?.short_name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span className={posClass(p.element_type)}>{getPositionShort(p.element_type)}</span></td>
                                    <td><span className={st.class}>{st.label}</span></td>
                                    <td className={chanceClass(chance)}>
                                        {chance !== null && chance !== undefined ? `${chance}%` : '—'}
                                    </td>
                                    <td className={styles.newsCell}>
                                        {p.news || '—'}
                                    </td>
                                    <td>{p.selected_by_percent}%</td>
                                    <td>£{(p.now_cost / 10).toFixed(1)}m</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
