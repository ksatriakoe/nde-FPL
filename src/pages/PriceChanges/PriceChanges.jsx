import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFpl } from '../../hooks/useFplData'
import { getTeamBadgeUrl, getPositionShort } from '../../services/fplApi'
import styles from './PriceChanges.module.css'

export default function PriceChanges() {
    const { players, loading, getTeam } = useFpl()
    const navigate = useNavigate()

    const { risers, fallers } = useMemo(() => {
        const risers = players
            .filter(p => p.cost_change_event > 0)
            .sort((a, b) => b.cost_change_event - a.cost_change_event)

        const fallers = players
            .filter(p => p.cost_change_event < 0)
            .sort((a, b) => a.cost_change_event - b.cost_change_event)

        return { risers, fallers }
    }, [players])

    if (loading) {
        return (
            <div className={styles.page}>
                <h1 className="page-title">Price Changes</h1>
                <div className={styles.grid}>
                    <div className="shimmer" style={{ height: 300, borderRadius: 'var(--radius)' }} />
                    <div className="shimmer" style={{ height: 300, borderRadius: 'var(--radius)' }} />
                </div>
            </div>
        )
    }

    const renderPlayer = (p, type) => {
        const team = getTeam(p.team)
        const change = p.cost_change_event / 10
        return (
            <div key={p.id} className={styles.playerRow} onClick={() => navigate(`/players/${p.id}`)}>
                {team && <img src={getTeamBadgeUrl(team.code)} alt="" className={styles.badge} />}
                <div className={styles.info}>
                    <div className={styles.name}>{p.web_name}</div>
                    <div className={styles.sub}>{team?.short_name} · {getPositionShort(p.element_type)}</div>
                </div>
                <div className={styles.price}>£{(p.now_cost / 10).toFixed(1)}m</div>
                <div className={type === 'up' ? styles.priceUp : styles.priceDown}>
                    {type === 'up' ? '+' : ''}{change.toFixed(1)}
                </div>
            </div>
        )
    }

    return (
        <div className={styles.page}>
            <h1 className="page-title">Price Changes</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                Price changes from the current gameweek transfer window.
            </p>

            <div className={styles.grid}>
                <div className={styles.section}>
                    <div className={styles.risersTitle}><img src="/circle-green.svg" alt="" style={{ width: 14, height: 14 }} /> Risers ({risers.length})</div>
                    {risers.length > 0
                        ? risers.map(p => renderPlayer(p, 'up'))
                        : <div className={styles.emptyState}>No risers this gameweek</div>
                    }
                </div>
                <div className={styles.section}>
                    <div className={styles.fallersTitle}><img src="/circle-red.svg" alt="" style={{ width: 14, height: 14 }} /> Fallers ({fallers.length})</div>
                    {fallers.length > 0
                        ? fallers.map(p => renderPlayer(p, 'down'))
                        : <div className={styles.emptyState}>No fallers this gameweek</div>
                    }
                </div>
            </div>
        </div>
    )
}
