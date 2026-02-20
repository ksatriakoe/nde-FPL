export default async function handler(req, res) {
    try {
        const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', {
            headers: { 'User-Agent': 'Mozilla/5.0' },
        })
        if (!response.ok) {
            const text = await response.text()
            return res.status(502).json({ error: `FPL API returned ${response.status}`, detail: text.slice(0, 200) })
        }
        const data = await response.json()
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300')
        return res.status(200).json(data)
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}
