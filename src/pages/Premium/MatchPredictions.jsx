import { useState, useMemo } from 'react'
import { useFpl } from '../../hooks/useFplData'
import { getDifficultyColor } from '../../services/fplApi'
import { callGemini } from '../../services/geminiApi'
import { useSettings } from '../../hooks/useSettings'
import styles from './Premium.module.css'

export default function MatchPredictions() {
    const { fixtures, teams, currentGw, loading } = useFpl()
    const { openSettings } = useSettings()
    const [analyzing, setAnalyzing] = useState(false)
    const [predictions, setPredictions] = useState('')

    const apiKey = localStorage.getItem('gemini_key') || ''

    const gwFixtures = useMemo(() => {
        if (!fixtures.length || !currentGw) return []
        return fixtures
            .filter(f => f.event === currentGw.id)
            .map(f => {
                const home = teams.find(t => t.id === f.team_h)
                const away = teams.find(t => t.id === f.team_a)
                return {
                    ...f,
                    homeName: home?.name || '?',
                    homeShort: home?.short_name || '?',
                    awayName: away?.name || '?',
                    awayShort: away?.short_name || '?',
                    homeStrength: home?.strength_overall_home || 0,
                    awayStrength: away?.strength_overall_away || 0,
                }
            })
            .sort((a, b) => new Date(a.kickoff_time || 0) - new Date(b.kickoff_time || 0))
    }, [fixtures, teams, currentGw])

    const handlePredict = async () => {
        if (!apiKey) return
        setAnalyzing(true)
        setPredictions('')
        try {
            const matchInfo = gwFixtures.map(f =>
                `${f.homeName} (Home Strength: ${f.homeStrength}) vs ${f.awayName} (Away Strength: ${f.awayStrength}), Home FDR: ${f.team_h_difficulty}, Away FDR: ${f.team_a_difficulty}`
            ).join('\n')

            const prompt = `You are a football prediction expert. Predict the outcomes for these Premier League GW${currentGw.id} matches.

Matches:
${matchInfo}

For each match, provide:
- Predicted score (e.g., 2-1)
- Brief one-line reasoning
- Confidence level (High/Medium/Low)

Format each match prediction on a separate line like:
⚽ Home Team 2-1 Away Team — [Reasoning] (Confidence: High)

Be realistic with predictions based on the team strengths provided.`

            const response = await callGemini(apiKey, prompt)
            setPredictions(response)
        } catch (err) {
            setPredictions('❌ Error: ' + err.message)
        }
        setAnalyzing(false)
    }

    if (loading) {
        return (
            <div className={styles.page}>
                <h1 className="page-title">AI Match Predictions</h1>
                <div className="shimmer" style={{ height: 400, borderRadius: 'var(--radius)' }} />
            </div>
        )
    }

    return (
        <div className={styles.page}>
            <div className={styles.premiumHeader}>
                <h1 className="page-title">AI Match Predictions</h1>
                <span className={styles.premiumBadge}>AI PREMIUM</span>
            </div>
            <p className={styles.subtitle}>AI score predictions for GW{currentGw?.id} matches</p>

            <div className={styles.aiCard}>
                <div className={styles.keyRow}>
                    {!apiKey ? (
                        <button className={styles.openSettingsBtn} onClick={openSettings}>
                            ⚙️ Open Settings to configure API Key
                        </button>
                    ) : (
                        <button className={styles.aiBtn} onClick={handlePredict} disabled={analyzing}>
                            {analyzing ? 'Predicting...' : '🔮 Predict Matches'}
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionTitle}>GW{currentGw?.id} Fixtures</div>
                <div className={styles.cardGrid}>
                    {gwFixtures.map(f => (
                        <div key={f.id} className={styles.card} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{f.homeShort}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>HOME</div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <span className={styles.fdrCell} style={{ background: getDifficultyColor(f.team_h_difficulty) }}>{f.team_h_difficulty}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>vs</span>
                                <span className={styles.fdrCell} style={{ background: getDifficultyColor(f.team_a_difficulty) }}>{f.team_a_difficulty}</span>
                            </div>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{f.awayShort}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>AWAY</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {predictions && (
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>AI Predictions</div>
                    <div className={styles.aiResult}>{predictions}</div>
                </div>
            )}
        </div>
    )
}
