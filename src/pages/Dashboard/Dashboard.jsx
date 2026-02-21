import { useState, useEffect } from 'react'
import { useFpl } from '../../hooks/useFplData'
import styles from './Dashboard.module.css'

function Countdown({ deadline }) {
    const [timeLeft, setTimeLeft] = useState(getTimeLeft(deadline))

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(getTimeLeft(deadline))
        }, 1000)
        return () => clearInterval(timer)
    }, [deadline])

    function getTimeLeft(dl) {
        const diff = new Date(dl) - new Date()
        if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 }
        return {
            d: Math.floor(diff / 86400000),
            h: Math.floor((diff % 86400000) / 3600000),
            m: Math.floor((diff % 3600000) / 60000),
            s: Math.floor((diff % 60000) / 1000),
        }
    }

    const pad = (n) => String(n).padStart(2, '0')

    return (
        <div className={styles.countdown}>
            <div className={styles.countdownTitle}><img src="/clock.svg" alt="" style={{ width: 18, height: 18, verticalAlign: 'middle', marginRight: 6 }} />Deadline Approaching</div>
            <div className={styles.countdownTimer}>
                <div className={styles.timeBlock}>
                    <span className={styles.timeValue}>{pad(timeLeft.d)}</span>
                    <span className={styles.timeLabel}>Days</span>
                </div>
                <span className={styles.timeSeparator}>:</span>
                <div className={styles.timeBlock}>
                    <span className={styles.timeValue}>{pad(timeLeft.h)}</span>
                    <span className={styles.timeLabel}>Hours</span>
                </div>
                <span className={styles.timeSeparator}>:</span>
                <div className={styles.timeBlock}>
                    <span className={styles.timeValue}>{pad(timeLeft.m)}</span>
                    <span className={styles.timeLabel}>Mins</span>
                </div>
                <span className={styles.timeSeparator}>:</span>
                <div className={styles.timeBlock}>
                    <span className={styles.timeValue}>{pad(timeLeft.s)}</span>
                    <span className={styles.timeLabel}>Secs</span>
                </div>
            </div>
            <div className={styles.countdownDeadline}>
                {new Date(deadline).toLocaleDateString('en-GB', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                })}
            </div>
        </div>
    )
}

export default function Dashboard() {
    const { players, currentGw, nextGw, data, loading, getTeam } = useFpl()

    if (loading) {
        return (
            <div className={styles.dashboard}>
                <h1 className="page-title">Dashboard</h1>
                <div className={styles.statsRow}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`${styles.statCard} shimmer`} style={{ height: 100 }} />
                    ))}
                </div>
            </div>
        )
    }

    const gw = currentGw || nextGw
    const totalManagers = data?.total_players?.toLocaleString() || '0'
    const avgScore = currentGw?.average_entry_score || 0
    const highestScore = currentGw?.highest_score || 0

    const topPlayers = [...players]
        .sort((a, b) => b.total_points - a.total_points)
        .slice(0, 5)

    const mostTransferred = [...players]
        .sort((a, b) => b.transfers_in_event - a.transfers_in_event)
        .slice(0, 5)

    return (
        <div className={styles.dashboard}>
            <h1 className="page-title">Dashboard</h1>

            {nextGw && <Countdown deadline={nextGw.deadline_time} />}

            <div className={styles.statsRow}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Total Managers</div>
                    <div className={styles.statValue}>{totalManagers}</div>
                    <div className={styles.statSub}>Playing Worldwide</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Current GW</div>
                    <div className={styles.statValue}>{gw?.id || '-'}</div>
                    <div className={styles.statSub}>{currentGw?.finished === false ? <><img src="/circle-red.svg" alt="" style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: 4 }} />In Progress</> : <><img src="/check.svg" alt="" style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: 4 }} />Finished</>}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Average Score</div>
                    <div className={styles.statValue}>{avgScore}</div>
                    <div className={styles.statSub}>GW{currentGw?.id} Average</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Highest Score</div>
                    <div className={styles.statValue}>{highestScore}</div>
                    <div className={styles.statSub}>GW{currentGw?.id} Best</div>
                </div>
            </div>

            <div className={styles.quickGrid}>
                <div className={styles.quickCard}>
                    <div className={styles.quickTitle}><img src="/medal.svg" alt="" style={{ width: 20, height: 20 }} />Top Points Scorers</div>
                    {topPlayers.map((p, i) => {
                        const team = getTeam(p.team)
                        return (
                            <div key={p.id} className={styles.topPlayer}>
                                <div className={styles.topRank}>{i + 1}</div>
                                <div className={styles.topInfo}>
                                    <div className={styles.topName}>{p.web_name}</div>
                                    <div className={styles.topTeam}>{team?.short_name} · £{(p.now_cost / 10).toFixed(1)}m</div>
                                </div>
                                <div className={styles.topPoints}>{p.total_points}</div>
                            </div>
                        )
                    })}
                </div>
                <div className={styles.quickCard}>
                    <div className={styles.quickTitle}><img src="/fire.svg" alt="" style={{ width: 20, height: 20 }} />Most Transferred In</div>
                    {mostTransferred.map((p, i) => {
                        const team = getTeam(p.team)
                        return (
                            <div key={p.id} className={styles.topPlayer}>
                                <div className={styles.topRank}>{i + 1}</div>
                                <div className={styles.topInfo}>
                                    <div className={styles.topName}>{p.web_name}</div>
                                    <div className={styles.topTeam}>{team?.short_name} · £{(p.now_cost / 10).toFixed(1)}m</div>
                                </div>
                                <div className={styles.topPoints}>{p.transfers_in_event.toLocaleString()}</div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
