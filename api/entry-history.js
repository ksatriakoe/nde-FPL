const FPL_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://fantasy.premierleague.com/',
    'Origin': 'https://fantasy.premierleague.com',
}

async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        const res = await fetch(url, { headers: FPL_HEADERS })
        if (res.ok) return res
        if (i < retries - 1) await new Promise(r => setTimeout(r, 500 * (i + 1)))
    }
    return fetch(url, { headers: FPL_HEADERS })
}

export default async function handler(req, res) {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'Missing id parameter' })

    try {
        const response = await fetchWithRetry(`https://fantasy.premierleague.com/api/entry/${id}/history/`)
        if (!response.ok) {
            const text = await response.text()
            return res.status(502).json({ error: `FPL API returned ${response.status}`, detail: text.slice(0, 200) })
        }
        const data = await response.json()
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
        return res.status(200).json(data)
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}
