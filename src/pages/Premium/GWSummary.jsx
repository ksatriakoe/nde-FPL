import { useState, useMemo } from 'react'
import { useFpl } from '../../hooks/useFplData'
import { getPositionShort } from '../../services/fplApi'
import { callGemini } from '../../services/geminiApi'
import { useSettings } from '../../hooks/useSettings'
import styles from './Premium.module.css'

export default function GWSummary() {
    const { players, fixtures, teams, currentGw, loading } = useFpl()
    const { openSettings } = useSettings()
    const [analyzing, setAnalyzing] = useState(false)
    const [summary, setSummary] = useState('')

    const apiKey = localStorage.getItem('gemini_key') || ''

    const gwStats = useMemo(() => {
        if (!players.length || !fixtures.length || !currentGw) return null
        const gw = currentGw.id

        const topForm = [...players].filter(p => p.status === 'a').sort((a, b) => parseFloat(b.form) - parseFloat(a.form)).slice(0, 5)
        const mostTransIn = [...players].sort((a, b) => (b.transfers_in_event || 0) - (a.transfers_in_event || 0)).slice(0, 5)
        const mostTransOut = [...players].sort((a, b) => (b.transfers_out_event || 0) - (a.transfers_out_event || 0)).slice(0, 5)
        const gwMatches = fixtures.filter(f => f.event === gw).length
        const injuredCount = players.filter(p => p.status !== 'a').length

        return { topForm, mostTransIn, mostTransOut, gwMatches, injuredCount }
    }, [players, fixtures, currentGw])

    const handleSummarize = async () => {
        if (!apiKey || !gwStats) return
        setAnalyzing(true)
        setSummary('')
        try {
            const topFormStr = gwStats.topForm.map(p =>
                `${p.web_name} (${getPositionShort(p.element_type)}, Form: ${p.form}, Pts: ${p.total_points})`
            ).join(', ')
            const transInStr = gwStats.mostTransIn.map(p =>
                `${p.web_name} (+${p.transfers_in_event?.toLocaleString()} transfers)`
            ).join(', ')
            const transOutStr = gwStats.mostTransOut.map(p =>
                `${p.web_name} (-${p.transfers_out_event?.toLocaleString()} transfers)`
            ).join(', ')

            const prompt = `You are an FPL expert providing a GW${currentGw.id} preview/summary. Generate a comprehensive gameweek summary.

Data:
- ${gwStats.gwMatches} matches this GW
- ${gwStats.injuredCount} players currently unavailable
- Top form players: ${topFormStr}
- Most transferred in: ${transInStr}
- Most transferred out: ${transOutStr}

Provide:
📋 GW${currentGw.id} Summary
- Key talking points, trending players, what to watch for
- Transfer tips (who to bring in / sell)
- Players to watch
- Risk factors (injuries, rotation, blanks)

Keep it concise, actionable, and insightful. Use bullet points.`

            const response = await callGemini(apiKey, prompt)
            setSummary(response)
        } catch (err) {
            setSummary('❌ Error: ' + err.message)
        }
        setAnalyzing(false)
    }

    if (loading || !gwStats) {
        return (
            <div className={styles.page}>
                <h1 className="page-title">GW Summary</h1>
                <div className="shimmer" style={{ height: 400, borderRadius: 'var(--radius)' }} />
            </div>
        )
    }

    return (
        <div className={styles.page}>
            <div className={styles.premiumHeader}>
                <h1 className="page-title">GW{currentGw?.id} Summary</h1>
                <span className={styles.premiumBadge}>AI PREMIUM</span>
            </div>
            <p className={styles.subtitle}>AI-generated gameweek preview and strategic summary</p>

            <div className={styles.aiCard}>
                <div className={styles.keyRow}>
                    {!apiKey ? (
                        <button className={styles.openSettingsBtn} onClick={openSettings}>
                            ⚙️ Open Settings to configure API Key
                        </button>
                    ) : (
                        <button className={styles.aiBtn} onClick={handleSummarize} disabled={analyzing}>
                            {analyzing ? 'Generating...' : '📋 Generate Summary'}
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.cardGrid}>
                <div className={styles.card}>
                    <div className={styles.scoreCard}>
                        <div className={styles.scoreValue}>{gwStats.gwMatches}</div>
                        <div className={styles.scoreLabel}>Matches</div>
                    </div>
                </div>
                <div className={styles.card}>
                    <div className={styles.scoreCard}>
                        <div className={styles.scoreValue} style={{ color: 'var(--red)' }}>{gwStats.injuredCount}</div>
                        <div className={styles.scoreLabel}>Unavailable</div>
                    </div>
                </div>
                <div className={styles.card}>
                    <div className={styles.scoreCard}>
                        <div className={styles.scoreValue} style={{ color: 'var(--green)' }}>
                            +{gwStats.mostTransIn[0]?.transfers_in_event?.toLocaleString() || 0}
                        </div>
                        <div className={styles.scoreLabel}>Top Transfer In</div>
                    </div>
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionTitle}>🔥 Top Form</div>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr><th>Player</th><th>Pos</th><th>Form</th><th>Pts</th><th>Own%</th></tr>
                        </thead>
                        <tbody>
                            {gwStats.topForm.map(p => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 600 }}>{p.web_name}</td>
                                    <td>{getPositionShort(p.element_type)}</td>
                                    <td className={styles.formHigh}>{p.form}</td>
                                    <td style={{ fontWeight: 700 }}>{p.total_points}</td>
                                    <td>{p.selected_by_percent}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionTitle}>📈 Most Transferred In</div>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr><th>Player</th><th>Transfers In</th><th>Form</th><th>Price</th></tr>
                        </thead>
                        <tbody>
                            {gwStats.mostTransIn.map(p => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 600 }}>{p.web_name}</td>
                                    <td style={{ color: 'var(--green)', fontWeight: 700 }}>+{p.transfers_in_event?.toLocaleString()}</td>
                                    <td>{p.form}</td>
                                    <td>£{(p.now_cost / 10).toFixed(1)}m</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {summary && (
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>AI Summary</div>
                    <div className={styles.aiResult}>{summary}</div>
                </div>
            )}
        </div>
    )
}
