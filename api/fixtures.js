export default async function handler(req, res) {
    try {
        const response = await fetch('https://fantasy.premierleague.com/api/fixtures/', {
            headers: { 'User-Agent': 'Mozilla/5.0' },
        })
        const data = await response.json()
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
        return res.status(200).json(data)
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}
