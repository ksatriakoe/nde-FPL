import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFpl } from '../../hooks/useFplData'
import { getTeamBadgeUrl, fetchFixtures } from '../../services/fplApi'
import styles from './LiveScores.module.css'

/**
 * Calculate a display label for match minutes.
 * FPL fixture object has: minutes (int), started (bool), finished (bool), finished_provisional (bool)
 */
function getMatchMinutesLabel(fix) {
    if (!fix.started) return null
    if (fix.finished || fix.finished_provisional) return null

    const mins = fix.minutes
    // Half-time: minutes == 45 and the API sometimes keeps it at 45 during HT
    // We detect HT by checking if minutes is 45 and no second-half flag
    // Unfortunately FPL API doesn't have a direct HT field, but minutes stays at 45 during break
    if (mins === 0 && fix.started) return "HT"
    if (mins > 90) return `90+${mins - 90}'`
    return `${mins}'`
}

export default function LiveScores() {
    const { fixtures: initialFixtures, teams, players, currentGw, events, loading } = useFpl()
    const navigate = useNavigate()
    const [selectedGw, setSelectedGw] = useState(null)
    const [liveFixtures, setLiveFixtures] = useState(null)
    const intervalRef = useRef(null)

    // Use live-refreshed fixtures if available, otherwise use initial
    const fixtures = liveFixtures || initialFixtures

    const gw = selectedGw || currentGw?.id || 1

    // Check if there are any live matches in current GW
    const hasLiveMatches = useMemo(() => {
        if (!fixtures) return false
        return fixtures.some(f => f.event === gw && f.started && !f.finished && !f.finished_provisional)
    }, [fixtures, gw])

    // Auto-refresh fixtures every 60s when live matches exist
    const refreshFixtures = useCallback(async () => {
        try {
            const fresh = await fetchFixtures()
            setLiveFixtures(fresh)
        } catch { /* silent fail */ }
    }, [])

    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
        }
        if (hasLiveMatches) {
            intervalRef.current = setInterval(refreshFixtures, 60000)
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [hasLiveMatches, refreshFixtures])

    const gwFixtures = useMemo(() => {
        if (!fixtures) return []
        return fixtures
            .filter(f => f.event === gw)
            .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))
    }, [fixtures, gw])

    const getTeamInfo = (id) => teams.find(t => t.id === id)
    const getPlayer = (id) => players.find(p => p.id === id)

    if (loading) {
        return (
            <div className={styles.page}>
                <h1 className="page-title">Live Scores</h1>
                <div className={styles.matchGrid}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="shimmer" style={{ height: 120, borderRadius: 'var(--radius)' }} />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className={styles.page}>
            <h1 className="page-title">Live Scores</h1>

            <div className={styles.gwSelector}>
                <button className={styles.gwBtn} onClick={() => setSelectedGw(Math.max(1, gw - 1))} disabled={gw <= 1}>
                    <img src="/left.svg" alt="Previous" className={styles.gwArrow} />
                </button>
                <span className={styles.gwLabel}>Gameweek {gw}</span>
                <button className={styles.gwBtn} onClick={() => setSelectedGw(Math.min(38, gw + 1))} disabled={gw >= 38}>
                    <img src="/right.svg" alt="Next" className={styles.gwArrow} />
                </button>
            </div>

            <div className={styles.matchGrid}>
                {gwFixtures.map(fix => {
                    const home = getTeamInfo(fix.team_h)
                    const away = getTeamInfo(fix.team_a)
                    const isFinished = fix.finished || fix.finished_provisional
                    const isLive = fix.started && !isFinished
                    const notStarted = !fix.started

                    return (
                        <div key={fix.id} className={styles.matchCard}>
                            <div className={styles.matchHeader}>
                                <span>
                                    {fix.kickoff_time
                                        ? new Date(fix.kickoff_time).toLocaleDateString('en-GB', {
                                            weekday: 'short', day: 'numeric', month: 'short',
                                            hour: '2-digit', minute: '2-digit',
                                        })
                                        : 'TBC'}
                                </span>
                                {isLive && (
                                    <span className={styles.matchLive}>
                                        LIVE
                                        {fix.minutes != null && fix.minutes > 0 && (
                                            <span className={styles.matchMinutes}>{getMatchMinutesLabel(fix) || `${fix.minutes}'`}</span>
                                        )}
                                        {fix.minutes === 0 && fix.started && (
                                            <span className={styles.matchMinutes}>HT</span>
                                        )}
                                    </span>
                                )}
                                {isFinished && <span className={styles.matchFinished}>FT</span>}
                            </div>
                            <div className={styles.matchBody}>
                                <div className={styles.teamHome}>
                                    {home && (
                                        <img
                                            src={getTeamBadgeUrl(home.code)}
                                            alt={home.short_name}
                                            className={styles.teamBadge}
                                        />
                                    )}
                                    <span className={styles.teamName}>{home?.short_name || '?'}</span>
                                </div>
                                <div className={styles.score}>
                                    {notStarted ? (
                                        <span className={styles.notStarted}>vs</span>
                                    ) : (
                                        <>
                                            <span>{fix.team_h_score ?? '-'}</span>
                                            <span className={styles.scoreSep}>-</span>
                                            <span>{fix.team_a_score ?? '-'}</span>
                                        </>
                                    )}
                                </div>
                                <div className={styles.teamAway}>
                                    <span className={styles.teamName}>{away?.short_name || '?'}</span>
                                    {away && (
                                        <img
                                            src={getTeamBadgeUrl(away.code)}
                                            alt={away.short_name}
                                            className={styles.teamBadge}
                                        />
                                    )}
                                </div>
                            </div>
                            {(isFinished || isLive) && fix.stats && fix.stats.length > 0 && (() => {
                                const iconMap = {
                                    goals_scored: '/goal.svg',
                                    assists: '/assist.svg',
                                    yellow_cards: '/yellow-card.svg',
                                    red_cards: '/red-card.svg',
                                    bonus: '/star.svg',
                                    own_goals: '/goal.svg',
                                    defensive_contribution: '/shield-check.svg',
                                }
                                const isOG = (id) => id === 'own_goals'
                                const isDC = (id) => id === 'defensive_contribution'
                                const dcMeetsThreshold = (element, value) => {
                                    const p = getPlayer(element)
                                    if (!p) return false
                                    // DEF(2): 10+, MID(3)/FWD(4): 12+
                                    if (p.element_type === 2) return value >= 10
                                    return value >= 12
                                }
                                const homeStats = []
                                const awayStats = []
                                fix.stats.forEach((stat, idx) => {
                                    const iconSrc = iconMap[stat.identifier]
                                    if (!iconSrc) return
                                        ; (stat.h || []).forEach((s, j) => {
                                            if (isDC(stat.identifier) && !dcMeetsThreshold(s.element, s.value)) return
                                            const player = getPlayer(s.element)
                                            const count = isDC(stat.identifier) ? 1 : (s.value || 1)
                                            homeStats.push(
                                                <span key={`h-${idx}-${j}`} className={styles.statBadge}>
                                                    {Array.from({ length: count }, (_, k) => (
                                                        <img key={k} src={iconSrc} alt={stat.identifier} className={styles.statIcon} />
                                                    ))}
                                                    {isOG(stat.identifier) && <span className={styles.ogTag}>OG</span>}
                                                    <span className={styles.playerLink} onClick={(e) => { e.stopPropagation(); navigate(`/players/${s.element}`) }}>{player?.web_name || 'Unknown'}</span>
                                                </span>
                                            )
                                        })
                                        ; (stat.a || []).forEach((s, j) => {
                                            if (isDC(stat.identifier) && !dcMeetsThreshold(s.element, s.value)) return
                                            const player = getPlayer(s.element)
                                            const count = isDC(stat.identifier) ? 1 : (s.value || 1)
                                            awayStats.push(
                                                <span key={`a-${idx}-${j}`} className={styles.statBadge}>
                                                    <span className={styles.playerLink} onClick={(e) => { e.stopPropagation(); navigate(`/players/${s.element}`) }}>{player?.web_name || 'Unknown'}</span>
                                                    {isOG(stat.identifier) && <span className={styles.ogTag}>OG</span>}
                                                    {Array.from({ length: count }, (_, k) => (
                                                        <img key={k} src={iconSrc} alt={stat.identifier} className={styles.statIcon} />
                                                    ))}
                                                </span>
                                            )
                                        })
                                })
                                if (homeStats.length === 0 && awayStats.length === 0) return null
                                return (
                                    <div className={styles.matchStatsRow}>
                                        <div className={styles.statsHome}>{homeStats}</div>
                                        <div className={styles.statsDivider} />
                                        <div className={styles.statsAway}>{awayStats}</div>
                                    </div>
                                )
                            })()}
                        </div>
                    )
                })}
                {gwFixtures.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center', gridColumn: '1 / -1' }}>
                        No fixtures found for Gameweek {gw}
                    </div>
                )}
            </div>
        </div>
    )
}
