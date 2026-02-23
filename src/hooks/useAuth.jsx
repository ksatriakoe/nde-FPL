import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { supabase } from '../services/supabase'

const AuthContext = createContext({
    wallet: null,
    isPremium: false,
    subscription: null,
    loading: true,
    checkSubscription: () => { },
})

export function AuthProvider({ children }) {
    const { address, isConnected } = useAccount()
    const [isPremium, setIsPremium] = useState(false)
    const [subscription, setSubscription] = useState(null)
    const [loading, setLoading] = useState(true)

    const checkSubscription = useCallback(async () => {
        if (!isConnected || !address || !supabase) {
            setIsPremium(false)
            setSubscription(null)
            setLoading(false)
            return
        }

        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('wallet_address', address.toLowerCase())
                .gte('expires_at', new Date().toISOString())
                .order('expires_at', { ascending: false })
                .limit(1)
                .single()

            if (data && !error) {
                setIsPremium(true)
                setSubscription(data)
            } else {
                setIsPremium(false)
                setSubscription(null)
            }
        } catch {
            setIsPremium(false)
            setSubscription(null)
        }
        setLoading(false)
    }, [address, isConnected])

    useEffect(() => {
        checkSubscription()
    }, [checkSubscription])

    return (
        <AuthContext.Provider value={{
            wallet: isConnected ? address : null,
            isPremium,
            subscription,
            loading,
            checkSubscription,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
