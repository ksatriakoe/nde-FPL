import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { supabase } from '../services/supabase'
import { swapTokenList as fallbackTokenList } from '../services/swapConstants'

const TokenListContext = createContext({ tokens: [], loading: true, refresh: () => {} })

export function TokenListProvider({ children }) {
    const [tokens, setTokens] = useState(fallbackTokenList)
    const [loading, setLoading] = useState(true)

    const fetchTokens = useCallback(async () => {
        if (!supabase) {
            setTokens(fallbackTokenList)
            setLoading(false)
            return
        }
        try {
            const { data, error } = await supabase
                .from('swap_tokens')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true })

            if (!error && data && data.length > 0) {
                setTokens(data.map(t => ({
                    address: t.address,
                    name: t.name,
                    symbol: t.symbol,
                    decimals: t.decimals,
                    logoURI: t.logo_uri || '',
                })))
            } else {
                // Fallback to hardcoded list if Supabase fails or empty
                setTokens(fallbackTokenList)
            }
        } catch {
            setTokens(fallbackTokenList)
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        fetchTokens()
    }, [fetchTokens])

    return (
        <TokenListContext.Provider value={{ tokens, loading, refresh: fetchTokens }}>
            {children}
        </TokenListContext.Provider>
    )
}

export function useTokenList() {
    return useContext(TokenListContext)
}
