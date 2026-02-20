export default async function handler(req, res) {
    const { path } = req.query
    const apiPath = Array.isArray(path) ? path.join('/') : path
    const url = `https://fantasy.premierleague.com/api/${apiPath}`

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; FPLScout/1.0)',
            },
        })

        if (!response.ok) {
            return res.status(response.status).json({ error: 'FPL API error' })
        }

        const data = await response.json()

        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
        res.setHeader('Access-Control-Allow-Origin', '*')
        return res.status(200).json(data)
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch from FPL API' })
    }
}
