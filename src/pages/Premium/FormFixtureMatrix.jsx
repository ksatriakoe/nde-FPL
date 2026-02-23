import { useMemo, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFpl } from '../../hooks/useFplData'
import { getTeamBadgeUrl, getPositionShort, getDifficultyColor } from '../../services/fplApi'
import styles from './Premium.module.css'

const GW_OPTIONS = [
    { value: 3, label: 'Next 3 GWs' },
    { value: 5, label: 'Next 5 GWs' },
    { value: 8, label: 'Next 8 GWs' },
]

const PER_PAGE = 25

export default function FormFixtureMatrix() {
    const { players, fixtures, teams, currentGw, loading, getTeam } = useFpl()
    const navigate = useNavigate()
    const [search, setSearch] = useState('')
    const [posFilter, setPosFilter] = useState('ALL')
    const [gwCount, setGwCount] = useState(5)
    const [gwDropdownOpen, setGwDropdownOpen] = useState(false)
    const gwDropdownRef = useRef(null)
    const [page, setPage] = useState(0)

    useEffect(() => {
        function handleClick(e) {
            if (gwDropdownRef.current && !gwDropdownRef.current.contains(e.target)) {
                setGwDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const gwRange = useMemo(() => {
        if (!currentGw) return []
        const start = currentGw.id
        return Array.from({ length: gwCount }, (_, i) => start + i).filter(g => g <= 38)
    }, [currentGw, gwCount])

    const matrixData = useMemo(() => {
        if (!players.length || !fixtures.length || !currentGw) return []

        return players
            .filter(p => {
                if (parseFloat(p.form) < 3.0) return false
                if (p.minutes < 200) return false
                if (posFilter !== 'ALL' && getPositionShort(p.element_type) !== posFilter) return false
                if (search) {
                    const q = search.toLowerCase()
                    return p.web_name.toLowerCase().includes(q) ||
                        p.first_name.toLowerCase().includes(q) ||
                        p.second_name.toLowerCase().includes(q)
                }
                return true
            })
            .map(p => {
                const gwFixtures = {}
                gwRange.forEach(gw => {
                    const matches = fixtures.filter(f => f.event === gw && (f.team_h === p.team || f.team_a === p.team))
                    gwFixtures[gw] = matches.map(f => {
                        const isHome = f.team_h === p.team
                        return {
                            difficulty: isHome ? f.team_h_difficulty : f.team_a_difficulty,
                            opponent: teams.find(t => t.id === (isHome ? f.team_a : f.team_h))?.short_name || '?',
                            isHome,
                        }
                    })
                })

                const allDiffs = Object.values(gwFixtures).flat().map(f => f.difficulty)
                const avgFDR = allDiffs.length > 0 ? allDiffs.reduce((a, b) => a + b, 0) / allDiffs.length : 5
                const score = parseFloat(p.form) * (5 - avgFDR + 1)

                return { ...p, gwFixtures, avgFDR, score }
            })
            .sort((a, b) => b.score - a.score)
    }, [players, fixtures, teams, currentGw, posFilter, gwRange, search])

    const totalPages = Math.ceil(matrixData.length / PER_PAGE)
    const paginated = matrixData.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

    const posClass = (t) => {
        const map = { 1: styles.posGKP, 2: styles.posDEF, 3: styles.posMID, 4: styles.posFWD }
        return map[t] || styles.posTag
    }

    const selectedGwLabel = GW_OPTIONS.find(o => o.value === gwCount)?.label || `${gwCount} GWs`

    if (loading) {
        return (
            <div className={styles.page}>
                <h1 className="page-title">Form × Fixture Matrix</h1>
                <div className="shimmer" style={{ height: 400, borderRadius: 'var(--radius)' }} />
            </div>
        )
    }

    return (
        <div className={styles.page}>
            <div className={styles.premiumHeader}>
                <h1 className="page-title">Form × Fixture Matrix</h1>
                <span className={styles.premiumBadge}>PREMIUM</span>
            </div>
            <p className={styles.subtitle}>
                Players ranked by form combined with fixture difficulty — find who has both great form AND easy fixtures
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
                    <div className={styles.customSelect} ref={gwDropdownRef}>
                        <button className={styles.selectBtn} onClick={() => setGwDropdownOpen(!gwDropdownOpen)}>
                            <span>{selectedGwLabel}</span>
                            <img src="/bottom.svg" alt="Toggle" className={`${styles.selectArrow} ${gwDropdownOpen ? styles.selectArrowOpen : ''}`} />
                        </button>
                        {gwDropdownOpen && (
                            <div className={styles.selectDropdown}>
                                {GW_OPTIONS.map(opt => (
                                    <div
                                        key={opt.value}
                                        className={`${styles.selectOption} ${gwCount === opt.value ? styles.selectOptionActive : ''}`}
                                        onClick={() => { setGwCount(opt.value); setGwDropdownOpen(false); setPage(0) }}
                                    >
                                        {opt.label}
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
                            <th>Form</th>
                            <th>Score</th>
                            {gwRange.map(gw => <th key={gw}>GW{gw}</th>)}
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
                                    <td className={styles.formHigh}>{p.form}</td>
                                    <td className={styles.textAccent}>{p.score.toFixed(1)}</td>
                                    {gwRange.map(gw => {
                                        const fxs = p.gwFixtures[gw] || []
                                        return (
                                            <td key={gw} style={{ padding: '0.3rem' }}>
                                                {fxs.length === 0 ? (
                                                    <span className={styles.textMuted}>—</span>
                                                ) : (
                                                    fxs.map((f, j) => (
                                                        <div key={j} className={styles.fdrCell} style={{ background: getDifficultyColor(f.difficulty), marginBottom: fxs.length > 1 ? 2 : 0 }}>
                                                            {f.opponent}
                                                        </div>
                                                    ))
                                                )}
                                            </td>
                                        )
                                    })}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <div className={styles.paginationRow}>
                <span>{matrixData.length} players found</span>
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
