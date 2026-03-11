import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWeb3 } from '../../hooks/useWeb3'
import { WETH_ADDRESS, erc20Abi, customAddresses, uniswapAddresses, aggregatorAddress } from '../../services/swapConstants'
import { useTokenBalance } from '../../hooks/useTokenBalance'
import { formatSwapAmount } from '../../services/formatBalance'
import TokenSelectModal from './TokenSelectModal'
import ConfirmModal from './ConfirmModal'
import s from './Swap.module.css'

export default function SwapTab({ showAlert, slippage }) {
    const {
        provider, signer, userAddress,
        customRouter, uniswapRouter, aggregatorContract,
        readAggregator,
        findRouter, findCrossRoute,
        refreshBalances,
    } = useWeb3()

    const [fromToken, setFromToken] = useState(null)
    const [toToken, setToToken] = useState(null)
    const [amountIn, setAmountIn] = useState('')
    const [amountOut, setAmountOut] = useState('')
    const [selectingFor, setSelectingFor] = useState(null)
    const [priceInfo, setPriceInfo] = useState(null)
    const [swapDetails, setSwapDetails] = useState(null)
    const [isSwapping, setIsSwapping] = useState(false)
    const [priceReversed, setPriceReversed] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [swapRoute, setSwapRoute] = useState(null) // { router, source } or { routerInFirst, source:'aggregator' }

    const { balance: fromBalance, formattedBalance: fromFmt, loading: fromLoading } = useTokenBalance(fromToken?.address)
    const { formattedBalance: toFmt, loading: toLoading } = useTokenBalance(toToken?.address)

    // Set default fromToken after WETH_ADDRESS is available
    useEffect(() => {
        if (!fromToken) {
            // Import defaultSwapToken dynamically to avoid circular issues
            import('../../services/swapConstants').then(m => setFromToken(m.defaultSwapToken))
        }
    }, [])

    useEffect(() => {
        if (amountIn && fromToken && toToken && (customRouter || uniswapRouter)) calculateAmountOut()
        else { setAmountOut(''); setSwapDetails(null); setSwapRoute(null) }
    }, [amountIn, fromToken, toToken, customRouter, uniswapRouter, slippage])

    const getPath = (a, b, wethAddr) => {
        const isFromETH = a.address.toLowerCase() === wethAddr.toLowerCase()
        const isToETH = b.address.toLowerCase() === wethAddr.toLowerCase()
        if (isFromETH || isToETH) return [ethers.getAddress(a.address), ethers.getAddress(b.address)]
        return [ethers.getAddress(a.address), ethers.getAddress(wethAddr), ethers.getAddress(b.address)]
    }

    const calculateAmountOut = async () => {
        try {
            const amount = parseFloat(amountIn)
            if (amount <= 0) { setAmountOut(''); return }

            const amountInParsed = ethers.parseUnits(amountIn, fromToken.decimals)

            // Collect all candidate routes and pick the best output
            let bestOut = 0n
            let bestFormatted = ''
            let bestRoute = null
            let bestPath = null
            let bestSource = null
            let bestRouter = null
            let bestRouterInFirst = null

            // 1. Try direct route (custom or Uniswap)
            const direct = await findRouter(fromToken.address, toToken.address)
            if (direct) {
                const isFromETH = fromToken.address.toLowerCase() === WETH_ADDRESS.toLowerCase()
                const isToETH = toToken.address.toLowerCase() === WETH_ADDRESS.toLowerCase()

                const directPath = [ethers.getAddress(fromToken.address), ethers.getAddress(toToken.address)]
                const multiPath = (!isFromETH && !isToETH)
                    ? [ethers.getAddress(fromToken.address), ethers.getAddress(WETH_ADDRESS), ethers.getAddress(toToken.address)]
                    : null

                // Attempt direct path [A, B]
                try {
                    const amounts = await direct.readRouter.getAmountsOut(amountInParsed, directPath)
                    const out = amounts[amounts.length - 1]
                    if (out > bestOut) {
                        bestOut = out
                        bestFormatted = ethers.formatUnits(out, toToken.decimals)
                        bestRoute = { ...direct, path: directPath }
                        bestPath = directPath
                        bestSource = direct.source
                        bestRouter = direct.readRouter
                    }
                } catch { /* direct path failed */ }

                // Attempt multi-hop [A, WETH, B]
                if (multiPath) {
                    try {
                        const amounts = await direct.readRouter.getAmountsOut(amountInParsed, multiPath)
                        const out = amounts[amounts.length - 1]
                        if (out > bestOut) {
                            bestOut = out
                            bestFormatted = ethers.formatUnits(out, toToken.decimals)
                            bestRoute = { ...direct, path: multiPath }
                            bestPath = multiPath
                            bestSource = direct.source
                            bestRouter = direct.readRouter
                        }
                    } catch { /* multi-hop failed */ }
                }
            }

            // 2. Try cross-swap via Aggregator
            const cross = await findCrossRoute(fromToken.address, toToken.address)
            if (cross && readAggregator) {
                try {
                    const outAmount = await readAggregator.getAmountsOutCross(
                        fromToken.address, toToken.address, amountInParsed, cross.routerInFirst
                    )
                    if (outAmount > bestOut) {
                        bestOut = outAmount
                        bestFormatted = ethers.formatUnits(outAmount, toToken.decimals)
                        bestRoute = { ...cross }
                        bestPath = null
                        bestSource = 'aggregator'
                        bestRouter = null
                        bestRouterInFirst = cross.routerInFirst
                    }
                } catch { /* aggregator failed */ }
            }

            // Apply best route
            if (bestOut > 0n) {
                setAmountOut(formatSwapAmount(bestFormatted))
                setSwapRoute(bestRoute)
                computeSwapDetails(amount, bestFormatted, amountInParsed, bestPath, bestRouter, bestSource, bestRouterInFirst)
            } else {
                setAmountOut('')
                setSwapDetails(null)
                setSwapRoute(null)
            }
        } catch {
            setAmountOut('')
            setSwapDetails(null)
            setSwapRoute(null)
        }
    }

    const computeSwapDetails = (amount, formatted, amountInParsed, path, router, source, routerInFirst) => {
        try {
            const minReceived = parseFloat(formatted) * (1 - slippage / 100)
            const lpFee = amount * 0.003 * (source === 'aggregator' ? 2 : 1) // 2 hops for aggregator
            setSwapDetails({
                minReceived: formatSwapAmount(minReceived),
                priceImpact: '0',
                lpFee: formatSwapAmount(lpFee),
                route: path,
                source,
            })
            setPriceInfo({
                rate: priceReversed
                    ? formatSwapAmount(amount / parseFloat(formatted))
                    : formatSwapAmount(parseFloat(formatted) / amount),
                fromSymbol: priceReversed ? toToken.symbol : fromToken.symbol,
                toSymbol: priceReversed ? fromToken.symbol : toToken.symbol,
            })

            // Compute real price impact for direct swaps
            if (router && path) {
                const refAmount = amount * 0.01 // 1% of actual trade for ideal rate
                const refParsed = ethers.parseUnits(
                    refAmount.toFixed(fromToken.decimals > 8 ? 8 : fromToken.decimals),
                    fromToken.decimals
                )
                router.getAmountsOut(refParsed, path).then(idealAmounts => {
                    const idealRate = parseFloat(ethers.formatUnits(idealAmounts[idealAmounts.length - 1], toToken.decimals)) / refAmount
                    const actualRate = parseFloat(formatted) / amount
                    const realImpact = Math.max(0, ((idealRate - actualRate) / idealRate) * 100)
                    setSwapDetails(prev => prev ? { ...prev, priceImpact: formatSwapAmount(realImpact) } : prev)
                }).catch(() => { })
            }

            // Compute real price impact for aggregator cross-swaps
            if (source === 'aggregator' && readAggregator) {
                // Use 1% of actual amount as reference (small enough for ideal rate, large enough for precision)
                const refAmount = amount * 0.01
                const refParsed = ethers.parseUnits(refAmount.toFixed(fromToken.decimals > 8 ? 8 : fromToken.decimals), fromToken.decimals)
                readAggregator.getAmountsOutCross(
                    fromToken.address, toToken.address, refParsed, routerInFirst ?? 0
                ).then(idealOut => {
                    const idealRate = parseFloat(ethers.formatUnits(idealOut, toToken.decimals)) / refAmount
                    const actualRate = parseFloat(formatted) / amount
                    const realImpact = Math.max(0, ((idealRate - actualRate) / idealRate) * 100)
                    setSwapDetails(prev => prev ? { ...prev, priceImpact: formatSwapAmount(realImpact) } : prev)
                }).catch((err) => { console.error('Aggregator price impact error:', err) })
            }
        } catch { /* ignore */ }
    }

    const executeSwap = async () => {
        if (!signer || !fromToken || !toToken || !amountIn || !swapRoute) return
        if (parseFloat(amountIn) > parseFloat(fromBalance)) { showAlert('Insufficient balance', 'error'); return }
        setIsSwapping(true)
        try {
            const amountInParsed = ethers.parseUnits(amountIn, fromToken.decimals)
            const block = await provider.getBlock('latest')
            const deadline = block.timestamp + 1800

            if (swapRoute.source === 'aggregator') {
                // Cross-swap via Aggregator
                const tokenContract = new ethers.Contract(fromToken.address, erc20Abi, signer)
                const allowance = await tokenContract.allowance(userAddress, aggregatorAddress)
                if (allowance < amountInParsed) {
                    showAlert(`Approving ${fromToken.symbol}...`, 'info')
                    const approveTx = await tokenContract.approve(aggregatorAddress, ethers.MaxUint256)
                    await approveTx.wait()
                }
                showAlert('Cross-swapping via Aggregator...', 'info')
                const minOut = ethers.parseUnits(
                    (parseFloat(amountOut) * (1 - slippage / 100)).toFixed(toToken.decimals > 6 ? 18 : toToken.decimals),
                    toToken.decimals
                )
                const tx = await aggregatorContract.crossSwap(
                    fromToken.address, toToken.address, amountInParsed, minOut, swapRoute.routerInFirst,
                    { gasLimit: 800000n }
                )
                await tx.wait()
                showAlert('Cross-swap successful!', 'success')
            } else {
                // Direct swap via router (custom or Uniswap)
                const router = swapRoute.router
                const routerAddr = swapRoute.source === 'custom' ? customAddresses.router : uniswapAddresses.router
                const path = swapRoute.path
                // Use readRouter for quote (fast public RPC), signer router for tx
                const amounts = await (swapRoute.readRouter || router).getAmountsOut(amountInParsed, path)
                const amountOutMin = amounts[amounts.length - 1] - (amounts[amounts.length - 1] * BigInt(Math.floor(slippage * 100))) / BigInt(10000)

                const isFromETH = fromToken.address.toLowerCase() === WETH_ADDRESS.toLowerCase()
                const isToETH = toToken.address.toLowerCase() === WETH_ADDRESS.toLowerCase()

                let tx
                if (isFromETH) {
                    showAlert('Swapping...', 'info')
                    tx = await router.swapExactETHForTokens(amountOutMin, path, userAddress, deadline, { value: amountInParsed, gasLimit: 500000n })
                } else if (isToETH) {
                    const tokenContract = new ethers.Contract(fromToken.address, erc20Abi, signer)
                    const allowance = await tokenContract.allowance(userAddress, routerAddr)
                    if (allowance < amountInParsed) {
                        showAlert(`Approving ${fromToken.symbol}...`, 'info')
                        const approveTx = await tokenContract.approve(routerAddr, ethers.MaxUint256)
                        await approveTx.wait()
                    }
                    showAlert('Swapping...', 'info')
                    tx = await router.swapExactTokensForETH(amountInParsed, amountOutMin, path, userAddress, deadline, { gasLimit: 500000n })
                } else {
                    const tokenContract = new ethers.Contract(fromToken.address, erc20Abi, signer)
                    const allowance = await tokenContract.allowance(userAddress, routerAddr)
                    if (allowance < amountInParsed) {
                        showAlert(`Approving ${fromToken.symbol}...`, 'info')
                        const approveTx = await tokenContract.approve(routerAddr, ethers.MaxUint256)
                        await approveTx.wait()
                    }
                    showAlert('Swapping...', 'info')
                    tx = await router.swapExactTokensForTokens(amountInParsed, amountOutMin, path, userAddress, deadline, { gasLimit: 500000n })
                }
                await tx.wait()
                showAlert('Swap successful!', 'success')
            }

            setAmountIn(''); setAmountOut(''); setSwapRoute(null)
            refreshBalances()
        } catch (err) {
            if (err.code === 4001 || err.code === 'ACTION_REJECTED') showAlert('User rejected', 'error')
            else showAlert(`Swap failed: ${err.reason || err.shortMessage || 'Unknown error'}`, 'error')
        } finally { setIsSwapping(false) }
    }

    const handleSwap = () => {
        if (!swapDetails) return
        if (parseFloat(swapDetails.priceImpact) > 5) setShowConfirmModal(true)
        else executeSwap()
    }

    const handleSwitch = () => {
        if (!toToken) return
        const prevFrom = fromToken
        const prevTo = toToken
        const prevAmountIn = amountIn
        const prevAmountOut = amountOut
        setFromToken(prevTo)
        setToToken(prevFrom)
        setAmountIn(prevAmountOut)
        setAmountOut(prevAmountIn)
    }

    const TokenIcon = ({ token }) => {
        const [err, setErr] = useState(false)
        if (err || !token?.logoURI) return <div className={s.tokenIconPlaceholder}>?</div>
        return <img src={token.logoURI} alt={token.symbol} className={s.tokenIcon} onError={() => setErr(true)} />
    }

    const routeLabel = swapRoute?.source === 'aggregator' ? 'Cross-swap (Aggregator)'
        : swapRoute?.source === 'uniswap' ? 'Uniswap V2'
            : swapRoute?.source === 'custom' ? 'Nde-FPL DEX'
                : null

    return (
        <>
            <div>
                {/* You Pay */}
                <div className={s.tokenSection}>
                    <div className={s.sectionHeader}>
                        <span className={s.sectionLabel}>You pay</span>
                        <div className={s.balanceRow}>
                            <button className={s.percentBtn} onClick={() => setAmountIn((parseFloat(fromBalance) * 0.5).toString())}>50%</button>
                            <button className={s.percentBtn} onClick={() => setAmountIn(fromBalance)}>MAX</button>
                            <span><img src="/wallet.svg" alt="" className={s.walletIcon} /> {fromLoading ? '...' : `${fromFmt} ${fromToken?.symbol || ''}`}</span>
                        </div>
                    </div>
                    <div className={s.tokenRow}>
                        <button className={s.tokenBtn} onClick={() => setSelectingFor('from')}>
                            {fromToken ? <><TokenIcon token={fromToken} /><span>{fromToken.symbol}</span></> : <span>Select token</span>}
                            <img src="/down-arrow.svg" alt="" className={s.chevronIcon} />
                        </button>
                        <input className={s.amountInput} type="text" value={amountIn} onChange={e => setAmountIn(e.target.value)} placeholder="0.00" />
                    </div>
                </div>

                <div className={s.switchRow}>
                    <button className={s.switchBtn} onClick={handleSwitch}><img src="/bottom-swap.svg" alt="Switch" className={s.switchIcon} /></button>
                </div>

                {/* You Receive */}
                <div className={s.tokenSection}>
                    <div className={s.sectionHeader}>
                        <span className={s.sectionLabel}>You receive</span>
                        {toToken && <div className={s.balanceRow}><span><img src="/wallet.svg" alt="" className={s.walletIcon} /> {toLoading ? '...' : `${toFmt} ${toToken.symbol}`}</span></div>}
                    </div>
                    <div className={s.tokenRow}>
                        <button className={`${s.tokenBtn} ${!toToken ? s.tokenBtnSelect : ''}`} onClick={() => setSelectingFor('to')}>
                            {toToken ? <><TokenIcon token={toToken} /><span>{toToken.symbol}</span></> : <span>Select token</span>}
                            <img src="/down-arrow.svg" alt="" className={s.chevronIcon} />
                        </button>
                        <input className={s.amountInput} type="text" value={amountOut} placeholder="0.00" disabled />
                    </div>
                </div>
            </div>

            {priceInfo && (
                <div className={s.priceRow}>
                    <span>Price</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>1 {priceInfo.fromSymbol} = {priceInfo.rate} {priceInfo.toSymbol}</span>
                        <button className={s.flipBtn} onClick={() => setPriceReversed(!priceReversed)}>⇄</button>
                    </div>
                </div>
            )}

            <button className={s.actionBtn} onClick={handleSwap}
                disabled={!signer || !fromToken || !toToken || !amountIn || !amountOut || isSwapping || (swapDetails && parseFloat(swapDetails.priceImpact) > 20)}>
                {!signer ? 'Connect Wallet' : isSwapping ? 'Swapping...' : !amountOut && amountIn ? 'No route found' : swapDetails && parseFloat(swapDetails.priceImpact) > 20 ? 'Price Impact Too High' : 'Swap'}
            </button>

            {swapDetails && (
                <div className={s.detailsBox}>
                    <div className={s.detailRow}><span className={s.detailLabel}>Min received</span><span className={s.detailValue}>{swapDetails.minReceived} {toToken.symbol}</span></div>
                    <div className={s.detailRow}><span className={s.detailLabel}>Price Impact</span><span className={parseFloat(swapDetails.priceImpact) > 5 ? s.impactBad : s.impactGood}>{swapDetails.priceImpact}%</span></div>
                    <div className={s.detailRow}><span className={s.detailLabel}>LP Fee</span><span className={s.detailValue}>{swapDetails.lpFee} {fromToken.symbol}</span></div>
                    {routeLabel && (
                        <div className={s.detailRow}><span className={s.detailLabel}>Route</span><span className={s.detailValue} style={{ color: 'var(--accent-primary)' }}>{routeLabel}</span></div>
                    )}
                    {swapDetails.route?.length > 2 && swapDetails.source !== 'aggregator' && (
                        <div className={s.routeRow}>
                            <span className={s.detailLabel}>Path</span>
                            <div className={s.routePath}>
                                <TokenIcon token={fromToken} /><span className={s.routeSymbol}>{fromToken.symbol}</span>
                                <img src="/right-swap.svg" alt="→" className={s.routeArrowIcon} />
                                <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png" alt="ETH" className={s.tokenIcon} /><span className={s.routeSymbol}>ETH</span>
                                <img src="/right-swap.svg" alt="→" className={s.routeArrowIcon} />
                                <TokenIcon token={toToken} /><span className={s.routeSymbol}>{toToken.symbol}</span>
                            </div>
                        </div>
                    )}
                    {swapDetails.source === 'aggregator' && (
                        <div className={s.routeRow}>
                            <span className={s.detailLabel}>Path</span>
                            <div className={s.routePath}>
                                <TokenIcon token={fromToken} />
                                <img src="/right-swap.svg" alt="→" className={s.routeArrowIcon} />
                                <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png" alt="ETH" className={s.tokenIcon} />
                                <img src="/right-swap.svg" alt="→" className={s.routeArrowIcon} />
                                <TokenIcon token={toToken} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {selectingFor && (
                <TokenSelectModal
                    onClose={() => setSelectingFor(null)}
                    onSelect={token => {
                        const other = selectingFor === 'from' ? toToken : fromToken
                        if (other && token.address.toLowerCase() === other.address.toLowerCase()) return
                        if (selectingFor === 'from') setFromToken(token); else setToToken(token)
                        setSelectingFor(null)
                    }}
                    excludeToken={selectingFor === 'from' ? toToken : fromToken}
                />
            )}

            {showConfirmModal && swapDetails && (
                <ConfirmModal
                    priceImpact={swapDetails.priceImpact}
                    onClose={() => setShowConfirmModal(false)}
                    onConfirm={() => { setShowConfirmModal(false); executeSwap() }}
                />
            )}
        </>
    )
}
