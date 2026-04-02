import { useEffect, useRef, useState, Component } from 'react'
import { createChart, ColorType, LineStyle, AreaSeries, LineSeries, HistogramSeries } from 'lightweight-charts'
import { useCryptoData } from '../../hooks/useCryptoData'
import { COINS, formatPrice, formatLargeNumber, formatPercent, timeAgo } from '../../services/cryptoApi'
import styles from './CryptoCharts.module.css'

const TIMEFRAMES = [
    { label: '1D', value: 1 },
    { label: '7D', value: 7 },
    { label: '30D', value: 30 },
]

/* ── Error Boundary ── */
class ChartErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false }
    }
    static getDerivedStateFromError() {
        return { hasError: true }
    }
    componentDidCatch(err) {
        console.warn('Chart render error:', err.message)
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    Chart rendering error — try switching timeframe
                </div>
            )
        }
        return this.props.children
    }
}

/* ── Chart Options Factory ── */
function getChartOptions(height) {
    return {
        height,
        layout: {
            background: { type: ColorType.Solid, color: 'transparent' },
            textColor: '#8892A6',
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
        },
        grid: {
            vertLines: { color: 'rgba(255,255,255,0.04)' },
            horzLines: { color: 'rgba(255,255,255,0.04)' },
        },
        crosshair: {
            vertLine: { color: 'rgba(34,211,238,0.3)', labelBackgroundColor: '#16213A' },
            horzLine: { color: 'rgba(34,211,238,0.3)', labelBackgroundColor: '#16213A' },
        },
        rightPriceScale: {
            borderColor: 'rgba(255,255,255,0.08)',
        },
        timeScale: {
            borderColor: 'rgba(255,255,255,0.08)',
            timeVisible: true,
            secondsVisible: false,
        },
        handleScroll: { mouseWheel: true, pressedMouseMove: true },
        handleScale: { mouseWheel: true, pinch: true },
    }
}

/* ── Responsive height helper ── */
function isMobile() {
    return typeof window !== 'undefined' && window.innerWidth <= 640
}

/* ── Price Chart Component ── */
function PriceChart({ data, volumeData, color }) {
    const containerRef = useRef(null)
    const chartRef = useRef(null)

    useEffect(() => {
        if (!containerRef.current || !data || data.length === 0) return

        // Cleanup previous chart
        if (chartRef.current) {
            try { chartRef.current.remove() } catch (e) { /* ignore */ }
            chartRef.current = null
        }

        try {
            const chart = createChart(containerRef.current, {
                ...getChartOptions(isMobile() ? 240 : 320),
                width: containerRef.current.clientWidth,
            })
            chartRef.current = chart

            const areaSeries = chart.addSeries(AreaSeries, {
                lineColor: color,
                topColor: color + '40',
                bottomColor: color + '05',
                lineWidth: 2,
                crosshairMarkerRadius: 4,
                priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
            })
            areaSeries.setData(data)

            if (volumeData && volumeData.length > 0) {
                const volSeries = chart.addSeries(HistogramSeries, {
                    color: 'rgba(34, 211, 238, 0.15)',
                    priceFormat: { type: 'volume' },
                    priceScaleId: 'volume',
                })
                chart.priceScale('volume').applyOptions({
                    scaleMargins: { top: 0.85, bottom: 0 },
                })
                volSeries.setData(volumeData)
            }

            chart.timeScale().fitContent()

            const handleResize = () => {
                if (chartRef.current && containerRef.current) {
                    chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
                }
            }
            window.addEventListener('resize', handleResize)

            return () => {
                window.removeEventListener('resize', handleResize)
                if (chartRef.current) {
                    try { chartRef.current.remove() } catch (e) { /* ignore */ }
                    chartRef.current = null
                }
            }
        } catch (err) {
            console.warn('PriceChart creation error:', err)
        }
    }, [data, volumeData, color])

    return <div ref={containerRef} className={styles.chartContainer} />
}

/* ── RSI Chart Component ── */
function RSIChart({ data }) {
    const containerRef = useRef(null)
    const chartRef = useRef(null)

    useEffect(() => {
        if (!containerRef.current || !data || data.length === 0) return

        if (chartRef.current) {
            try { chartRef.current.remove() } catch (e) { /* ignore */ }
            chartRef.current = null
        }

        try {
            const chart = createChart(containerRef.current, {
                ...getChartOptions(isMobile() ? 160 : 180),
                width: containerRef.current.clientWidth,
            })
            chartRef.current = chart

            // Overbought line (70)
            const overLine = chart.addSeries(LineSeries, {
                color: 'rgba(239, 68, 68, 0.4)',
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                priceLineVisible: false,
                lastValueVisible: false,
                crosshairMarkerVisible: false,
            })
            overLine.setData(data.map(d => ({ time: d.time, value: 70 })))

            // Oversold line (30)
            const underLine = chart.addSeries(LineSeries, {
                color: 'rgba(34, 197, 94, 0.4)',
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                priceLineVisible: false,
                lastValueVisible: false,
                crosshairMarkerVisible: false,
            })
            underLine.setData(data.map(d => ({ time: d.time, value: 30 })))

            // RSI line
            const rsiSeries = chart.addSeries(LineSeries, {
                color: '#A78BFA',
                lineWidth: 2,
                crosshairMarkerRadius: 3,
                priceFormat: { type: 'price', precision: 1, minMove: 0.1 },
            })
            rsiSeries.setData(data)

            chart.timeScale().fitContent()

            const handleResize = () => {
                if (chartRef.current && containerRef.current) {
                    chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
                }
            }
            window.addEventListener('resize', handleResize)

            return () => {
                window.removeEventListener('resize', handleResize)
                if (chartRef.current) {
                    try { chartRef.current.remove() } catch (e) { /* ignore */ }
                    chartRef.current = null
                }
            }
        } catch (err) {
            console.warn('RSIChart creation error:', err)
        }
    }, [data])

    return <div ref={containerRef} className={styles.chartContainer} />
}

/* ── MACD Chart Component ── */
function MACDChart({ data }) {
    const containerRef = useRef(null)
    const chartRef = useRef(null)

    useEffect(() => {
        if (!containerRef.current || !data || !data.macd || data.macd.length === 0) return

        if (chartRef.current) {
            try { chartRef.current.remove() } catch (e) { /* ignore */ }
            chartRef.current = null
        }

        try {
            const chart = createChart(containerRef.current, {
                ...getChartOptions(isMobile() ? 160 : 180),
                width: containerRef.current.clientWidth,
            })
            chartRef.current = chart

            // Histogram
            const histSeries = chart.addSeries(HistogramSeries, {
                priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
                priceScaleId: 'macd',
            })
            histSeries.setData(data.histogram)

            // MACD line
            const macdSeries = chart.addSeries(LineSeries, {
                color: '#22D3EE',
                lineWidth: 2,
                priceScaleId: 'macd',
                priceLineVisible: false,
                lastValueVisible: false,
                crosshairMarkerRadius: 3,
            })
            macdSeries.setData(data.macd)

            // Signal line
            const signalSeries = chart.addSeries(LineSeries, {
                color: '#F59E0B',
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                priceScaleId: 'macd',
                priceLineVisible: false,
                lastValueVisible: false,
                crosshairMarkerRadius: 3,
            })
            signalSeries.setData(data.signal)

            chart.timeScale().fitContent()

            const handleResize = () => {
                if (chartRef.current && containerRef.current) {
                    chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
                }
            }
            window.addEventListener('resize', handleResize)

            return () => {
                window.removeEventListener('resize', handleResize)
                if (chartRef.current) {
                    try { chartRef.current.remove() } catch (e) { /* ignore */ }
                    chartRef.current = null
                }
            }
        } catch (err) {
            console.warn('MACDChart creation error:', err)
        }
    }, [data])

    return <div ref={containerRef} className={styles.chartContainer} />
}

/* ── RSI Status helper ── */
function getRSIStatus(value) {
    if (value >= 70) return { label: 'Overbought', cls: styles.statusOverbought }
    if (value <= 30) return { label: 'Oversold', cls: styles.statusOversold }
    return { label: 'Neutral', cls: styles.statusNeutral }
}

/* ── Main Page ── */
export default function CryptoCharts() {
    const {
        coin, days, selectCoin, selectDays,
        priceData, volumeData, rsiData, macdData,
        info, cached, cachedAt, loading, error, dataUpdatedAt,
    } = useCryptoData()

    const coinMeta = COINS[coin]
    const currentRSI = rsiData.length ? rsiData[rsiData.length - 1].value : null
    const rsiStatus = currentRSI !== null ? getRSIStatus(currentRSI) : null

    const currentMACD = macdData.macd?.length ? macdData.macd[macdData.macd.length - 1].value : null
    const currentSignal = macdData.signal?.length ? macdData.signal[macdData.signal.length - 1].value : null
    const macdTrend = currentMACD !== null && currentSignal !== null
        ? currentMACD > currentSignal ? 'Bullish' : 'Bearish'
        : null

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerTop}>
                    <h1>Crypto Charts</h1>
                    <span className={styles.premiumBadge}>PREMIUM</span>
                </div>
                <p className={styles.subtitle}>
                    Technical analysis — Price, RSI & MACD indicators
                </p>
            </div>

            {/* Controls */}
            <div className={styles.controls}>
                <div className={styles.coinTabs}>
                    {Object.entries(COINS).map(([id, meta]) => (
                        <button
                            key={id}
                            className={coin === id ? styles.coinTabActive : styles.coinTab}
                            onClick={() => selectCoin(id)}
                            style={coin === id ? { '--coin-color': meta.color } : {}}
                        >
                            {coin === id && info.image && (
                                <img src={info.image} alt="" className={styles.coinIcon} />
                            )}
                            <span className={styles.coinSymbol}>{meta.symbol}</span>
                            <span className={styles.coinName}>{meta.name}</span>
                        </button>
                    ))}
                </div>
                <div className={styles.timeframeRow}>
                    <div className={styles.timeframeTabs}>
                        {TIMEFRAMES.map(tf => (
                            <button
                                key={tf.value}
                                className={days === tf.value ? styles.tfBtnActive : styles.tfBtn}
                                onClick={() => selectDays(tf.value)}
                            >
                                {tf.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className={styles.errorBanner}>
                    ⚠️ Failed to load data: {error.message}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className={styles.loadingState}>
                    <div className={styles.spinner} />
                    <span>Loading {coinMeta.name} data...</span>
                </div>
            )}

            {/* Content */}
            {!loading && !error && priceData.length > 0 && (
                <>
                    {/* Price Stats */}
                    <div className={styles.statsRow}>
                        <div className={styles.statCard}>
                            <span className={styles.statLabel}>Current Price</span>
                            <span className={styles.statValue} style={{ color: coinMeta.color }}>
                                {formatPrice(info.current_price)}
                            </span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statLabel}>24h Change</span>
                            <span className={`${styles.statValue} ${info.price_change_24h >= 0 ? styles.green : styles.red}`}>
                                {formatPercent(info.price_change_24h)}
                            </span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statLabel}>24h High / Low</span>
                            <span className={styles.statValueSm}>
                                <span className={styles.green}>{formatPrice(info.high_24h)}</span>
                                {' / '}
                                <span className={styles.red}>{formatPrice(info.low_24h)}</span>
                            </span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statLabel}>Market Cap</span>
                            <span className={styles.statValue}>{formatLargeNumber(info.market_cap)}</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statLabel}>24h Volume</span>
                            <span className={styles.statValue}>{formatLargeNumber(info.total_volume)}</span>
                        </div>
                    </div>

                    {/* Price Chart */}
                    <div className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <div className={styles.chartTitle}>
                                <span className={styles.chartDot} style={{ background: coinMeta.color }} />
                                Price Chart
                            </div>
                            <span className={styles.chartTimeframe}>{days}D</span>
                        </div>
                        <ChartErrorBoundary>
                            <PriceChart data={priceData} volumeData={volumeData} color={coinMeta.color} />
                        </ChartErrorBoundary>
                    </div>

                    {/* RSI & MACD side by side on desktop */}
                    <div className={styles.indicatorGrid}>
                        {/* RSI */}
                        <div className={styles.chartCard}>
                            <div className={styles.chartHeader}>
                                <div className={styles.chartTitle}>
                                    <span className={styles.chartDot} style={{ background: '#A78BFA' }} />
                                    RSI
                                    <span className={styles.chartPeriod}>(14)</span>
                                </div>
                                {rsiStatus && (
                                    <span className={rsiStatus.cls}>
                                        {currentRSI?.toFixed(1)} — {rsiStatus.label}
                                    </span>
                                )}
                            </div>
                            <ChartErrorBoundary>
                                <RSIChart data={rsiData} />
                            </ChartErrorBoundary>
                            <div className={styles.chartLegend}>
                                <span><span className={styles.legendDot} style={{ background: '#A78BFA' }} /> RSI</span>
                                <span><span className={styles.legendLine} style={{ borderColor: 'rgba(239,68,68,0.5)' }} /> 70 Overbought</span>
                                <span><span className={styles.legendLine} style={{ borderColor: 'rgba(34,197,94,0.5)' }} /> 30 Oversold</span>
                            </div>
                        </div>

                        {/* MACD */}
                        <div className={styles.chartCard}>
                            <div className={styles.chartHeader}>
                                <div className={styles.chartTitle}>
                                    <span className={styles.chartDot} style={{ background: '#22D3EE' }} />
                                    MACD
                                    <span className={styles.chartPeriod}>(12, 26, 9)</span>
                                </div>
                                {macdTrend && (
                                    <span className={macdTrend === 'Bullish' ? styles.statusBullish : styles.statusBearish}>
                                        {macdTrend}
                                    </span>
                                )}
                            </div>
                            <ChartErrorBoundary>
                                <MACDChart data={macdData} />
                            </ChartErrorBoundary>
                            <div className={styles.chartLegend}>
                                <span><span className={styles.legendDot} style={{ background: '#22D3EE' }} /> MACD</span>
                                <span><span className={styles.legendDot} style={{ background: '#F59E0B' }} /> Signal</span>
                                <span><span className={styles.legendDot} style={{ background: 'rgba(34,197,94,0.6)' }} /> Histogram</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className={styles.footer}>
                        <span className={styles.footerInfo}>
                            {cached && <>📦 Cached • </>}
                            Updated {dataUpdatedAt ? timeAgo(new Date(dataUpdatedAt).toISOString()) : '—'}
                        </span>
                        <span className={styles.footerHint}>
                            Data by CoinGecko
                        </span>
                    </div>
                </>
            )}
        </div>
    )
}
