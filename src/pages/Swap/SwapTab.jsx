import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWeb3 } from '../../hooks/useWeb3'
import { swapAddresses, erc20Abi, defaultSwapToken } from '../../services/swapConstants'
import { useTokenBalance } from '../../hooks/useTokenBalance'
import { formatSwapAmount } from '../../services/formatBalance'
import TokenSelectModal from './TokenSelectModal'
import ConfirmModal from './ConfirmModal'
import s from './Swap.module.css'

export default function SwapTab({ showAlert, slippage }) {
    const { provider, signer, userAddress, routerContract, refreshBalances } = useWeb3()
    const [fromToken, setFromToken] = useState(defaultSwapToken)
    const [toToken, setToToken] = useState(null)
    const [amountIn, setAmountIn] = useState('')
    const [amountOut, setAmountOut] = useState('')
    const [selectingFor, setSelectingFor] = useState(null)
    const [priceInfo, setPriceInfo] = useState(null)
    const [swapDetails, setSwapDetails] = useState(null)
    const [isSwapping, setIsSwapping] = useState(false)
    const [priceReversed, setPriceReversed] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)

    const { balance: fromBalance, formattedBalance: fromFmt, loading: fromLoading } = useTokenBalance(fromToken?.address)
    const { formattedBalance: toFmt, loading: toLoading } = useTokenBalance(toToken?.address)

    useEffect(() => {
        if (amountIn && fromToken && toToken && routerContract) calculateAmountOut()
        else { setAmountOut(''); setSwapDetails(null) }
    }, [amountIn, fromToken, toToken, routerContract, slippage])

    const getPath = (a, b) => {
        const isFromETH = a.address.toLowerCase() === swapAddresses.weth.toLowerCase()
        const isToETH = b.address.toLowerCase() === swapAddresses.weth.toLowerCase()
        if (isFromETH || isToETH) return [ethers.getAddress(a.address), ethers.getAddress(b.address)]
        return [ethers.getAddress(a.address), ethers.getAddress(swapAddresses.weth), ethers.getAddress(b.address)]
    }

    const calculateAmountOut = async () => {
        try {
            const amount = parseFloat(amountIn)
            if (amount <= 0) { setAmountOut(''); return }
            const amountInParsed = ethers.parseUnits(amountIn, fromToken.decimals)
            const path = getPath(fromToken, toToken)
            const amounts = await routerContract.getAmountsOut(amountInParsed, path)
            const outputAmount = amounts[amounts.length - 1]
            const formatted = ethers.formatUnits(outputAmount, toToken.decimals)
            setAmountOut(formatSwapAmount(formatted))
            const oneUnit = ethers.parseUnits('0.001', fromToken.decimals)
            const idealAmounts = await routerContract.getAmountsOut(oneUnit, path)
            const idealRate = parseFloat(ethers.formatUnits(idealAmounts[idealAmounts.length - 1], toToken.decimals)) / 0.001
            const actualRate = parseFloat(formatted) / amount
            const impact = ((idealRate - actualRate) / idealRate) * 100
            const minReceived = parseFloat(formatted) * (1 - slippage / 100)
            const lpFee = amount * 0.003
            setSwapDetails({ minReceived: formatSwapAmount(minReceived), priceImpact: formatSwapAmount(impact), lpFee: formatSwapAmount(lpFee), route: path })
            setPriceInfo({
                rate: priceReversed ? formatSwapAmount(amount / parseFloat(formatted)) : formatSwapAmount(parseFloat(formatted) / amount),
                fromSymbol: priceReversed ? toToken.symbol : fromToken.symbol,
                toSymbol: priceReversed ? fromToken.symbol : toToken.symbol,
            })
        } catch { setAmountOut('') }
    }

    const executeSwap = async () => {
        if (!signer || !fromToken || !toToken || !amountIn) return
        if (parseFloat(amountIn) > parseFloat(fromBalance)) { showAlert('Insufficient balance', 'error'); return }
        setIsSwapping(true)
        try {
            const amountInParsed = ethers.parseUnits(amountIn, fromToken.decimals)
            const path = getPath(fromToken, toToken)
            const amounts = await routerContract.getAmountsOut(amountInParsed, path)
            const amountOutMin = amounts[amounts.length - 1] - (amounts[amounts.length - 1] * BigInt(Math.floor(slippage * 100))) / BigInt(10000)
            const block = await provider.getBlock('latest')
            const deadline = block.timestamp + 1800
            const isFromETH = fromToken.address.toLowerCase() === swapAddresses.weth.toLowerCase()
            const isToETH = toToken.address.toLowerCase() === swapAddresses.weth.toLowerCase()
            let tx
            if (isFromETH) {
                showAlert('Swapping...', 'info')
                tx = await routerContract.swapExactETHForTokens(amountOutMin, path, userAddress, deadline, { value: amountInParsed })
            } else if (isToETH) {
                const tokenContract = new ethers.Contract(fromToken.address, erc20Abi, signer)
                const allowance = await tokenContract.allowance(userAddress, swapAddresses.router)
                if (allowance < amountInParsed) {
                    showAlert(`Approving ${fromToken.symbol}...`, 'info')
                    const approveTx = await tokenContract.approve(swapAddresses.router, ethers.MaxUint256)
                    await approveTx.wait()
                }
                showAlert('Swapping...', 'info')
                tx = await routerContract.swapExactTokensForETH(amountInParsed, amountOutMin, path, userAddress, deadline)
            } else {
                const tokenContract = new ethers.Contract(fromToken.address, erc20Abi, signer)
                const allowance = await tokenContract.allowance(userAddress, swapAddresses.router)
                if (allowance < amountInParsed) {
                    showAlert(`Approving ${fromToken.symbol}...`, 'info')
                    const approveTx = await tokenContract.approve(swapAddresses.router, ethers.MaxUint256)
                    await approveTx.wait()
                }
                showAlert('Swapping...', 'info')
                tx = await routerContract.swapExactTokensForTokens(amountInParsed, amountOutMin, path, userAddress, deadline)
            }
            await tx.wait()
            showAlert('Swap successful!', 'success')
            setAmountIn(''); setAmountOut('')
            refreshBalances()
        } catch (err) {
            if (err.code === 4001 || err.code === 'ACTION_REJECTED') showAlert('User rejected', 'error')
            else showAlert('Swap failed', 'error')
        } finally { setIsSwapping(false) }
    }

    const handleSwap = () => {
        if (!swapDetails) return
        if (parseFloat(swapDetails.priceImpact) > 5) setShowConfirmModal(true)
        else executeSwap()
    }

    const handleSwitch = () => {
        if (!toToken) return
        setFromToken(toToken); setToToken(fromToken); setAmountIn(amountOut); setAmountOut(amountIn)
    }

    const TokenIcon = ({ token }) => {
        const [err, setErr] = useState(false)
        if (err || !token?.logoURI) return <div className={s.tokenIconPlaceholder}>?</div>
        return <img src={token.logoURI} alt={token.symbol} className={s.tokenIcon} onError={() => setErr(true)} />
    }

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
                            <span>🔑 {fromLoading ? '...' : `${fromFmt} ${fromToken.symbol}`}</span>
                        </div>
                    </div>
                    <div className={s.tokenRow}>
                        <button className={s.tokenBtn} onClick={() => setSelectingFor('from')}>
                            <TokenIcon token={fromToken} />
                            <span>{fromToken.symbol}</span>
                            <span className={s.chevron}>▼</span>
                        </button>
                        <input className={s.amountInput} type="text" value={amountIn} onChange={e => setAmountIn(e.target.value)} placeholder="0.00" />
                    </div>
                </div>

                <div className={s.switchRow}>
                    <button className={s.switchBtn} onClick={handleSwitch}>↓</button>
                </div>

                {/* You Receive */}
                <div className={s.tokenSection}>
                    <div className={s.sectionHeader}>
                        <span className={s.sectionLabel}>You receive</span>
                        {toToken && <div className={s.balanceRow}><span>🔑 {toLoading ? '...' : `${toFmt} ${toToken.symbol}`}</span></div>}
                    </div>
                    <div className={s.tokenRow}>
                        <button className={`${s.tokenBtn} ${!toToken ? s.tokenBtnSelect : ''}`} onClick={() => setSelectingFor('to')}>
                            {toToken ? <><TokenIcon token={toToken} /><span>{toToken.symbol}</span></> : <span>Select token</span>}
                            <span className={s.chevron}>▼</span>
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
                disabled={!signer || !fromToken || !toToken || !amountIn || isSwapping || (swapDetails && parseFloat(swapDetails.priceImpact) > 20)}>
                {!signer ? 'Connect Wallet' : isSwapping ? 'Swapping...' : swapDetails && parseFloat(swapDetails.priceImpact) > 20 ? 'Price Impact Too High' : 'Swap'}
            </button>

            {swapDetails && (
                <div className={s.detailsBox}>
                    <div className={s.detailRow}><span className={s.detailLabel}>Min received</span><span className={s.detailValue}>{swapDetails.minReceived} {toToken.symbol}</span></div>
                    <div className={s.detailRow}><span className={s.detailLabel}>Price Impact</span><span className={parseFloat(swapDetails.priceImpact) > 5 ? s.impactBad : s.impactGood}>{swapDetails.priceImpact}%</span></div>
                    <div className={s.detailRow}><span className={s.detailLabel}>LP Fee</span><span className={s.detailValue}>{swapDetails.lpFee} {fromToken.symbol}</span></div>
                    {swapDetails.route?.length > 2 && (
                        <div className={s.routeRow}>
                            <span className={s.detailLabel}>Route</span>
                            <div className={s.routePath}>
                                <TokenIcon token={fromToken} /><span className={s.routeSymbol}>{fromToken.symbol}</span>
                                <span className={s.routeArrow}>→</span>
                                <span className={s.routeSymbol}>MNT</span>
                                <span className={s.routeArrow}>→</span>
                                <TokenIcon token={toToken} /><span className={s.routeSymbol}>{toToken.symbol}</span>
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
