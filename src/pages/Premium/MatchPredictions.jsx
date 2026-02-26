import { useState, useMemo, useEffect } from 'react'
import { useFpl } from '../../hooks/useFplData'
import { getDifficultyColor } from '../../services/fplApi'
import { callGemini } from '../../services/geminiApi'
import { formatAiResponse } from '../../services/formatAi'
import { loadAiResult, saveAiResult } from '../../services/aiResults'
import { useSettings } from '../../hooks/useSettings'
import { useAuth } from '../../hooks/useAuth'
import styles from './Premium.module.css'

export default function MatchPredictions() {
    const { fixtures, teams, targetGw, loading } = useFpl()
    const { openSettings } = useSettings()
    const { wallet } = useAuth()
    const [analyzing, setAnalyzing] = useState(false)
    const [predictions, setPredictions] = useState('')
    const [savedGw, setSavedGw] = useState(null)

    const apiKey = localStorage.getItem('gemini_key') || ''

    // Load saved result on mount
    useEffect(() => {
        if (!wallet) return
        loadAiResult(wallet, 'predictions').then(data => {
            if (data) {
                setPredictions(data.result)
                setSavedGw(data.gameweek)
            }
        })
    }, [wallet])

    const gwFixtures = useMemo(() => {
        if (!fixtures.length || !targetGw) return []
        return fixtures
            .filter(f => f.event === targetGw.id)
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
    }, [fixtures, teams, targetGw])

    const handlePredict = async () => {
        if (!apiKey) return
        setAnalyzing(true)
        setPredictions('')
        try {
            const matchInfo = gwFixtures.map(f =>
                `${f.homeName} (Home Strength: ${f.homeStrength}) vs ${f.awayName} (Away Strength: ${f.awayStrength}), Home FDR: ${f.team_h_difficulty}, Away FDR: ${f.team_a_difficulty}`
            ).join('\n')

            const prompt = `You are a football prediction expert. Predict the outcomes for these Premier League GW${targetGw.id} matches.

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
            setSavedGw(targetGw.id)
            if (wallet) saveAiResult(wallet, 'predictions', targetGw.id, response)
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
                <span className={styles.premiumBadge}>PREMIUM</span>
            </div>
            <p className={styles.subtitle}>AI score predictions for GW{targetGw?.id} matches</p>

            {!apiKey ? (
                <button className={styles.openSettingsBtn} onClick={openSettings}>
                    ⚙️ Open Settings to configure API Key
                </button>
            ) : (
                <button className={styles.aiBtn} onClick={handlePredict} disabled={analyzing}>
                    <img src="/magic.svg" alt="" style={{ width: 18, height: 18, filter: 'brightness(0) invert(1)' }} />
                    {analyzing ? 'Predicting...' : 'Predict Matches'}
                </button>
            )}

            <div className={styles.section}>
                <div className={styles.sectionTitle}>GW{targetGw?.id} Fixtures</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.68rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span><img src="/info.svg" alt="" style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: 4, filter: 'brightness(0) invert(1) opacity(0.7)' }} />FDR = Fixture Difficulty Rating (1-5)</span>
                    <span style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 4 }}>
                        <span className={styles.fdrCell} style={{ background: getDifficultyColor(1), fontSize: '0.55rem', padding: '1px 5px' }}>1</span>
                        <span style={{ marginRight: 4 }}>Easy</span>
                        <span className={styles.fdrCell} style={{ background: getDifficultyColor(3), fontSize: '0.55rem', padding: '1px 5px' }}>3</span>
                        <span style={{ marginRight: 4 }}>Mid</span>
                        <span className={styles.fdrCell} style={{ background: getDifficultyColor(5), fontSize: '0.55rem', padding: '1px 5px' }}>5</span>
                        <span>Hard</span>
                    </span>
                </div>
                <div className={styles.cardGrid}>
                    {gwFixtures.map(f => (
                        <div key={f.id} style={{ background: '#0F1626', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{f.homeShort}</div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>HOME</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>FDR</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span className={styles.fdrCell} style={{ background: getDifficultyColor(f.team_h_difficulty) }}>{f.team_h_difficulty}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>vs</span>
                                    <span className={styles.fdrCell} style={{ background: getDifficultyColor(f.team_a_difficulty) }}>{f.team_a_difficulty}</span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{f.awayShort}</div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>AWAY</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {predictions && (
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>AI Predictions</div>
                    <div className={styles.aiResult} dangerouslySetInnerHTML={{ __html: formatAiResponse(predictions) }} />
                </div>
            )}
        </div>
    )
}
