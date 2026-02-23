const isDev = import.meta.env.DEV

function apiUrl(path) {
    if (isDev) {
        return `/api/fpl/${path}`
    }
    return `/api/${path}`
}

export async function fetchBootstrap() {
    const url = isDev ? '/api/fpl/bootstrap-static/' : '/api/bootstrap-static'
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch bootstrap data')
    return res.json()
}

export async function fetchFixtures() {
    const url = isDev ? '/api/fpl/fixtures/' : '/api/fixtures'
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch fixtures')
    return res.json()
}

export async function fetchLive(gw) {
    const url = isDev ? `/api/fpl/event/${gw}/live/` : `/api/live?gw=${gw}`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch live data')
    return res.json()
}

export async function fetchPlayerSummary(playerId) {
    const url = isDev ? `/api/fpl/element-summary/${playerId}/` : `/api/element-summary?id=${playerId}`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch player summary')
    return res.json()
}

export async function fetchManager(managerId) {
    const url = isDev ? `/api/fpl/entry/${managerId}/` : `/api/entry?id=${managerId}`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch manager data')
    return res.json()
}

export async function fetchManagerPicks(managerId, gw) {
    const url = isDev ? `/api/fpl/entry/${managerId}/event/${gw}/picks/` : `/api/entry-picks?id=${managerId}&gw=${gw}`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch manager picks')
    return res.json()
}

export async function fetchManagerHistory(managerId) {
    const url = isDev ? `/api/fpl/entry/${managerId}/history/` : `/api/entry-history?id=${managerId}`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch manager history')
    return res.json()
}

export function getTeamBadgeUrl(teamCode) {
    return `https://resources.premierleague.com/premierleague/badges/70/t${teamCode}.png`
}

export function getPlayerPhotoUrl(photo) {
    return `https://resources.premierleague.com/premierleague/photos/players/110x140/p${photo}`
}

export function getPositionShort(typeId) {
    const map = { 1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD' }
    return map[typeId] || '?'
}

export function getDifficultyColor(fdr) {
    if (fdr <= 2) return 'var(--fdr-easy)'
    if (fdr === 3) return 'var(--fdr-medium)'
    if (fdr === 4) return 'var(--fdr-hard)'
    return 'var(--fdr-very-hard)'
}

export function getDifficultyLabel(fdr) {
    if (fdr <= 2) return 'Easy'
    if (fdr === 3) return 'Medium'
    if (fdr === 4) return 'Hard'
    return 'Very Hard'
}
