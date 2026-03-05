export function formatBalance(balance, maxDecimals = 4) {
    try {
        if (balance === null || balance === undefined || balance === '') return '0'
        const num = parseFloat(balance)
        if (isNaN(num) || num === 0) return '0'
        if (num < 0.0001 && num > 0) return '< 0.0001'
        // Smart decimal: if effectively whole number, show without decimals
        if (num % 1 === 0) return Math.round(num).toString()
        const fixed = num.toFixed(maxDecimals)
        // Strip trailing zeros: 1000.5000 → 1000.5, 0.1200 → 0.12
        return fixed.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
    } catch {
        return '0'
    }
}

export function formatSwapAmount(amount) {
    try {
        if (amount === null || amount === undefined || amount === '') return ''
        const num = parseFloat(amount)
        if (isNaN(num)) return ''
        if (num === 0) return '0'
        if (num < 0.000001 && num > 0) return '< 0.000001'
        // Smart decimal: if effectively whole number, show without decimals
        if (num % 1 === 0) return Math.round(num).toString()
        const str = num.toString()
        if (str.includes('e')) return num.toFixed(6).replace(/\.?0+$/, '')
        const parts = str.split('.')
        if (parts.length === 1) return str
        const decimals = parts[1].slice(0, 6)
        const trimmed = decimals.replace(/0+$/, '')
        return trimmed ? `${parts[0]}.${trimmed}` : parts[0]
    } catch {
        return ''
    }
}
