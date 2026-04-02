import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCryptoMarket, calculateRSI, calculateMACD } from '../services/cryptoApi'

const STALE_TIME = 10 * 60 * 1000 // 10 minutes

export function useCryptoData() {
    const [coin, setCoin] = useState('bitcoin')
    const [days, setDays] = useState(30)

    const { data, isLoading, error, dataUpdatedAt, refetch } = useQuery({
        queryKey: ['crypto-market', coin, days],
        queryFn: () => fetchCryptoMarket(coin, days),
        staleTime: STALE_TIME,
        refetchInterval: STALE_TIME,
        refetchOnWindowFocus: false,
        retry: 2,
    })

    const priceData = data?.prices?.map(([ts, price]) => ({
        time: Math.floor(ts / 1000),
        value: price,
    })) || []

    const volumeData = data?.total_volumes?.map(([ts, vol]) => ({
        time: Math.floor(ts / 1000),
        value: vol,
    })) || []

    const rsiData = data?.prices ? calculateRSI(data.prices) : []
    const macdData = data?.prices ? calculateMACD(data.prices) : { macd: [], signal: [], histogram: [] }

    const selectCoin = useCallback((c) => setCoin(c), [])
    const selectDays = useCallback((d) => setDays(d), [])

    return {
        coin,
        days,
        selectCoin,
        selectDays,
        priceData,
        volumeData,
        rsiData,
        macdData,
        info: data?.info || {},
        cached: data?.cached || false,
        cachedAt: data?.cached_at || null,
        loading: isLoading,
        error,
        dataUpdatedAt,
        refetch,
    }
}
