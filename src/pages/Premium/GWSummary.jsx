import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFpl } from '../../hooks/useFplData'
import { getTeamBadgeUrl, getPositionShort } from '../../services/fplApi'
import { callGemini } from '../../services/geminiApi'
import { formatAiResponse } from '../../services/formatAi'
import { loadAiResult, saveAiResult } from '../../services/aiResults'
import { useSettings } from '../../hooks/useSettings'
import { useAuth } from '../../hooks/useAuth'
import styles from './Premium.module.css'

export default function GWSummary() {
    const { players, fixtures, teams, currentGw, loading, getTeam } = useFpl()
    const navigate = useNavigate()
    const { openSettings } = useSettings()
    const { wallet } = useAuth()
    const [analyzing, setAnalyzing] = useState(false)
    const [summary, setSummary] = useState('')
    const [savedGw, setSavedGw] = useState(null)
    const [formPage, setFormPage] = useState(0)
    const [transPage, setTransPage] = useState(0)
    const PER_PAGE = 5

    const apiKey = localStorage.getItem('gemini_key') || ''

    // Load saved result on mount
    useEffect(() => {
        if (!wallet) return
        loadAiResult(wallet, 'gw_summary').then(data => {
            if (data) {
                setSummary(data.result)
                setSavedGw(data.gameweek)
            }
        })
    }, [wallet])

    const gwStats = useMemo(() => {
        if (!players.length || !fixtures.length || !currentGw) return null
        const gw = currentGw.id

        const topForm = [...players].filter(p => p.status === 'a').sort((a, b) => parseFloat(b.form) - parseFloat(a.form))
        const mostTransIn = [...players].sort((a, b) => (b.transfers_in_event || 0) - (a.transfers_in_event || 0))
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
            setSavedGw(currentGw.id)
            if (wallet) saveAiResult(wallet, 'gw_summary', currentGw.id, response)
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
                <span className={styles.premiumBadge}>PREMIUM</span>
            </div>
            <p className={styles.subtitle}>AI-generated gameweek preview and strategic summary</p>

            {!apiKey ? (
                <button className={styles.openSettingsBtn} onClick={openSettings}>
                    ⚙️ Open Settings to configure API Key
                </button>
            ) : (
                <button className={styles.aiBtn} onClick={handleSummarize} disabled={analyzing}>
                    <img src="/magic.svg" alt="" style={{ width: 18, height: 18, filter: 'brightness(0) invert(1)' }} />
                    {analyzing ? 'Generating...' : 'Generate Summary'}
                </button>
            )}

            <div className={styles.statsGrid}>
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
                <div className={styles.sectionTitle}><img src="/fire.svg" alt="" style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 4 }} />Top Form</div>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr><th>Player</th><th>Pos</th><th>Form</th><th>Pts</th><th>Own%</th></tr>
                        </thead>
                        <tbody>
                            {gwStats.topForm.slice(formPage * PER_PAGE, (formPage + 1) * PER_PAGE).map((p, i) => {
                                const team = getTeam(p.team)
                                return (
                                    <tr key={p.id} onClick={() => navigate(`/players/${p.id}`)}>
                                        <td>
                                            <div className={styles.playerCell}>
                                                {team && <img src={getTeamBadgeUrl(team.code)} alt="" className={styles.teamBadge} />}
                                                <span className={styles.playerName}>{p.web_name}</span>
                                            </div>
                                        </td>
                                        <td>{getPositionShort(p.element_type)}</td>
                                        <td className={styles.formHigh}>{p.form}</td>
                                        <td style={{ fontWeight: 700 }}>{p.total_points}</td>
                                        <td>{p.selected_by_percent}%</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                <div className={styles.paginationRow}>
                    <span>{gwStats.topForm.length} players</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button className={styles.pageBtn} onClick={() => setFormPage(p => p - 1)} disabled={formPage === 0}>
                            <img src="/left.svg" alt="" className={styles.pageArrow} /> Prev
                        </button>
                        <span>Page {formPage + 1} of {Math.ceil(gwStats.topForm.length / PER_PAGE)}</span>
                        <button className={styles.pageBtn} onClick={() => setFormPage(p => p + 1)} disabled={formPage >= Math.ceil(gwStats.topForm.length / PER_PAGE) - 1}>
                            Next <img src="/right.svg" alt="" className={styles.pageArrow} />
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionTitle}><img src="/stats.svg" alt="" style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 4 }} />Most Transferred In</div>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr><th>Player</th><th>Transfers In</th><th>Form</th><th>Price</th></tr>
                        </thead>
                        <tbody>
                            {gwStats.mostTransIn.slice(transPage * PER_PAGE, (transPage + 1) * PER_PAGE).map((p, i) => {
                                const team = getTeam(p.team)
                                return (
                                    <tr key={p.id} onClick={() => navigate(`/players/${p.id}`)}>
                                        <td>
                                            <div className={styles.playerCell}>
                                                {team && <img src={getTeamBadgeUrl(team.code)} alt="" className={styles.teamBadge} />}
                                                <span className={styles.playerName}>{p.web_name}</span>
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--green)', fontWeight: 700 }}>+{p.transfers_in_event?.toLocaleString()}</td>
                                        <td>{p.form}</td>
                                        <td>£{(p.now_cost / 10).toFixed(1)}m</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                <div className={styles.paginationRow}>
                    <span>{gwStats.mostTransIn.length} players</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button className={styles.pageBtn} onClick={() => setTransPage(p => p - 1)} disabled={transPage === 0}>
                            <img src="/left.svg" alt="" className={styles.pageArrow} /> Prev
                        </button>
                        <span>Page {transPage + 1} of {Math.ceil(gwStats.mostTransIn.length / PER_PAGE)}</span>
                        <button className={styles.pageBtn} onClick={() => setTransPage(p => p + 1)} disabled={transPage >= Math.ceil(gwStats.mostTransIn.length / PER_PAGE) - 1}>
                            Next <img src="/right.svg" alt="" className={styles.pageArrow} />
                        </button>
                    </div>
                </div>
            </div>

            {summary && (
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>AI Summary</div>
                    <div className={styles.aiResult} dangerouslySetInnerHTML={{ __html: formatAiResponse(summary) }} />
                </div>
            )}
        </div>
    )
}
