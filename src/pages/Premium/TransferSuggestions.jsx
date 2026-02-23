import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFpl } from '../../hooks/useFplData'
import { getTeamBadgeUrl, getPositionShort, getDifficultyColor } from '../../services/fplApi'
import { callGemini } from '../../services/geminiApi'
import { formatAiResponse } from '../../services/formatAi'
import { loadAiResult, saveAiResult } from '../../services/aiResults'
import { useSettings } from '../../hooks/useSettings'
import { useAuth } from '../../hooks/useAuth'
import styles from './Premium.module.css'

export default function TransferSuggestions() {
    const { players, fixtures, teams, currentGw, loading, getTeam } = useFpl()
    const navigate = useNavigate()
    const { openSettings } = useSettings()
    const { wallet } = useAuth()
    const [budget, setBudget] = useState(100)
    const [analyzing, setAnalyzing] = useState(false)
    const [suggestions, setSuggestions] = useState('')
    const [savedGw, setSavedGw] = useState(null)

    const apiKey = localStorage.getItem('gemini_key') || ''

    // Load saved result on mount
    useEffect(() => {
        if (!wallet) return
        loadAiResult(wallet, 'transfers').then(data => {
            if (data) {
                setSuggestions(data.result)
                setSavedGw(data.gameweek)
            }
        })
    }, [wallet])

    // Value picks: high form relative to price
    const valuePicks = useMemo(() => {
        if (!players.length || !fixtures.length || !currentGw) return []
        const gw = currentGw.id
        return players
            .filter(p => p.status === 'a' && parseFloat(p.form) >= 3.5 && p.minutes > 200)
            .map(p => {
                const price = p.now_cost / 10
                const form = parseFloat(p.form)
                const valueScore = (form * p.total_points) / (price * price)

                const upcoming = fixtures
                    .filter(f => f.event >= gw && f.event <= gw + 3 && (f.team_h === p.team || f.team_a === p.team))
                    .map(f => {
                        const isHome = f.team_h === p.team
                        return {
                            difficulty: isHome ? f.team_h_difficulty : f.team_a_difficulty,
                            opponent: teams.find(t => t.id === (isHome ? f.team_a : f.team_h))?.short_name || '?',
                            isHome,
                        }
                    })

                return { ...p, valueScore, upcoming, price }
            })
            .sort((a, b) => b.valueScore - a.valueScore)
            .slice(0, 15)
    }, [players, fixtures, teams, currentGw])

    // Players to sell: bad form + hard fixtures
    const sellCandidates = useMemo(() => {
        if (!players.length || !fixtures.length || !currentGw) return []
        const gw = currentGw.id
        return players
            .filter(p => parseFloat(p.selected_by_percent) > 10 && (parseFloat(p.form) < 3 || p.status !== 'a'))
            .map(p => {
                const upcoming = fixtures
                    .filter(f => f.event >= gw && f.event <= gw + 3 && (f.team_h === p.team || f.team_a === p.team))
                    .map(f => {
                        const isHome = f.team_h === p.team
                        return { difficulty: isHome ? f.team_h_difficulty : f.team_a_difficulty }
                    })
                const avgFDR = upcoming.length > 0 ? upcoming.reduce((s, f) => s + f.difficulty, 0) / upcoming.length : 3
                return { ...p, avgFDR, price: p.now_cost / 10 }
            })
            .sort((a, b) => parseFloat(a.form) - parseFloat(b.form))
            .slice(0, 10)
    }, [players, fixtures, currentGw])

    const posClass = (t) => {
        const map = { 1: styles.posGKP, 2: styles.posDEF, 3: styles.posMID, 4: styles.posFWD }
        return map[t] || styles.posTag
    }

    const handleSuggest = async () => {
        if (!apiKey) return
        setAnalyzing(true)
        setSuggestions('')
        try {
            const buyStr = valuePicks.map(p =>
                `${p.web_name} (${getPositionShort(p.element_type)}, £${p.price}m, Form: ${p.form}, Pts: ${p.total_points}, Own: ${p.selected_by_percent}%)`
            ).join('\n')
            const sellStr = sellCandidates.map(p =>
                `${p.web_name} (${getPositionShort(p.element_type)}, £${p.price}m, Form: ${p.form}, Status: ${p.status === 'a' ? 'Available' : 'Injured/Doubtful'})`
            ).join('\n')

            const prompt = `You are an FPL transfer expert. Given a budget of £${budget}m, suggest the best transfers for GW${currentGw.id}.

Best value players to BUY:
${buyStr}

Popular players to consider SELLING:
${sellStr}

Provide:
1. Top 3 recommended transfers (who to sell → who to buy)
2. Budget-friendly picks under £6m
3. Premium picks worth splashing on
4. One-week punt (short-term pick for this GW)

Keep recommendations actionable and specific. Mention price and reasoning.`

            const response = await callGemini(apiKey, prompt)
            setSuggestions(response)
            setSavedGw(currentGw.id)
            if (wallet) saveAiResult(wallet, 'transfers', currentGw.id, response)
        } catch (err) {
            setSuggestions('❌ Error: ' + err.message)
        }
        setAnalyzing(false)
    }

    if (loading) {
        return (
            <div className={styles.page}>
                <h1 className="page-title">Transfer Suggestions</h1>
                <div className="shimmer" style={{ height: 400, borderRadius: 'var(--radius)' }} />
            </div>
        )
    }

    return (
        <div className={styles.page}>
            <div className={styles.premiumHeader}>
                <h1 className="page-title">Transfer Suggestions</h1>
                <span className={styles.premiumBadge}>AI PREMIUM</span>
            </div>
            <p className={styles.subtitle}>AI-powered transfer recommendations based on form, value, and fixtures</p>

            {!apiKey ? (
                <button className={styles.openSettingsBtn} onClick={openSettings}>
                    ⚙️ Open Settings to configure API Key
                </button>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Budget:</span>
                        <input
                            className={styles.aiKeyInput}
                            type="number"
                            value={budget}
                            onChange={e => setBudget(Number(e.target.value))}
                            style={{ width: 80, maxWidth: 80 }}
                        />
                    </div>
                    <button className={styles.aiBtn} onClick={handleSuggest} disabled={analyzing}>
                        {analyzing ? '⏳ Analyzing...' : '💡 Get Suggestions'}
                    </button>
                </div>
            )}

            <div className={styles.transferGrid}>
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>🟢 Value Picks (Buy)</div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr><th>#</th><th>Player</th><th>Pos</th><th>Price</th><th>Form</th><th>Fixtures</th></tr>
                            </thead>
                            <tbody>
                                {valuePicks.map(p => {
                                    const team = getTeam(p.team)
                                    return (
                                        <tr key={p.id} onClick={() => navigate(`/players/${p.id}`)}>
                                            <td style={{ color: 'var(--text-muted)' }}>{valuePicks.indexOf(p) + 1}</td>
                                            <td>
                                                <div className={styles.playerCell}>
                                                    {team && <img src={getTeamBadgeUrl(team.code)} alt="" className={styles.teamBadge} />}
                                                    <span className={styles.playerName}>{p.web_name}</span>
                                                </div>
                                            </td>
                                            <td><span className={posClass(p.element_type)}>{getPositionShort(p.element_type)}</span></td>
                                            <td>£{p.price.toFixed(1)}m</td>
                                            <td className={styles.formHigh}>{p.form}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 2 }}>
                                                    {p.upcoming.map((f, j) => (
                                                        <span key={j} className={styles.fdrCell} style={{ background: getDifficultyColor(f.difficulty), fontSize: '0.6rem' }}>
                                                            {f.opponent}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionTitle}>🔴 Consider Selling</div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr><th>#</th><th>Player</th><th>Pos</th><th>Price</th><th>Form</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                                {sellCandidates.map(p => {
                                    const team = getTeam(p.team)
                                    return (
                                        <tr key={p.id} onClick={() => navigate(`/players/${p.id}`)}>
                                            <td style={{ color: 'var(--text-muted)' }}>{sellCandidates.indexOf(p) + 1}</td>
                                            <td>
                                                <div className={styles.playerCell}>
                                                    {team && <img src={getTeamBadgeUrl(team.code)} alt="" className={styles.teamBadge} />}
                                                    <span className={styles.playerName}>{p.web_name}</span>
                                                </div>
                                            </td>
                                            <td><span className={posClass(p.element_type)}>{getPositionShort(p.element_type)}</span></td>
                                            <td>£{p.price.toFixed(1)}m</td>
                                            <td className={styles.formLow}>{p.form}</td>
                                            <td style={{ color: p.status !== 'a' ? 'var(--red)' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem' }}>
                                                {p.status !== 'a' ? '⚠ Unavail' : 'Low form'}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {suggestions && (
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>AI Transfer Plan</div>
                    <div className={styles.aiResult} dangerouslySetInnerHTML={{ __html: formatAiResponse(suggestions) }} />
                </div>
            )}
        </div>
    )
}
