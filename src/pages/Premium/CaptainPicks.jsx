import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFpl } from '../../hooks/useFplData'
import { getTeamBadgeUrl, getPositionShort, getDifficultyColor, getStatusInfo } from '../../services/fplApi'
import { callGemini } from '../../services/geminiApi'
import { formatAiResponse } from '../../services/formatAi'
import { loadAiResult, saveAiResult } from '../../services/aiResults'
import { useSettings } from '../../hooks/useSettings'
import { useAuth } from '../../hooks/useAuth'
import styles from './Premium.module.css'

export default function CaptainPicks() {
    const { players, fixtures, teams, targetGw, loading, getTeam } = useFpl()
    const navigate = useNavigate()
    const { openSettings } = useSettings()
    const { wallet } = useAuth()
    const [analyzing, setAnalyzing] = useState(false)
    const [result, setResult] = useState('')
    const [savedGw, setSavedGw] = useState(null)
    const [page, setPage] = useState(0)
    const PER_PAGE = 10

    const apiKey = localStorage.getItem('gemini_key') || ''

    // Load saved result on mount
    useEffect(() => {
        if (!wallet) return
        loadAiResult(wallet, 'captain_picks').then(data => {
            if (data) {
                setResult(data.result)
                setSavedGw(data.gameweek)
            }
        })
    }, [wallet])

    const topCandidates = useMemo(() => {
        if (!players.length || !fixtures.length || !targetGw) return []
        const gw = targetGw.id
        return players
            .filter(p => p.status === 'a' && parseFloat(p.form) >= 4 && p.minutes > 300)
            .map(p => {
                const gwMatches = fixtures.filter(f => f.event === gw && (f.team_h === p.team || f.team_a === p.team))
                const matches = gwMatches.map(m => {
                    const isHome = m.team_h === p.team
                    return {
                        fdr: isHome ? m.team_h_difficulty : m.team_a_difficulty,
                        isHome,
                        opponent: teams.find(t => t.id === (isHome ? m.team_a : m.team_h))?.short_name || '—'
                    }
                })
                const bestFdr = matches.length > 0 ? Math.min(...matches.map(m => m.fdr)) : 5
                return { ...p, matches, fdr: bestFdr }
            })
            .sort((a, b) => {
                const scoreA = parseFloat(a.form) * (5 - a.fdr + 1)
                const scoreB = parseFloat(b.form) * (5 - b.fdr + 1)
                return scoreB - scoreA
            })
    }, [players, fixtures, teams, targetGw])

    const posClass = (t) => {
        const map = { 1: styles.posGKP, 2: styles.posDEF, 3: styles.posMID, 4: styles.posFWD }
        return map[t] || styles.posTag
    }

    const handleAnalyze = async () => {
        if (!apiKey) return
        setAnalyzing(true)
        setResult('')
        try {
            const playerInfo = topCandidates.map(p => {
                const matchStr = p.matches.map(m => `vs ${m.opponent} ${m.isHome ? 'HOME' : 'AWAY'} FDR:${m.fdr}`).join(' + ')
                return `${p.web_name} (${getPositionShort(p.element_type)}, Form: ${p.form}, Pts: ${p.total_points}, ${matchStr || 'No fixture'}, Goals: ${p.goals_scored}, Assists: ${p.assists}, xG: ${p.expected_goals || 'N/A'}, xA: ${p.expected_assists || 'N/A'})`
            }).join('\n')

            const prompt = `You are an FPL (Fantasy Premier League) expert analyst. Based on the following GW${targetGw.id} captain candidates, provide your top 3 captain picks with detailed reasoning.

Players:
${playerInfo}

Format your response as:
🥇 #1 Captain Pick: [Name]
- Reasoning with stats, form, fixture difficulty analysis

🥈 #2 Captain Pick: [Name]
- Reasoning

🥉 #3 Differential Captain: [Name]
- Reasoning

Keep it concise but insightful. Focus on form, fixture, home/away advantage, and expected returns.`

            const response = await callGemini(apiKey, prompt)
            setResult(response)
            setSavedGw(targetGw.id)
            if (wallet) saveAiResult(wallet, 'captain_picks', targetGw.id, response)
        } catch (err) {
            setResult('❌ Error: ' + err.message)
        }
        setAnalyzing(false)
    }

    if (loading) {
        return (
            <div className={styles.page}>
                <h1 className="page-title">AI Captain Picks</h1>
                <div className="shimmer" style={{ height: 400, borderRadius: 'var(--radius)' }} />
            </div>
        )
    }

    return (
        <div className={styles.page}>
            <div className={styles.premiumHeader}>
                <h1 className="page-title">AI Captain Picks</h1>
                <span className={styles.premiumBadge}>PREMIUM</span>
            </div>
            <p className={styles.subtitle}>AI-powered captain recommendations for GW{targetGw?.id}</p>

            {!apiKey ? (
                <button className={styles.openSettingsBtn} onClick={openSettings}>
                    ⚙️ Open Settings to configure API Key
                </button>
            ) : (
                <button className={styles.aiBtn} onClick={handleAnalyze} disabled={analyzing}>
                    <img src="/magic.svg" alt="" style={{ width: 18, height: 18, filter: 'brightness(0) invert(1)' }} />
                    {analyzing ? 'Analyzing...' : 'Get AI Picks'}
                </button>
            )}

            <div className={styles.section}>
                <div className={styles.sectionTitle}>Top Captain Candidates — GW{targetGw?.id} ({topCandidates.length} players)</div>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Player</th>
                                <th>Pos</th>
                                <th>Form</th>
                                <th>Pts</th>
                                <th>Opponent</th>
                                <th>FDR</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topCandidates.slice(page * PER_PAGE, (page + 1) * PER_PAGE).map((p, i) => {
                                const team = getTeam(p.team)
                                return (
                                    <tr key={p.id} onClick={() => navigate(`/players/${p.id}`)}>
                                        <td style={{ color: 'var(--text-muted)' }}>{page * PER_PAGE + i + 1}</td>
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
                                        <td className={styles.formHigh}>{p.form}</td>
                                        <td style={{ fontWeight: 700 }}>{p.total_points}</td>
                                        <td>
                                            {p.matches.length === 0 ? (
                                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                                            ) : (
                                                p.matches.map((m, mi) => (
                                                    <div key={mi} className={styles.fdrCell} style={{ background: getDifficultyColor(m.fdr), marginBottom: p.matches.length > 1 ? 2 : 0 }}>
                                                        {m.opponent} ({m.isHome ? 'H' : 'A'})
                                                    </div>
                                                ))
                                            )}
                                        </td>
                                        <td>
                                            {p.matches.length === 0 ? (
                                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                                            ) : (
                                                p.matches.map((m, mi) => (
                                                    <div key={mi} className={styles.fdrCell} style={{ background: getDifficultyColor(m.fdr), marginBottom: p.matches.length > 1 ? 2 : 0 }}>
                                                        {m.fdr}
                                                    </div>
                                                ))
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                <div className={styles.paginationRow}>
                    <span>{topCandidates.length} players found</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button className={styles.pageBtn} onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                            <img src="/left.svg" alt="" className={styles.pageArrow} />
                            Prev
                        </button>
                        <span>Page {page + 1} of {Math.ceil(topCandidates.length / PER_PAGE)}</span>
                        <button className={styles.pageBtn} onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(topCandidates.length / PER_PAGE) - 1}>
                            Next
                            <img src="/right.svg" alt="" className={styles.pageArrow} />
                        </button>
                    </div>
                </div>
            </div>

            {result && (
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>AI Analysis</div>
                    <div className={styles.aiResult} dangerouslySetInnerHTML={{ __html: formatAiResponse(result) }} />
                </div>
            )}
        </div>
    )
}
