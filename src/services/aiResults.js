import { supabase } from './supabase'

/**
 * Load saved AI result for a user + type combo
 * @param {string} wallet - wallet_address (lowercase)
 * @param {string} type - 'captain_picks' | 'predictions' | 'gw_summary' | 'transfers'
 * @returns {object|null} { result, gameweek, updated_at } or null
 */
export async function loadAiResult(wallet, type) {
    if (!supabase || !wallet) return null
    try {
        const { data, error } = await supabase
            .from('ai_results')
            .select('result, gameweek, updated_at')
            .eq('wallet_address', wallet.toLowerCase())
            .eq('type', type)
            .single()

        if (error || !data) return null
        return data
    } catch {
        return null
    }
}

/**
 * Save (upsert) AI result for a user + type combo
 * @param {string} wallet - wallet_address (lowercase)
 * @param {string} type - 'captain_picks' | 'predictions' | 'gw_summary' | 'transfers'
 * @param {number} gameweek - current gameweek number
 * @param {string} result - AI-generated text
 */
export async function saveAiResult(wallet, type, gameweek, result) {
    if (!supabase || !wallet) return
    try {
        const { error } = await supabase
            .from('ai_results')
            .upsert(
                {
                    wallet_address: wallet.toLowerCase(),
                    type,
                    gameweek,
                    result,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'wallet_address,type' }
            )
        if (error) console.error('Save AI result error:', error)
    } catch (err) {
        console.error('Save AI result error:', err)
    }
}
