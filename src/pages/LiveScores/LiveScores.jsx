import { useState, useMemo } from 'react'
import { useFpl } from '../../hooks/useFplData'
import { getTeamBadgeUrl } from '../../services/fplApi'
import styles from './LiveScores.module.css'

export default function LiveScores() {
    const { fixtures, teams, players, currentGw, events, loading } = useFpl()
    const [selectedGw, setSelectedGw] = useState(null)

    const gw = selectedGw || currentGw?.id || 1

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
                                {isLive && <span className={styles.matchLive}>LIVE</span>}
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
                                }
                                const homeStats = []
                                const awayStats = []
                                fix.stats.forEach((stat, idx) => {
                                    const iconSrc = iconMap[stat.identifier]
                                    if (!iconSrc) return
                                        ; (stat.h || []).forEach((s, j) => {
                                            const player = getPlayer(s.element)
                                            const count = s.value || 1
                                            homeStats.push(
                                                <span key={`h-${idx}-${j}`} className={styles.statBadge}>
                                                    {Array.from({ length: count }, (_, k) => (
                                                        <img key={k} src={iconSrc} alt={stat.identifier} className={styles.statIcon} />
                                                    ))}
                                                    {player?.web_name || 'Unknown'}
                                                </span>
                                            )
                                        })
                                        ; (stat.a || []).forEach((s, j) => {
                                            const player = getPlayer(s.element)
                                            const count = s.value || 1
                                            awayStats.push(
                                                <span key={`a-${idx}-${j}`} className={styles.statBadge}>
                                                    {player?.web_name || 'Unknown'}
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
