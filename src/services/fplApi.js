import { supabase } from './supabase'

const isDev = import.meta.env.DEV

function apiUrl(path) {
    if (isDev) {
        return `/api/fpl/${path}`
    }
    return `/api/${path}`
}

async function fetchRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        const res = await fetch(url)
        if (res.ok) return res
        if (i < retries - 1) await new Promise(r => setTimeout(r, 800 * (i + 1)))
    }
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Request failed: ${res.status}`)
    return res
}

/** Read from Supabase fpl_cache table */
async function readCache(key) {
    if (!supabase) return null
    try {
        const { data, error } = await supabase
            .from('fpl_cache')
            .select('data, updated_at')
            .eq('key', key)
            .single()
        if (error || !data) return null
        return data.data
    } catch {
        return null
    }
}

export async function fetchBootstrap() {
    // Primary: Vercel proxy
    try {
        const url = isDev ? '/api/fpl/bootstrap-static/' : '/api/bootstrap-static'
        const res = await fetch(url)
        if (res.ok) return res.json()
    } catch { /* Vercel failed, try fallback */ }

    // Fallback: Supabase cache
    const cached = await readCache('bootstrap-static')
    if (cached) return cached
    throw new Error('Failed to fetch bootstrap data')
}

export async function fetchFixtures() {
    // Primary: Vercel proxy
    try {
        const url = isDev ? '/api/fpl/fixtures/' : '/api/fixtures'
        const res = await fetch(url)
        if (res.ok) return res.json()
    } catch { /* Vercel failed, try fallback */ }

    // Fallback: Supabase cache
    const cached = await readCache('fixtures')
    if (cached) return cached
    throw new Error('Failed to fetch fixtures')
}

export async function fetchLive(gw) {
    // Primary: Vercel proxy
    try {
        const url = isDev ? `/api/fpl/event/${gw}/live/` : `/api/live?gw=${gw}`
        const res = await fetch(url)
        if (res.ok) return res.json()
    } catch { /* Vercel failed, try fallback */ }

    // Fallback: Supabase cache
    const cached = await readCache(`live_${gw}`)
    if (cached) return cached
    throw new Error('Failed to fetch live data')
}

export async function fetchPlayerSummary(playerId) {
    const url = isDev ? `/api/fpl/element-summary/${playerId}/` : `/api/element-summary?id=${playerId}`
    const res = await fetchRetry(url)
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

/** Strip diacritics: Güéhi → Guehi, Söyüncü → Soyuncu */
export function normalizeText(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
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

/** Return status display info for a player status code */
export function getStatusInfo(status) {
    if (status === 'a') return null // available — no mark needed
    if (status === 'd') return { color: '#F59E0B', label: 'Doubtful', abbr: '?' }
    if (status === 'i') return { color: '#F43F5E', label: 'Injured', abbr: '!' }
    if (status === 's') return { color: '#F43F5E', label: 'Suspended', abbr: '!' }
    return { color: '#F43F5E', label: 'Unavailable', abbr: '!' }
}
