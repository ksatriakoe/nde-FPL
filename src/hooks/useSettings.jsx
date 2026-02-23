import { createContext, useContext } from 'react'

const SettingsContext = createContext({ openSettings: () => { } })

export const SettingsProvider = SettingsContext.Provider

export function useSettings() {
    return useContext(SettingsContext)
}
