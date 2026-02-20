export default async function handler(req, res) {
    const { gw } = req.query
    if (!gw) return res.status(400).json({ error: 'Missing gw parameter' })

    try {
        const response = await fetch(`https://fantasy.premierleague.com/api/event/${gw}/live/`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
        })
        const data = await response.json()
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
        return res.status(200).json(data)
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}
