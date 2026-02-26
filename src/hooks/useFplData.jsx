import { useState, useEffect, createContext, useContext } from 'react'
import { fetchBootstrap, fetchFixtures, fetchLive } from '../services/fplApi'

const FplContext = createContext(null)

export function FplProvider({ children }) {
    const [data, setData] = useState(null)
    const [fixtures, setFixtures] = useState(null)
    const [liveData, setLiveData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        async function load() {
            try {
                setLoading(true)
                const [bootstrap, fixtureList] = await Promise.all([
                    fetchBootstrap(),
                    fetchFixtures(),
                ])
                setData(bootstrap)
                setFixtures(fixtureList)

                const currentGw = bootstrap.events.find(e => e.is_current)
                if (currentGw) {
                    try {
                        const live = await fetchLive(currentGw.id)
                        setLiveData(live)
                    } catch (e) {
                        // live data might not be available
                    }
                }
            } catch (err) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const teams = data?.teams || []
    const players = data?.elements || []
    const events = data?.events || []
    const elementTypes = data?.element_types || []

    const currentGw = events.find(e => e.is_current)
    const nextGw = events.find(e => e.is_next)
    // For forward-looking pages: use nextGw when currentGw is finished
    const targetGw = (currentGw?.finished ? nextGw : currentGw) || nextGw || currentGw

    const getTeam = (id) => teams.find(t => t.id === id)
    const getPlayer = (id) => players.find(p => p.id === id)
    const getPosition = (id) => elementTypes.find(t => t.id === id)

    return (
        <FplContext.Provider value={{
            data, fixtures, liveData, loading, error,
            teams, players, events, elementTypes,
            currentGw, nextGw, targetGw,
            getTeam, getPlayer, getPosition,
        }}>
            {children}
        </FplContext.Provider>
    )
}

export function useFpl() {
    const ctx = useContext(FplContext)
    if (!ctx) throw new Error('useFpl must be inside FplProvider')
    return ctx
}
