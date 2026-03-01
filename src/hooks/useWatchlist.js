import { useState } from 'react'

export function useWatchlist() {
    const [ids, setIds] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('watchlist') || '[]')
        } catch { return [] }
    })

    const save = (newIds) => {
        setIds(newIds)
        localStorage.setItem('watchlist', JSON.stringify(newIds))
    }

    const add = (id) => { if (!ids.includes(id)) save([...ids, id]) }
    const remove = (id) => save(ids.filter(i => i !== id))
    const has = (id) => ids.includes(id)
    const toggle = (id) => has(id) ? remove(id) : add(id)

    return { ids, add, remove, has, toggle }
}
