import { useMemo, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFpl } from '../../hooks/useFplData'
import { getTeamBadgeUrl, getPositionShort, getDifficultyColor, fetchLive, normalizeText, getStatusInfo } from '../../services/fplApi'
import styles from './Premium.module.css'

const GW_OPTIONS = [
    { value: 3, label: 'Next 3 GWs' },
    { value: 5, label: 'Next 5 GWs' },
    { value: 8, label: 'Next 8 GWs' },
]

const PER_PAGE = 25
const THRESHOLD = 7

export default function ConsistencyFixture() {
    const { players, fixtures, teams, currentGw, targetGw, loading, getTeam } = useFpl()
    const navigate = useNavigate()
    const [search, setSearch] = useState('')
    const [posFilter, setPosFilter] = useState('ALL')
    const [teamFilter, setTeamFilter] = useState('ALL')
    const [gwCount, setGwCount] = useState(5)
    const [gwDropdownOpen, setGwDropdownOpen] = useState(false)
    const [teamDropdownOpen, setTeamDropdownOpen] = useState(false)
    const gwDropdownRef = useRef(null)
    const teamDropdownRef = useRef(null)
    const [page, setPage] = useState(0)

    // Per-player consistency map built from GW live data
    const [consistencyMap, setConsistencyMap] = useState(null)
    const [dataLoading, setDataLoading] = useState(true)

    useEffect(() => {
        function handleClick(e) {
            if (gwDropdownRef.current && !gwDropdownRef.current.contains(e.target)) {
                setGwDropdownOpen(false)
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

    const gwRange = useMemo(() => {
        if (!targetGw) return []
        const start = targetGw.id
        return Array.from({ length: gwCount }, (_, i) => start + i).filter(g => g <= 38)
    }, [targetGw, gwCount])

    // Fetch ALL past GW live data in parallel to build consistency map
    // Uses retry logic to ensure all GWs are fetched reliably
    useEffect(() => {
        if (!currentGw || consistencyMap) return

        const pastGWs = []
        for (let i = 1; i <= currentGw.id; i++) pastGWs.push(i)
        if (pastGWs.length === 0) {
            setConsistencyMap({})
            setDataLoading(false)
            return
        }

        let cancelled = false

        async function fetchWithRetry(gw, retries = 4, baseDelay = 400) {
            for (let attempt = 0; attempt < retries; attempt++) {
                try {
                    const data = await fetchLive(gw)
                    if (data?.elements) return data
                } catch {
                    // fall through to retry
                }
                if (attempt < retries - 1) {
                    await new Promise(r => setTimeout(r, baseDelay * (attempt + 1)))
                }
            }
            return null
        }

        ; (async () => {
            try {
                // First pass: fetch in batches of 5
                const results = new Array(pastGWs.length).fill(null)
                const BATCH = 5
                for (let i = 0; i < pastGWs.length; i += BATCH) {
                    if (cancelled) return
                    const batch = pastGWs.slice(i, i + BATCH)
                    const batchResults = await Promise.all(
                        batch.map(gw => fetchWithRetry(gw))
                    )
                    batchResults.forEach((r, j) => { results[i + j] = r })
                    // Small delay between batches to avoid API throttling
                    if (i + BATCH < pastGWs.length) {
                        await new Promise(r => setTimeout(r, 200))
                    }
                }
                if (cancelled) return

                // Second pass: retry any failed GWs individually with longer delays
                const failedIndices = results.map((r, i) => r === null ? i : -1).filter(i => i >= 0)
                if (failedIndices.length > 0) {
                    for (const idx of failedIndices) {
                        if (cancelled) return
                        const data = await fetchWithRetry(pastGWs[idx], 3, 800)
                        if (data) results[idx] = data
                        await new Promise(r => setTimeout(r, 300))
                    }
                }
                if (cancelled) return

                const map = {}
                results.forEach((liveData) => {
                    if (!liveData?.elements) return
                    liveData.elements.forEach(el => {
                        if (!map[el.id]) map[el.id] = { played: 0, high: 0 }
                        const stats = el.stats
                        if (stats.minutes > 0) {
                            map[el.id].played++
                            if (stats.total_points >= THRESHOLD) {
                                map[el.id].high++
                            }
                        }
                    })
                })

                setConsistencyMap(map)
            } catch {
                setConsistencyMap({})
            } finally {
                if (!cancelled) setDataLoading(false)
            }
        })()

        return () => { cancelled = true }
    }, [currentGw])

    // Filtered for display (instant — no API calls)
    const displayFiltered = useMemo(() => {
        if (!players.length || !fixtures.length || !targetGw) return []
        return players.filter(p => {
            if (p.minutes < 200) return false
            if (posFilter !== 'ALL' && getPositionShort(p.element_type) !== posFilter) return false
            if (teamFilter !== 'ALL' && p.team !== Number(teamFilter)) return false
            if (search) {
                const q = normalizeText(search)
                return normalizeText(p.web_name).includes(q)
            }
            return true
        })
    }, [players, fixtures, targetGw, posFilter, teamFilter, search])

    // Build final data with consistency + fixture
    const matrixData = useMemo(() => {
        if (!consistencyMap) return []
        return displayFiltered
            .filter(p => consistencyMap[p.id] && consistencyMap[p.id].played > 0)
            .map(p => {
                const cd = consistencyMap[p.id]
                const consistencyPct = cd.played > 0
                    ? Math.round((cd.high / cd.played) * 100)
                    : 0

                // Fixture data
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
                const score = consistencyPct * ((5 - avgFDR + 1) / 5)

                return {
                    ...p,
                    gwFixtures,
                    avgFDR,
                    score,
                    highGWCount: cd.high,
                    gwsPlayed: cd.played,
                    consistencyPct,
                }
            })
            .sort((a, b) => b.score - a.score)
    }, [displayFiltered, consistencyMap, fixtures, teams, gwRange])

    const totalPages = Math.ceil(matrixData.length / PER_PAGE)
    const paginated = matrixData.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

    const posClass = (t) => {
        const map = { 1: styles.posGKP, 2: styles.posDEF, 3: styles.posMID, 4: styles.posFWD }
        return map[t] || styles.posTag
    }

    const selectedGwLabel = GW_OPTIONS.find(o => o.value === gwCount)?.label || `${gwCount} GWs`

    if (loading || dataLoading) {
        return (
            <div className={styles.page}>
                <h1 className="page-title">Consistency × Fixture</h1>
                <div className="shimmer" style={{ height: 400, borderRadius: 'var(--radius)' }} />
            </div>
        )
    }

    return (
        <div className={styles.page}>
            <div className={styles.premiumHeader}>
                <h1 className="page-title">Consistency × Fixture</h1>
                <span className={styles.premiumBadge}>PREMIUM</span>
            </div>
            <p className={styles.subtitle}>
                Players ranked by consistency (GWs with {THRESHOLD}+ points) combined with fixture difficulty
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
                            <th>Price</th>
                            <th>GWs {THRESHOLD}+</th>
                            <th>Con%</th>
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
                                                <div className={styles.playerName}>{p.web_name}{getStatusInfo(p.status) && <span className="status-dot" style={{ background: getStatusInfo(p.status).color }} title={getStatusInfo(p.status).label} />}</div>
                                                <div className={styles.playerTeam}>{team?.short_name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span className={posClass(p.element_type)}>{getPositionShort(p.element_type)}</span></td>
                                    <td>£{(p.now_cost / 10).toFixed(1)}m</td>
                                    <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{p.highGWCount}</td>
                                    <td>
                                        <span className={
                                            p.consistencyPct >= 50 ? styles.formHigh :
                                                p.consistencyPct >= 30 ? styles.formMid :
                                                    styles.formLow
                                        }>{p.consistencyPct}%</span>
                                    </td>
                                    <td className={styles.textAccent}>{p.score.toFixed(1)}</td>
                                    {gwRange.map(gw => {
                                        const fxs = p.gwFixtures[gw] || []
                                        return (
                                            <td key={gw} style={{ padding: '0.3rem', textAlign: 'center' }}>
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
