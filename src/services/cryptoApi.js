const IS_DEV = import.meta.env.DEV
const COINGECKO_BASE = IS_DEV ? '/api/coingecko/api/v3' : 'https://api.coingecko.com/api/v3'

const COINS = {
    bitcoin: { name: 'Bitcoin', symbol: 'BTC', color: '#F7931A' },
    ethereum: { name: 'Ethereum', symbol: 'ETH', color: '#627EEA' },
    binancecoin: { name: 'BNB', symbol: 'BNB', color: '#F3BA2F' },
    solana: { name: 'Solana', symbol: 'SOL', color: '#9945FF' },
}

export { COINS }

/* ── Fetch from CoinGecko directly (for dev mode) ── */
async function fetchFromCoinGecko(coin, days) {
    const headers = { Accept: 'application/json' }
    const apiKey = 'CGCGCG'
    const keyParam = `x_cg_demo_api_key=${apiKey}`

    // Market chart (price + volume history)
    const chartUrl = `${COINGECKO_BASE}/coins/${coin}/market_chart?vs_currency=usd&days=${days}&precision=2&${keyParam}`
    const chartRes = await fetch(chartUrl, { headers })
    if (!chartRes.ok) throw new Error(`CoinGecko API returned ${chartRes.status}`)
    const chartData = await chartRes.json()

    // Current coin info
    const infoUrl = `${COINGECKO_BASE}/coins/${coin}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false&${keyParam}`
    const infoRes = await fetch(infoUrl, { headers })
    let info = {}
    if (infoRes.ok) {
        const d = await infoRes.json()
        info = {
            name: d.name,
            symbol: d.symbol,
            image: d.image?.small,
            current_price: d.market_data?.current_price?.usd,
            price_change_24h: d.market_data?.price_change_percentage_24h,
            market_cap: d.market_data?.market_cap?.usd,
            total_volume: d.market_data?.total_volume?.usd,
            high_24h: d.market_data?.high_24h?.usd,
            low_24h: d.market_data?.low_24h?.usd,
        }
    }

    return {
        coin_id: coin,
        days,
        prices: chartData.prices,
        total_volumes: chartData.total_volumes,
        info,
        cached: false,
    }
}

/* ── Fetch market data ── */
export async function fetchCryptoMarket(coin = 'bitcoin', days = 30) {
    // Dev mode: call CoinGecko directly (serverless functions don't run locally)
    if (IS_DEV) {
        return fetchFromCoinGecko(coin, days)
    }

    // Production: use Vercel serverless function (with Supabase caching)
    const res = await fetch(`/api/crypto-market?coin=${coin}&days=${days}`)
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
    }
    return res.json()
}

/* ── RSI Calculation (14-period) ── */
export function calculateRSI(prices, period = 14) {
    if (!prices || prices.length < period + 1) return []

    const closes = prices.map(p => p[1])
    const rsiData = []

    let avgGain = 0
    let avgLoss = 0

    // Initial average
    for (let i = 1; i <= period; i++) {
        const change = closes[i] - closes[i - 1]
        if (change > 0) avgGain += change
        else avgLoss += Math.abs(change)
    }
    avgGain /= period
    avgLoss /= period

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    rsiData.push({
        time: Math.floor(prices[period][0] / 1000),
        value: parseFloat((100 - 100 / (1 + rs)).toFixed(2)),
    })

    // Subsequent values using smoothed method
    for (let i = period + 1; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1]
        const gain = change > 0 ? change : 0
        const loss = change < 0 ? Math.abs(change) : 0

        avgGain = (avgGain * (period - 1) + gain) / period
        avgLoss = (avgLoss * (period - 1) + loss) / period

        const rsI = avgLoss === 0 ? 100 : avgGain / avgLoss
        rsiData.push({
            time: Math.floor(prices[i][0] / 1000),
            value: parseFloat((100 - 100 / (1 + rsI)).toFixed(2)),
        })
    }

    return rsiData
}

/* ── EMA helper ── */
function ema(data, period) {
    const k = 2 / (period + 1)
    const result = [data[0]]
    for (let i = 1; i < data.length; i++) {
        result.push(data[i] * k + result[i - 1] * (1 - k))
    }
    return result
}

/* ── MACD Calculation (12, 26, 9) ── */
export function calculateMACD(prices, fast = 12, slow = 26, signal = 9) {
    if (!prices || prices.length < slow + signal) return { macd: [], signal: [], histogram: [] }

    const closes = prices.map(p => p[1])
    const emaFast = ema(closes, fast)
    const emaSlow = ema(closes, slow)

    // MACD Line = EMA(12) - EMA(26)
    const macdLine = emaFast.map((v, i) => v - emaSlow[i])

    // Signal Line = EMA(9) of MACD Line
    const signalLine = ema(macdLine.slice(slow - 1), signal)

    // Build result starting from where we have valid signal data
    const startIdx = slow - 1
    const macdData = []
    const signalData = []
    const histogramData = []

    for (let i = 0; i < signalLine.length; i++) {
        const idx = startIdx + i
        if (idx >= prices.length) break

        const time = Math.floor(prices[idx][0] / 1000)
        const macdVal = parseFloat(macdLine[idx].toFixed(2))
        const sigVal = parseFloat(signalLine[i].toFixed(2))
        const histVal = parseFloat((macdVal - sigVal).toFixed(2))

        macdData.push({ time, value: macdVal })
        signalData.push({ time, value: sigVal })
        histogramData.push({
            time,
            value: histVal,
            color: histVal >= 0
                ? 'rgba(34, 197, 94, 0.6)'
                : 'rgba(239, 68, 68, 0.6)',
        })
    }

    return { macd: macdData, signal: signalData, histogram: histogramData }
}

/* ── Format helpers ── */
export function formatPrice(n) {
    if (n == null) return '—'
    if (n >= 1000) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    if (n >= 1) return '$' + n.toFixed(2)
    return '$' + n.toFixed(4)
}

export function formatLargeNumber(n) {
    if (n == null) return '—'
    if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T'
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
    return '$' + n.toLocaleString()
}

export function formatPercent(n) {
    if (n == null) return '—'
    const sign = n >= 0 ? '+' : ''
    return sign + n.toFixed(2) + '%'
}

export function timeAgo(dateStr) {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    return `${hrs}h ago`
}
