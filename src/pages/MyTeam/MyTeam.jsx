import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFpl } from '../../hooks/useFplData'
import { fetchManager, fetchManagerPicks, fetchManagerHistory, getTeamBadgeUrl, getPositionShort } from '../../services/fplApi'
import styles from './MyTeam.module.css'

export default function MyTeam() {
    const { players, currentGw, loading: bootstrapLoading } = useFpl()
    const navigate = useNavigate()
    const [fplId, setFplId] = useState(() => localStorage.getItem('fpl_id') || '')
    const [manager, setManager] = useState(null)
    const [picks, setPicks] = useState(null)
    const [history, setHistory] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const loadTeam = useCallback(async () => {
        if (!fplId || !currentGw) return
        setLoading(true)
        setError('')
        setManager(null)
        setPicks(null)
        setHistory(null)
        localStorage.setItem('fpl_id', fplId)

        try {
            const [managerData, historyData] = await Promise.all([
                fetchManager(fplId),
                fetchManagerHistory(fplId),
            ])
            setManager(managerData)
            setHistory(historyData)

            // Find latest played GW
            const latestGw = historyData.current?.length > 0
                ? historyData.current[historyData.current.length - 1].event
                : currentGw.id
            const picksData = await fetchManagerPicks(fplId, latestGw)
            setPicks({ ...picksData, gw: latestGw })
        } catch (err) {
            setError(err.message || 'Failed to load team data')
        }
        setLoading(false)
    }, [fplId, currentGw])

    const getPlayer = (elementId) => players.find(p => p.id === elementId)

    // Group picks by position for pitch layout
    const pitchLayout = picks ? (() => {
        const starting = picks.picks?.filter(p => p.position <= 11) || []
        const bench = picks.picks?.filter(p => p.position > 11) || []

        const grouped = { 1: [], 2: [], 3: [], 4: [] }
        starting.forEach(pick => {
            const player = getPlayer(pick.element)
            if (player) grouped[player.element_type].push({ ...pick, player })
        })

        const benchPlayers = bench.map(pick => {
            const player = getPlayer(pick.element)
            return player ? { ...pick, player } : null
        }).filter(Boolean)

        return { grouped, benchPlayers }
    })() : null

    const maxGwPts = history?.current?.length
        ? Math.max(...history.current.map(g => g.points))
        : 1

    return (
        <div className={styles.page}>
            <h1 className="page-title">My Team</h1>

            <div className={styles.idForm}>
                <input
                    className={styles.idInput}
                    type="number"
                    placeholder="FPL ID"
                    value={fplId}
                    onChange={e => setFplId(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadTeam()}
                />
                <button className={styles.loadBtn} onClick={loadTeam} disabled={loading || bootstrapLoading || !fplId}>
                    {loading ? 'Loading...' : '🔍 Load Team'}
                </button>
                <span className={styles.hint}>
                    Find your FPL ID at fpl.team or in your FPL URL
                </span>
            </div>

            {error && <div className={styles.error}>❌ {error}</div>}

            {manager && (
                <div className={styles.managerCard}>
                    <div>
                        <div className={styles.managerName}>
                            {manager.player_first_name} {manager.player_last_name}
                        </div>
                        <div className={styles.managerTeam}>{manager.name}</div>
                    </div>
                    <div className={styles.statChips}>
                        <div className={styles.chip}>
                            <div className={styles.chipValue}>{manager.summary_overall_points?.toLocaleString()}</div>
                            <div className={styles.chipLabel}>Total Points</div>
                        </div>
                        <div className={styles.chip}>
                            <div className={styles.chipValue}>{manager.summary_overall_rank?.toLocaleString()}</div>
                            <div className={styles.chipLabel}>Overall Rank</div>
                        </div>
                        <div className={styles.chip}>
                            <div className={styles.chipValue}>{manager.summary_event_points}</div>
                            <div className={styles.chipLabel}>GW Points</div>
                        </div>
                        <div className={styles.chip}>
                            <div className={styles.chipValue}>{manager.summary_event_rank?.toLocaleString()}</div>
                            <div className={styles.chipLabel}>GW Rank</div>
                        </div>
                        <div className={styles.chip}>
                            <div className={styles.chipValue}>£{(manager.last_deadline_bank / 10).toFixed(1)}m</div>
                            <div className={styles.chipLabel}>In Bank</div>
                        </div>
                        <div className={styles.chip}>
                            <div className={styles.chipValue}>£{(manager.last_deadline_total_transfers || 0)}</div>
                            <div className={styles.chipLabel}>Transfers</div>
                        </div>
                    </div>
                </div>
            )}

            {pitchLayout && players.length > 0 && (
                <div className={styles.pitch}>
                    <div className={styles.pitchTitle}>
                        GW{picks.gw} Squad
                        {picks.active_chip && <span style={{ color: 'var(--accent-primary)', marginLeft: 8 }}>({picks.active_chip})</span>}
                    </div>
                    {[1, 2, 3, 4].map(pos => (
                        <div key={pos} className={styles.positionRow}>
                            {pitchLayout.grouped[pos].map(pick => {
                                const p = pick.player
                                const pts = picks.entry_history?.points || p.event_points || 0
                                const team = players.find(pl => pl.team === p.team)
                                return (
                                    <div
                                        key={pick.element}
                                        className={styles.playerCard}
                                        onClick={() => navigate(`/players/${pick.element}`)}
                                    >
                                        {pick.is_captain && <div className={styles.captainBadge}>C</div>}
                                        {pick.is_vice_captain && <div className={styles.vcBadge}>V</div>}
                                        <img
                                            src={getTeamBadgeUrl(players.find(pl => pl.id === pick.element)?.team_code || 0)}
                                            alt="" className={styles.playerCardBadge}
                                            onError={e => e.target.style.display = 'none'}
                                        />
                                        <div className={styles.playerCardName}>{p.web_name}</div>
                                        <div className={styles.playerCardPts}>{p.event_points} pts</div>
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                    <div className={styles.benchLabel}>— Bench —</div>
                    <div className={styles.benchRow}>
                        {pitchLayout.benchPlayers.map(pick => {
                            const p = pick.player
                            return (
                                <div
                                    key={pick.element}
                                    className={styles.playerCard}
                                    onClick={() => navigate(`/players/${pick.element}`)}
                                >
                                    <img
                                        src={getTeamBadgeUrl(p.team_code || 0)}
                                        alt="" className={styles.playerCardBadge}
                                        onError={e => e.target.style.display = 'none'}
                                    />
                                    <div className={styles.playerCardName}>{p.web_name}</div>
                                    <div className={styles.playerCardPts}>{p.event_points} pts</div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {history?.current?.length > 0 && (
                <div className={styles.gwChart}>
                    <div className={styles.chartTitle}>Points per Gameweek</div>
                    <div className={styles.chartBars}>
                        {history.current.map(gw => (
                            <div key={gw.event} className={styles.bar}>
                                <div className={styles.barValue}>{gw.points}</div>
                                <div
                                    className={styles.barFill}
                                    style={{ height: `${(gw.points / maxGwPts) * 100}px` }}
                                />
                                <div className={styles.barLabel}>{gw.event}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
