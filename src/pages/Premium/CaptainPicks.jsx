import { useState, useMemo } from 'react'
import { useFpl } from '../../hooks/useFplData'
import { getTeamBadgeUrl, getPositionShort, getDifficultyColor } from '../../services/fplApi'
import { callGemini } from '../../services/geminiApi'
import { useSettings } from '../../hooks/useSettings'
import styles from './Premium.module.css'

export default function CaptainPicks() {
    const { players, fixtures, teams, currentGw, loading, getTeam } = useFpl()
    const { openSettings } = useSettings()
    const [analyzing, setAnalyzing] = useState(false)
    const [result, setResult] = useState('')

    const apiKey = localStorage.getItem('gemini_key') || ''

    const topCandidates = useMemo(() => {
        if (!players.length || !fixtures.length || !currentGw) return []
        const gw = currentGw.id
        return players
            .filter(p => p.status === 'a' && parseFloat(p.form) >= 4 && p.minutes > 300)
            .map(p => {
                const match = fixtures.find(f => f.event === gw && (f.team_h === p.team || f.team_a === p.team))
                const isHome = match?.team_h === p.team
                const fdr = match ? (isHome ? match.team_h_difficulty : match.team_a_difficulty) : 5
                const opp = match ? teams.find(t => t.id === (isHome ? match.team_a : match.team_h))?.short_name : '—'
                return { ...p, fdr, isHome, opponent: opp }
            })
            .sort((a, b) => {
                const scoreA = parseFloat(a.form) * (5 - a.fdr + 1)
                const scoreB = parseFloat(b.form) * (5 - b.fdr + 1)
                return scoreB - scoreA
            })
            .slice(0, 10)
    }, [players, fixtures, teams, currentGw])

    const posClass = (t) => {
        const map = { 1: styles.posGKP, 2: styles.posDEF, 3: styles.posMID, 4: styles.posFWD }
        return map[t] || styles.posTag
    }

    const handleAnalyze = async () => {
        if (!apiKey) return
        setAnalyzing(true)
        setResult('')
        try {
            const playerInfo = topCandidates.map(p =>
                `${p.web_name} (${getPositionShort(p.element_type)}, Form: ${p.form}, Pts: ${p.total_points}, vs ${p.opponent} ${p.isHome ? 'HOME' : 'AWAY'}, FDR: ${p.fdr}, Goals: ${p.goals_scored}, Assists: ${p.assists}, xG: ${p.expected_goals || 'N/A'}, xA: ${p.expected_assists || 'N/A'})`
            ).join('\n')

            const prompt = `You are an FPL (Fantasy Premier League) expert analyst. Based on the following GW${currentGw.id} captain candidates, provide your top 3 captain picks with detailed reasoning.

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
                <span className={styles.premiumBadge}>AI PREMIUM</span>
            </div>
            <p className={styles.subtitle}>AI-powered captain recommendations for GW{currentGw?.id}</p>

            <div className={styles.aiCard}>
                <div className={styles.keyRow}>
                    {!apiKey ? (
                        <button className={styles.openSettingsBtn} onClick={openSettings}>
                            ⚙️ Open Settings to configure API Key
                        </button>
                    ) : (
                        <button className={styles.aiBtn} onClick={handleAnalyze} disabled={analyzing}>
                            {analyzing ? 'Analyzing...' : '✨ Get AI Picks'}
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionTitle}>Top Captain Candidates — GW{currentGw?.id}</div>
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
                            {topCandidates.map((p, i) => {
                                const team = getTeam(p.team)
                                return (
                                    <tr key={p.id}>
                                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                        <td>
                                            <div className={styles.playerCell}>
                                                {team && <img src={getTeamBadgeUrl(team.code)} alt="" className={styles.teamBadge} />}
                                                <div>
                                                    <div className={styles.playerName}>{p.web_name}</div>
                                                    <div className={styles.playerTeam}>{team?.short_name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className={posClass(p.element_type)}>{getPositionShort(p.element_type)}</span></td>
                                        <td className={styles.formHigh}>{p.form}</td>
                                        <td style={{ fontWeight: 700 }}>{p.total_points}</td>
                                        <td>{p.opponent} ({p.isHome ? 'H' : 'A'})</td>
                                        <td>
                                            <span className={styles.fdrCell} style={{ background: getDifficultyColor(p.fdr) }}>
                                                {p.fdr}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {result && (
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>AI Analysis</div>
                    <div className={styles.aiResult}>{result}</div>
                </div>
            )}
        </div>
    )
}
