import { createClient } from '@supabase/supabase-js'

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

const VALID_COINS = ['bitcoin', 'ethereum', 'binancecoin', 'solana']
const VALID_DAYS = [1, 7, 30]

function getSupabase() {
    const url = process.env.VITE_SUPABASE_URL
    const key = process.env.VITE_SUPABASE_ANON_KEY
    if (!url || !key) return null
    return createClient(url, key)
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET')

    const coin = req.query.coin || 'bitcoin'
    const days = parseInt(req.query.days) || 30

    if (!VALID_COINS.includes(coin)) {
        return res.status(400).json({ error: `Invalid coin. Valid: ${VALID_COINS.join(', ')}` })
    }
    if (!VALID_DAYS.includes(days)) {
        return res.status(400).json({ error: `Invalid days. Valid: ${VALID_DAYS.join(', ')}` })
    }

    const cacheId = `${coin}_${days}`
    const supabase = getSupabase()

    // 1. Check Supabase cache
    if (supabase) {
        try {
            const { data: cached } = await supabase
                .from('crypto_cache')
                .select('data, updated_at')
                .eq('id', cacheId)
                .single()

            if (cached) {
                const age = Date.now() - new Date(cached.updated_at).getTime()
                if (age < CACHE_TTL_MS) {
                    return res.status(200).json({
                        ...cached.data,
                        cached: true,
                        cached_at: cached.updated_at,
                    })
                }
            }
        } catch (e) {
            // Cache miss, proceed to fetch
        }
    }

    // 2. Fetch from CoinGecko
    try {
        const apiKey = process.env.COINGECKO_API_KEY
        const headers = { Accept: 'application/json' }
        if (apiKey) {
            headers['x-cg-demo-api-key'] = apiKey
        }

        const url = `${COINGECKO_BASE}/coins/${coin}/market_chart?vs_currency=usd&days=${days}&precision=2`
        const response = await fetch(url, { headers })

        if (!response.ok) {
            const text = await response.text()
            return res.status(502).json({
                error: `CoinGecko API returned ${response.status}`,
                detail: text.slice(0, 300),
            })
        }

        const data = await response.json()

        // Also fetch current price info
        const infoUrl = `${COINGECKO_BASE}/coins/${coin}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`
        const infoRes = await fetch(infoUrl, { headers })
        let info = {}
        if (infoRes.ok) {
            const infoData = await infoRes.json()
            info = {
                name: infoData.name,
                symbol: infoData.symbol,
                image: infoData.image?.small,
                current_price: infoData.market_data?.current_price?.usd,
                price_change_24h: infoData.market_data?.price_change_percentage_24h,
                market_cap: infoData.market_data?.market_cap?.usd,
                total_volume: infoData.market_data?.total_volume?.usd,
                high_24h: infoData.market_data?.high_24h?.usd,
                low_24h: infoData.market_data?.low_24h?.usd,
            }
        }

        const result = {
            coin_id: coin,
            days,
            prices: data.prices,
            total_volumes: data.total_volumes,
            info,
        }

        // 3. Save to Supabase cache
        if (supabase) {
            try {
                await supabase.from('crypto_cache').upsert({
                    id: cacheId,
                    coin_id: coin,
                    days,
                    data: result,
                    updated_at: new Date().toISOString(),
                })
            } catch (e) {
                // Cache write failure is non-critical
            }
        }

        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
        return res.status(200).json({ ...result, cached: false })
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}
