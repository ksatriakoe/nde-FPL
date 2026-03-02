/**
 * FPL Cache Updater — GitHub Actions script
 * Fetches FPL API data and stores it in Supabase as cache.
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const FPL_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://fantasy.premierleague.com/',
    'Origin': 'https://fantasy.premierleague.com',
}

async function fetchFPL(path) {
    const url = `https://fantasy.premierleague.com/api/${path}`
    for (let i = 0; i < 3; i++) {
        try {
            const res = await fetch(url, { headers: FPL_HEADERS })
            if (res.ok) return res.json()
            console.warn(`⚠️ FPL ${path} returned ${res.status} (attempt ${i + 1})`)
        } catch (err) {
            console.warn(`⚠️ FPL ${path} fetch error (attempt ${i + 1}):`, err.message)
        }
        if (i < 2) await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
    return null
}

async function upsertCache(key, data) {
    const { error } = await supabase
        .from('fpl_cache')
        .upsert(
            { key, data, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
        )
    if (error) {
        console.error(`❌ Failed to cache ${key}:`, error.message)
        return false
    }
    console.log(`✅ Cached ${key}`)
    return true
}

async function main() {
    console.log('🚀 Starting FPL cache update...')
    let success = 0
    let failed = 0

    // 1. Bootstrap Static (players, teams, events)
    const bootstrap = await fetchFPL('bootstrap-static/')
    if (bootstrap) {
        if (await upsertCache('bootstrap-static', bootstrap)) success++
        else failed++
    } else {
        console.error('❌ Could not fetch bootstrap-static')
        failed++
    }

    // 2. Fixtures
    const fixtures = await fetchFPL('fixtures/')
    if (fixtures) {
        if (await upsertCache('fixtures', fixtures)) success++
        else failed++
    } else {
        console.error('❌ Could not fetch fixtures')
        failed++
    }

    // 3. Live data for current gameweek
    if (bootstrap) {
        const currentGw = bootstrap.events?.find(e => e.is_current)
        if (currentGw) {
            const live = await fetchFPL(`event/${currentGw.id}/live/`)
            if (live) {
                if (await upsertCache(`live_${currentGw.id}`, live)) success++
                else failed++
            } else {
                console.warn(`⚠️ Could not fetch live data for GW${currentGw.id}`)
                failed++
            }
        }
    }

    console.log(`\n📊 Done: ${success} cached, ${failed} failed`)
    if (failed > 0 && success === 0) process.exit(1)
}

main().catch(err => {
    console.error('💥 Fatal error:', err)
    process.exit(1)
})
