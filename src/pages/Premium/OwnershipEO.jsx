import { useMemo, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFpl } from '../../hooks/useFplData'
import { getTeamBadgeUrl, getPositionShort } from '../../services/fplApi'
import styles from './Premium.module.css'

const PER_PAGE = 25

export default function OwnershipEO() {
    const { players, teams, loading, getTeam } = useFpl()
    const navigate = useNavigate()
    const [search, setSearch] = useState('')
    const [posFilter, setPosFilter] = useState('ALL')
    const [teamFilter, setTeamFilter] = useState('ALL')
    const [sortKey, setSortKey] = useState('selected_by_percent')
    const [sortDir, setSortDir] = useState('desc')
    const [page, setPage] = useState(0)
    const [teamDropdownOpen, setTeamDropdownOpen] = useState(false)
    const teamDropdownRef = useRef(null)

    useEffect(() => {
        function handleClick(e) {
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

    const handleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
        else { setSortKey(key); setSortDir('desc') }
        setPage(0)
    }

    const ownershipData = useMemo(() => {
        return players
            .filter(p => {
                if (parseFloat(p.selected_by_percent) < 1) return false
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
            .map(p => {
                const ownership = parseFloat(p.selected_by_percent)
                const captaincyRate = ownership > 30 ? 0.3 : ownership > 15 ? 0.15 : 0.05
                const eo = ownership * (1 + captaincyRate)
                const danger = eo > 50 ? 'High' : eo > 25 ? 'Medium' : 'Low'

                return {
                    ...p,
                    ownership,
                    eo: eo.toFixed(1),
                    captaincyRate: (captaincyRate * 100).toFixed(0),
                    danger,
                    ppg: p.total_points > 0 && p.minutes > 0
                        ? (p.total_points / Math.max(1, Math.floor(p.minutes / 90))).toFixed(1)
                        : '0.0',
                }
            })
            .sort((a, b) => {
                let av = parseFloat(a[sortKey]) || 0
                let bv = parseFloat(b[sortKey]) || 0
                return sortDir === 'desc' ? bv - av : av - bv
            })
    }, [players, posFilter, teamFilter, sortKey, sortDir, search])

    const totalPages = Math.ceil(ownershipData.length / PER_PAGE)
    const paginated = ownershipData.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

    const posClass = (t) => {
        const map = { 1: styles.posGKP, 2: styles.posDEF, 3: styles.posMID, 4: styles.posFWD }
        return map[t] || styles.posTag
    }

    const dangerClass = (d) => {
        if (d === 'High') return styles.dangerHigh
        if (d === 'Medium') return styles.dangerMedium
        return styles.dangerLow
    }

    const SortTh = ({ label, field }) => (
        <th onClick={() => handleSort(field)} style={{ cursor: 'pointer' }}>
            {label}
            {sortKey === field && <span className={styles.sortArrow}>{sortDir === 'desc' ? '▼' : '▲'}</span>}
        </th>
    )

    if (loading) {
        return (
            <div className={styles.page}>
                <h1 className="page-title">Ownership & EO</h1>
                <div className="shimmer" style={{ height: 400, borderRadius: 'var(--radius)' }} />
            </div>
        )
    }

    return (
        <div className={styles.page}>
            <div className={styles.premiumHeader}>
                <h1 className="page-title">Ownership & EO</h1>
                <span className={styles.premiumBadge}>PREMIUM</span>
            </div>
            <p className={styles.subtitle}>
                Track player ownership and estimated effective ownership — high EO players you don't own = rank risk
            </p>

            <div className={styles.controls}>
                <div className={styles.searchRow}>
                    <input
                        className={styles.searchInput}
                        placeholder="Search player..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0) }}
                    />
                </div>
                <div className={styles.filterRow}>
                    {['ALL', 'GKP', 'DEF', 'MID', 'FWD'].map(pos => (
                        <button
                            key={pos}
                            className={posFilter === pos ? styles.filterBtnActive : styles.filterBtn}
                            onClick={() => { setPosFilter(pos); setPage(0) }}
                        >
                            {pos}
                        </button>
                    ))}
                    <div className={styles.customSelect} ref={teamDropdownRef}>
                        <button className={styles.selectBtn} onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}>
                            <span>{selectedTeamLabel}</span>
                            <img src="/bottom.svg" alt="Toggle" className={`${styles.selectArrow} ${teamDropdownOpen ? styles.selectArrowOpen : ''}`} />
                        </button>
                        {teamDropdownOpen && (
                            <div className={styles.selectDropdown}>
                                <div
                                    className={`${styles.selectOption} ${teamFilter === 'ALL' ? styles.selectOptionActive : ''}`}
                                    onClick={() => { setTeamFilter('ALL'); setPage(0); setTeamDropdownOpen(false) }}
                                >
                                    All Teams
                                </div>
                                {sortedTeams.map(t => (
                                    <div
                                        key={t.id}
                                        className={`${styles.selectOption} ${teamFilter === String(t.id) ? styles.selectOptionActive : ''}`}
                                        onClick={() => { setTeamFilter(String(t.id)); setPage(0); setTeamDropdownOpen(false) }}
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
                            <SortTh label="Own%" field="selected_by_percent" />
                            <SortTh label="Est. EO%" field="eo" />
                            <th>Cap. Rate</th>
                            <SortTh label="Form" field="form" />
                            <SortTh label="Pts" field="total_points" />
                            <th>Price</th>
                            <th>Risk</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map((p, i) => {
                            const team = getTeam(p.team)
                            return (
                                <tr key={p.id} onClick={() => navigate(`/players/${p.id}`)}>
                                    <td className={styles.textMuted}>{page * PER_PAGE + i + 1}</td>
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
                                    <td className={styles.textBold}>{p.selected_by_percent}%</td>
                                    <td className={styles.textAccent}>{p.eo}%</td>
                                    <td className={styles.textSecondary}>~{p.captaincyRate}%</td>
                                    <td className={
                                        parseFloat(p.form) >= 6 ? styles.formHigh :
                                            parseFloat(p.form) >= 3.5 ? styles.formMid :
                                                styles.formLow
                                    }>{p.form}</td>
                                    <td className={styles.textBold}>{p.total_points}</td>
                                    <td>£{(p.now_cost / 10).toFixed(1)}m</td>
                                    <td><span className={dangerClass(p.danger)}>{p.danger}</span></td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <div className={styles.paginationRow}>
                <span>{ownershipData.length} players found</span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button className={styles.pageBtn} onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                        <img src="/left.svg" alt="" className={styles.pageArrow} />
                        Prev
                    </button>
                    <span>Page {page + 1} of {totalPages}</span>
                    <button className={styles.pageBtn} onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
                        Next
                        <img src="/right.svg" alt="" className={styles.pageArrow} />
                    </button>
                </div>
            </div>
        </div>
    )
}
