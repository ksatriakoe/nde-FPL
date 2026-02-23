/**
 * Convert AI response text to beautifully styled HTML.
 * Detects medal picks (🥇🥈🥉), headings, lists, and paragraphs.
 * Groups content into card-like sections when medal/heading patterns are found.
 */
export function formatAiResponse(text) {
    if (!text) return ''

    const lines = text.split('\n')
    const sections = []
    let currentSection = null

    for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) {
            if (currentSection) currentSection.lines.push('')
            continue
        }

        // Skip intro lines like "Here are my top 3..." or "Here's your..."
        if (/^(Here'?s?|Alright|Okay|Sure|Let me|Based on)/i.test(trimmed) && !currentSection) continue

        // Detect section starters: medals, ## headings, numbered headings like "1."
        const isMedal = /^(🥇|🥈|🥉|⚽|💡|📋|🔮|✨|🎯|🏆)/.test(trimmed)
        const isHeading = /^#{1,3}\s/.test(trimmed)
        const isNumberedSection = /^\d+\.\s\*\*/.test(trimmed) || /^###?\s?\d+\./.test(trimmed)

        if (isMedal || isHeading || isNumberedSection) {
            // Start a new section
            currentSection = { title: trimmed, lines: [], type: isMedal ? 'medal' : 'section' }
            sections.push(currentSection)
        } else if (currentSection) {
            currentSection.lines.push(trimmed)
        } else {
            // Standalone content before any section
            currentSection = { title: null, lines: [trimmed], type: 'text' }
            sections.push(currentSection)
        }
    }

    // Render sections
    return sections.map(sec => {
        if (sec.type === 'medal') return renderMedalCard(sec)
        if (sec.type === 'section') return renderSectionCard(sec)
        return renderTextBlock(sec)
    }).join('')
}

function renderMedalCard(sec) {
    const medalColors = {
        '🥇': { border: '#F59E0B', bg: 'rgba(245, 158, 11, 0.06)', glow: 'rgba(245, 158, 11, 0.15)' },
        '🥈': { border: '#94A3B8', bg: 'rgba(148, 163, 184, 0.06)', glow: 'rgba(148, 163, 184, 0.12)' },
        '🥉': { border: '#CD7F32', bg: 'rgba(205, 127, 50, 0.06)', glow: 'rgba(205, 127, 50, 0.12)' },
    }
    const medal = sec.title.substring(0, 2)
    const colors = medalColors[medal] || { border: '#3B82F6', bg: 'rgba(59, 130, 246, 0.06)' }

    const titleColor = medalColors[medal] ? colors.border : '#fff'

    const title = formatInline(cleanHeading(sec.title))
    const body = sec.lines.map(l => renderLine(l)).join('')

    return `<div style="background:#0F1626;border:none;border-left:3px solid ${colors.border};border-radius:10px;padding:1rem 1.2rem;margin:0.6rem 0">
        <div style="font-weight:700;font-size:0.95rem;margin-bottom:0.5rem;color:${titleColor}">${title}</div>
        <div style="color:#fff;font-size:0.83rem;line-height:1.7">${body}</div>
    </div>`
}

function renderSectionCard(sec) {
    const title = formatInline(cleanHeading(sec.title))
    const body = sec.lines.map(l => renderLine(l)).join('')

    return `<div style="background:#0F1626;border:none;border-left:3px solid #3B82F6;border-radius:10px;padding:1rem 1.2rem;margin:0.6rem 0">
        <div style="font-weight:700;font-size:0.92rem;margin-bottom:0.4rem;color:#3B82F6">${title}</div>
        <div style="color:#fff;font-size:0.83rem;line-height:1.7">${body}</div>
    </div>`
}

function renderTextBlock(sec) {
    return sec.lines.map(l => renderLine(l)).join('')
}

function renderLine(line) {
    if (!line) return '<div style="height:0.3rem"></div>'
    if (/^[-*]\s/.test(line)) return `<div style="padding-left:1rem;margin:0.2rem 0">• ${formatInline(line.slice(2))}</div>`
    if (/^\d+\.\s/.test(line)) return `<div style="padding-left:1rem;margin:0.2rem 0">${formatInline(line)}</div>`
    return `<div style="margin:0.2rem 0">${formatInline(line)}</div>`
}

function cleanHeading(text) {
    return text.replace(/^#{1,3}\s/, '').replace(/^\d+\.\s/, '')
}

function formatInline(text) {
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fff">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code style="background:rgba(59,130,246,0.12);padding:1px 5px;border-radius:3px;font-size:0.8rem">$1</code>')
}
