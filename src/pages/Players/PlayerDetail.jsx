import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFpl } from '../../hooks/useFplData'
import { fetchPlayerSummary, getTeamBadgeUrl, getPlayerPhotoUrl, getPositionShort, getDifficultyColor } from '../../services/fplApi'
import styles from './PlayerDetail.module.css'

export default function PlayerDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { players, getTeam, getPosition, fixtures, teams, targetGw } = useFpl()
    const [summary, setSummary] = useState(null)
    const [loading, setLoading] = useState(true)

    const player = useMemo(() => players.find(p => p.id === Number(id)), [players, id])
    const team = player ? getTeam(player.team) : null
    const position = player ? getPosition(player.element_type) : null

    useEffect(() => {
        if (!id) return
        setLoading(true)
        fetchPlayerSummary(id)
            .then(data => setSummary(data))
            .catch(() => setSummary(null))
            .finally(() => setLoading(false))
    }, [id])

    const upcomingFixtures = useMemo(() => {
        if (!fixtures || !player || !teams.length || !targetGw) return []
        const gwStart = targetGw.id
        return fixtures
            .filter(f => f.event >= gwStart && f.event <= gwStart + 5 && (f.team_h === player.team || f.team_a === player.team))
            .sort((a, b) => a.event - b.event)
            .map(f => {
                const isHome = f.team_h === player.team
                const oppId = isHome ? f.team_a : f.team_h
                const opp = teams.find(t => t.id === oppId)
                return {
                    gw: f.event,
                    opponent: opp?.short_name || '?',
                    isHome,
                    difficulty: isHome ? f.team_h_difficulty : f.team_a_difficulty,
                }
            })
    }, [fixtures, player, teams, targetGw])

    if (!player) {
        return (
            <div className={styles.page}>
                <button onClick={() => navigate(-1)} className={styles.backBtn}>
                    <img src="/left.svg" alt="" style={{ width: 14, height: 14 }} /> Back
                </button>
                <div className={styles.notFound}>Player not found</div>
            </div>
        )
    }

    const stats = [
        { label: 'Total Points', value: player.total_points },
        { label: 'Price', value: `£${(player.now_cost / 10).toFixed(1)}m` },
        { label: 'Form', value: player.form },
        { label: 'Goals', value: player.goals_scored },
        { label: 'Assists', value: player.assists },
        { label: 'Clean Sheets', value: player.clean_sheets },
        { label: 'Minutes', value: player.minutes },
        { label: 'Bonus', value: player.bonus },
        { label: 'ICT Index', value: player.ict_index },
        { label: 'Ownership', value: `${player.selected_by_percent}%` },
        { label: 'Transfers In', value: player.transfers_in_event?.toLocaleString() },
        { label: 'Transfers Out', value: player.transfers_out_event?.toLocaleString() },
    ]

    const posTag = { 1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD' }
    const posClass = { 1: styles.posGKP, 2: styles.posDEF, 3: styles.posMID, 4: styles.posFWD }

    return (
        <div className={styles.page}>
            <button onClick={() => navigate(-1)} className={styles.backBtn}>
                <img src="/left.svg" alt="" style={{ width: 14, height: 14 }} /> Back
            </button>

            <div className={styles.header}>
                <div className={styles.playerPhoto}>
                    <img
                        src={getPlayerPhotoUrl(player.photo?.replace('.jpg', '.png'))}
                        alt={player.web_name}
                        onError={e => { e.target.style.display = 'none' }}
                    />
                </div>
                <div className={styles.playerInfo}>
                    <div className={styles.playerName}>{player.first_name} {player.second_name}</div>
                    <div className={styles.playerMeta}>
                        {team && <img src={getTeamBadgeUrl(team.code)} alt="" className={styles.teamBadge} />}
                        <span>{team?.name}</span>
                        <span className={posClass[player.element_type] || styles.posTag}>
                            {posTag[player.element_type] || '?'}
                        </span>
                    </div>
                    <div className={styles.statusRow}>
                        {player.status === 'a' ? (
                            <span className={styles.statusAvailable}><img src="/circle-green.svg" alt="" style={{ width: 10, height: 10 }} /> Available</span>
                        ) : (
                            <span className={styles.statusOut}>
                                <img src="/circle-red.svg" alt="" style={{ width: 10, height: 10 }} />
                                {player.news || 'Unavailable'}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                {stats.map(s => (
                    <div key={s.label} className={styles.statCard}>
                        <div className={styles.statValue}>{s.value}</div>
                        <div className={styles.statLabel}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Upcoming Fixtures */}
            {upcomingFixtures.length > 0 && (
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Upcoming Fixtures</h3>
                    <div className={styles.fixtureRow}>
                        {upcomingFixtures.map((f, i) => (
                            <div key={i} className={styles.fixtureCard} style={{ borderTopColor: getDifficultyColor(f.difficulty) }}>
                                <div className={styles.fixtureGW}>GW{f.gw}</div>
                                <div className={styles.fixtureOpp}>{f.opponent}</div>
                                <div className={styles.fixtureVenue}>{f.isHome ? 'H' : 'A'}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* GW History */}
            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Gameweek History</h3>
                {loading ? (
                    <div className="shimmer" style={{ height: 200, borderRadius: 'var(--radius)' }} />
                ) : summary?.history?.length > 0 ? (
                    <div className={styles.historyWrapper}>
                        <table className={styles.historyTable}>
                            <thead>
                                <tr>
                                    <th>GW</th>
                                    <th>Opp</th>
                                    <th>Pts</th>
                                    <th>Mins</th>
                                    <th>GS</th>
                                    <th>A</th>
                                    <th>CS</th>
                                    <th>BPS</th>
                                    <th>Bonus</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...summary.history].reverse().map((h, i) => (
                                    <tr key={i} className={h.total_points >= 7 ? styles.highPoints : ''}>
                                        <td>{h.round}</td>
                                        <td>
                                            {(() => {
                                                const opp = teams.find(t => t.id === h.opponent_team)
                                                return `${opp?.short_name || '?'} (${h.was_home ? 'H' : 'A'})`
                                            })()}
                                        </td>
                                        <td className={styles.tdPoints}>{h.total_points}</td>
                                        <td>{h.minutes}</td>
                                        <td>{h.goals_scored}</td>
                                        <td>{h.assists}</td>
                                        <td>{h.clean_sheets}</td>
                                        <td>{h.bps}</td>
                                        <td>{h.bonus}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className={styles.emptyState}>No gameweek history available</div>
                )}
            </div>
        </div>
    )
}
