import { useMemo, useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { createPortal } from 'react-dom'
import { useWeb3 } from '../../hooks/useWeb3'
import { useTokenList } from '../../hooks/useTokenList'
import { WETH_ADDRESS, erc20Abi, factoryAbi, pairAbi, defaultSwapToken, customAddresses, listingManagerAddress, listingManagerAbi } from '../../services/swapConstants'
import TokenSelectModal from './TokenSelectModal'
import { useTokenBalance } from '../../hooks/useTokenBalance'
import { formatBalance, formatSwapAmount } from '../../services/formatBalance'
import s from './Swap.module.css'

function PositionCard({ position, isExpanded, onToggle, getDetails, onAddMore, onRemove }) {
    const [details, setDetails] = useState(null)
    const [loading, setLoading] = useState(false)
    useEffect(() => {
        if (isExpanded && !details) {
            setLoading(true)
            getDetails(position).then(d => { setDetails(d); setLoading(false) })
        }
    }, [isExpanded])

    const TokenIcon = ({ token }) => {
        const [err, setErr] = useState(false)
        if (err || !token?.logoURI) return <div className={s.tokenIconPlaceholder}>?</div>
        return <img src={token.logoURI} alt={token.symbol} className={s.tokenIcon} onError={() => setErr(true)} />
    }

    return (
        <div className={s.positionCard}>
            <button className={s.positionToggle} onClick={onToggle}>
                <div className={s.positionPair}>
                    <TokenIcon token={position.tokenA} />
                    <span>{position.tokenA.symbol}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>/</span>
                    <TokenIcon token={position.tokenB} />
                    <span>{position.tokenB.symbol}</span>
                </div>
                <img src={isExpanded ? '/caret-top.svg' : '/caret-down.svg'} alt="" className={s.positionChevronIcon} />
            </button>
            {isExpanded && (
                <div className={s.positionDetails}>
                    {loading ? <div className={s.scanningPool}>Loading...</div> : details ? (
                        <>
                            <div className={s.positionRow}><span className={s.positionLabel}>Pooled {position.tokenA.symbol}</span><div className={s.positionValue}>{formatBalance(details.amountA)} <TokenIcon token={position.tokenA} /></div></div>
                            <div className={s.positionRow}><span className={s.positionLabel}>Pooled {position.tokenB.symbol}</span><div className={s.positionValue}>{formatBalance(details.amountB)} <TokenIcon token={position.tokenB} /></div></div>
                            <div className={s.positionRow}><span className={s.positionLabel}>Your pool share</span><span className={s.positionValue}>{details.sharePercent}%</span></div>
                            <div className={s.positionRow} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.25rem' }}><span className={s.positionLabel}>LP Tokens</span><span className={s.positionValue}>{formatBalance(position.lpBalance)}</span></div>
                            <div className={s.positionActions}>
                                <button className={s.positionActionBtn} onClick={() => onAddMore(position)}><img src="/plus-swap.svg" alt="" className={s.actionBtnIcon} /> Add</button>
                                <button className={s.positionActionBtn} onClick={() => onRemove(position)}><img src="/dash-swap.svg" alt="" className={s.actionBtnIcon} /> Remove</button>
                            </div>
                        </>
                    ) : <div className={s.emptyPool}>Failed to load details</div>}
                </div>
            )}
        </div>
    )
}

/* ===== LISTING FEE MODAL ===== */
function ListingFeeModal({ fee, feeSymbol, onPay, onClose, isPaying }) {
    const cleanFee = formatSwapAmount(fee)
    return createPortal(
        <>
            <div className={s.modalBackdrop} onClick={onClose} />
            <div className={s.modalCenter}>
                <div className={s.modal}>
                    <div className={s.modalHeader}>
                        <span className={s.modalTitle}>New Pair</span>
                        <button className={s.modalClose} onClick={onClose}>&times;</button>
                    </div>
                    <div className={s.modalBody}>
                        <div className={s.listingFeeInfo}>
                            <p className={s.listingFeeText}>This pair doesn't exist yet. A one-time listing fee is required to create it.</p>
                            <div className={s.listingFeeAmount}>
                                <span className={s.listingFeeValue}>{cleanFee}</span>
                                <span className={s.listingFeeSymbol}>{feeSymbol}</span>
                            </div>
                        </div>
                        <button className={s.actionBtn} onClick={onPay} disabled={isPaying} style={{ width: '100%' }}>
                            {isPaying ? 'Creating pair...' : `Pay ${cleanFee} ${feeSymbol} & Create Pair`}
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    )
}

export default function PoolTab({ showAlert, slippage }) {
    const { signer, userAddress, routerContract, customFactory, provider, readProvider, refreshBalances, listingManagerContract } = useWeb3()
    const { tokens: swapTokenList } = useTokenList()
    const [view, setView] = useState('list')
    const [tokenA, setTokenA] = useState(defaultSwapToken)
    const [tokenB, setTokenB] = useState(null)
    const [selectedPosition, setSelectedPosition] = useState(null)
    const [amountA, setAmountA] = useState('')
    const [amountB, setAmountB] = useState('')
    const [selectingFor, setSelectingFor] = useState(null)
    const [poolInfo, setPoolInfo] = useState(null)
    const [liquidityPositions, setLiquidityPositions] = useState([])
    const [isAdding, setIsAdding] = useState(false)
    const [activeInput, setActiveInput] = useState('A')
    const [isScanning, setIsScanning] = useState(false)
    const [expandedPosition, setExpandedPosition] = useState(null)
    const [removePercent, setRemovePercent] = useState(0)
    const [isRemoving, setIsRemoving] = useState(false)
    const [removeEstimate, setRemoveEstimate] = useState(null)

    // Listing fee state
    const [showListingFee, setShowListingFee] = useState(false)
    const [listingFee, setListingFee] = useState('0')
    const [isPayingFee, setIsPayingFee] = useState(false)

    const { balance: balanceA, formattedBalance: balAFmt } = useTokenBalance(tokenA?.address)
    const { formattedBalance: balBFmt } = useTokenBalance(tokenB?.address)

    // Truncate decimal string to max allowed decimals (prevents parseUnits overflow for USDC etc.)
    const truncDecimals = (val, decimals) => {
        if (!val || !val.includes('.')) return val
        const [int, frac] = val.split('.')
        return frac.length <= decimals ? val : `${int}.${frac.slice(0, decimals)}`
    }

    useEffect(() => { if (tokenA && tokenB && (amountA || amountB) && readProvider) calculatePoolQuote() }, [amountA, amountB, tokenA, tokenB, activeInput])
    useEffect(() => { if (signer) loadLiquidityPositions() }, [signer])
    useEffect(() => { if (selectedPosition && removePercent > 0 && readProvider) calculateRemoveEstimate(); else setRemoveEstimate(null) }, [selectedPosition, removePercent])

    const calculatePoolQuote = async () => {
        try {
            if (!customFactory) return
            const pairAddress = await customFactory.getPair(tokenA.address, tokenB.address)
            if (pairAddress === ethers.ZeroAddress) { setPoolInfo(null); return }
            const pairContract = new ethers.Contract(pairAddress, pairAbi, readProvider)
            const reserves = await pairContract.getReserves()
            const token0Address = await pairContract.token0()
            const [reserve0, reserve1] = token0Address.toLowerCase() === tokenA.address.toLowerCase() ? [reserves[0], reserves[1]] : [reserves[1], reserves[0]]
            if (activeInput === 'A' && amountA) {
                const parsed = ethers.parseUnits(truncDecimals(amountA, tokenA.decimals), tokenA.decimals)
                setAmountB(ethers.formatUnits((parsed * reserve1) / reserve0, tokenB.decimals))
            } else if (activeInput === 'B' && amountB) {
                const parsed = ethers.parseUnits(truncDecimals(amountB, tokenB.decimals), tokenB.decimals)
                setAmountA(ethers.formatUnits((parsed * reserve0) / reserve1, tokenA.decimals))
            }
            const priceAPerB = parseFloat(ethers.formatUnits(reserve1, tokenB.decimals)) / parseFloat(ethers.formatUnits(reserve0, tokenA.decimals))
            const priceBPerA = 1 / priceAPerB
            let poolShare = 0
            if (amountA && amountB) {
                const totalSupply = await pairContract.totalSupply()
                if (totalSupply > 0n) {
                    const liq = (ethers.parseUnits(amountA, tokenA.decimals) * totalSupply) / reserve0
                    poolShare = (parseFloat(ethers.formatUnits(liq, 18)) / (parseFloat(ethers.formatUnits(totalSupply, 18)) + parseFloat(ethers.formatUnits(liq, 18)))) * 100
                }
            }
            setPoolInfo({ priceAPerB: formatSwapAmount(priceAPerB), priceBPerA: formatSwapAmount(priceBPerA), poolShare: formatSwapAmount(poolShare), pairAddress })
        } catch (e) { console.error('Pool quote error:', e) }
    }

    const getPositionDetails = async (position) => {
        try {
            const pairContract = new ethers.Contract(position.pairAddress, pairAbi, readProvider)
            const [reserves, totalSupply, token0Address] = await Promise.all([pairContract.getReserves(), pairContract.totalSupply(), pairContract.token0()])
            const lpBalance = ethers.parseUnits(position.lpBalance, 18)
            const isToken0A = token0Address.toLowerCase() === position.tokenA.address.toLowerCase()
            const [reserveA, reserveB] = isToken0A ? [reserves[0], reserves[1]] : [reserves[1], reserves[0]]
            return {
                amountA: ethers.formatUnits((reserveA * lpBalance) / totalSupply, position.tokenA.decimals),
                amountB: ethers.formatUnits((reserveB * lpBalance) / totalSupply, position.tokenB.decimals),
                sharePercent: formatSwapAmount(Number((lpBalance * BigInt(10000)) / totalSupply) / 100),
            }
        } catch { return null }
    }

    const loadLiquidityPositions = async () => {
        if (!signer || !readProvider || !userAddress || !customFactory) return
        setIsScanning(true)
        try {
            const positions = []
            const customTokens = JSON.parse(localStorage.getItem('customTokens') || '[]')
            const allTokens = [defaultSwapToken, ...swapTokenList, ...customTokens]
            const seen = new Set()
            const uniqueTokens = allTokens.filter(t => {
                const key = t.address.toLowerCase()
                if (seen.has(key)) return false
                seen.add(key)
                return true
            })
            for (let i = 0; i < uniqueTokens.length; i++) {
                for (let j = i + 1; j < uniqueTokens.length; j++) {
                    try {
                        const pairAddress = await customFactory.getPair(uniqueTokens[i].address, uniqueTokens[j].address)
                        if (pairAddress !== ethers.ZeroAddress) {
                            const pairContract = new ethers.Contract(pairAddress, pairAbi, readProvider)
                            const lpBalance = await pairContract.balanceOf(userAddress)
                            if (lpBalance > 0n) positions.push({ tokenA: uniqueTokens[i], tokenB: uniqueTokens[j], lpBalance: ethers.formatUnits(lpBalance, 18), pairAddress })
                        }
                    } catch { continue }
                }
            }
            setLiquidityPositions(positions)
        } catch (e) { console.error('Load positions error:', e) }
        finally { setIsScanning(false) }
    }

    const handleAddLiquidity = async () => {
        if (!signer || !tokenA || !tokenB || !amountA || !amountB) return

        // Check if pair exists — if not, show listing fee modal
        if (customFactory) {
            try {
                const pairAddr = await customFactory.getPair(tokenA.address, tokenB.address)
                if (pairAddr === ethers.ZeroAddress) {
                    // Pair doesn't exist — need listing fee
                    if (listingManagerContract) {
                        const fee = await listingManagerContract.listingFee()
                        const feeToken = swapTokenList.find(t => t.symbol === 'TEST')
                        setListingFee(ethers.formatUnits(fee, feeToken?.decimals || 18))
                        setShowListingFee(true)
                        return
                    } else {
                        showAlert('ListingManager not configured', 'error')
                        return
                    }
                }
            } catch (e) {
                console.error('Pair check error:', e)
            }
        }

        await doAddLiquidity()
    }

    const handlePayListingFee = async () => {
        if (!listingManagerContract || !tokenA || !tokenB) return
        setIsPayingFee(true)
        try {
            const fee = await listingManagerContract.listingFee()
            const feeToken = swapTokenList.find(t => t.symbol === 'TEST')
            if (!feeToken) { showAlert('TEST token not found', 'error'); return }

            // Approve TEST to ListingManager
            const testContract = new ethers.Contract(feeToken.address, erc20Abi, signer)
            const allowance = await testContract.allowance(userAddress, listingManagerAddress)
            if (allowance < fee) {
                showAlert('Approving TEST for listing fee...', 'info')
                const approveTx = await testContract.approve(listingManagerAddress, ethers.MaxUint256)
                await approveTx.wait()
            }

            // Pay fee and create pair
            showAlert('Paying listing fee & creating pair...', 'info')
            const tx = await listingManagerContract.listToken(tokenA.address, tokenB.address)
            await tx.wait()
            showAlert('Pair created! Now add liquidity.', 'success')
            setShowListingFee(false)

            // Now add liquidity
            await doAddLiquidity()
        } catch (err) {
            if (err.code === 4001 || err.code === 'ACTION_REJECTED') showAlert('User rejected', 'error')
            else showAlert(`Listing failed: ${err.reason || err.shortMessage || 'Unknown error'}`, 'error')
        } finally { setIsPayingFee(false) }
    }

    const doAddLiquidity = async () => {
        setIsAdding(true)
        try {
            const amountADesired = ethers.parseUnits(truncDecimals(amountA, tokenA.decimals), tokenA.decimals)
            const amountBDesired = ethers.parseUnits(truncDecimals(amountB, tokenB.decimals), tokenB.decimals)
            const slip = BigInt(Math.floor(slippage * 100))
            const amountAMin = amountADesired - (amountADesired * slip) / BigInt(10000)
            const amountBMin = amountBDesired - (amountBDesired * slip) / BigInt(10000)
            const block = await provider.getBlock('latest')
            const deadline = block.timestamp + 1800
            const isAETH = tokenA.address.toLowerCase() === WETH_ADDRESS.toLowerCase()
            const isBETH = tokenB.address.toLowerCase() === WETH_ADDRESS.toLowerCase()
            if (isAETH || isBETH) {
                const [, otherToken, nativeAmount, otherAmount, otherAmountMin] = isAETH
                    ? [tokenA, tokenB, amountADesired, amountBDesired, amountBMin]
                    : [tokenB, tokenA, amountBDesired, amountADesired, amountAMin]
                if (!isAETH) { const tc = new ethers.Contract(tokenA.address, erc20Abi, signer); const al = await tc.allowance(userAddress, customAddresses.router); if (al < amountADesired) { showAlert(`Approving ${tokenA.symbol}...`, 'info'); await (await tc.approve(customAddresses.router, ethers.MaxUint256)).wait() } }
                if (!isBETH) { const tc = new ethers.Contract(tokenB.address, erc20Abi, signer); const al = await tc.allowance(userAddress, customAddresses.router); if (al < amountBDesired) { showAlert(`Approving ${tokenB.symbol}...`, 'info'); await (await tc.approve(customAddresses.router, ethers.MaxUint256)).wait() } }
                showAlert('Adding liquidity...', 'info')
                const tx = await routerContract.addLiquidityETH(otherToken.address, otherAmount, otherAmountMin, nativeAmount - (nativeAmount * slip) / BigInt(10000), userAddress, deadline, { value: nativeAmount, gasLimit: 5000000n })
                await tx.wait()
                showAlert('Liquidity added!', 'success')
            } else {
                const tcA = new ethers.Contract(tokenA.address, erc20Abi, signer); if ((await tcA.allowance(userAddress, customAddresses.router)) < amountADesired) { showAlert(`Approving ${tokenA.symbol}...`, 'info'); await (await tcA.approve(customAddresses.router, ethers.MaxUint256)).wait() }
                const tcB = new ethers.Contract(tokenB.address, erc20Abi, signer); if ((await tcB.allowance(userAddress, customAddresses.router)) < amountBDesired) { showAlert(`Approving ${tokenB.symbol}...`, 'info'); await (await tcB.approve(customAddresses.router, ethers.MaxUint256)).wait() }
                showAlert('Adding liquidity...', 'info')
                const tx = await routerContract.addLiquidity(tokenA.address, tokenB.address, amountADesired, amountBDesired, amountAMin, amountBMin, userAddress, deadline, { gasLimit: 5000000n })
                await tx.wait()
                showAlert('Liquidity added!', 'success')
            }
            setAmountA(''); setAmountB(''); refreshBalances(); loadLiquidityPositions(); setView('list')
        } catch (err) {
            if (err.code === 4001 || err.code === 'ACTION_REJECTED') showAlert('User rejected', 'error')
            else showAlert(`Failed: ${err.reason || err.shortMessage || 'Unknown error'}`, 'error')
        } finally { setIsAdding(false) }
    }

    const calculateRemoveEstimate = async () => {
        try {
            const pairContract = new ethers.Contract(selectedPosition.pairAddress, pairAbi, readProvider)
            const [reserves, totalSupply, token0Address] = await Promise.all([pairContract.getReserves(), pairContract.totalSupply(), pairContract.token0()])
            const lpBalance = ethers.parseUnits(selectedPosition.lpBalance, 18)
            const lpToRemove = (lpBalance * BigInt(removePercent)) / BigInt(100)
            const isToken0A = token0Address.toLowerCase() === selectedPosition.tokenA.address.toLowerCase()
            const [reserveA, reserveB] = isToken0A ? [reserves[0], reserves[1]] : [reserves[1], reserves[0]]
            setRemoveEstimate({
                amountA: ethers.formatUnits((reserveA * lpToRemove) / totalSupply, selectedPosition.tokenA.decimals),
                amountB: ethers.formatUnits((reserveB * lpToRemove) / totalSupply, selectedPosition.tokenB.decimals),
            })
        } catch { setRemoveEstimate(null) }
    }

    const handleRemove = async () => {
        if (!signer || !selectedPosition || removePercent === 0 || !removeEstimate) return
        setIsRemoving(true)
        try {
            const lpBalance = ethers.parseUnits(selectedPosition.lpBalance, 18)
            const liquidity = (lpBalance * BigInt(removePercent)) / BigInt(100)
            const slip = BigInt(Math.floor(slippage * 100))
            const amAMin = ethers.parseUnits(removeEstimate.amountA, selectedPosition.tokenA.decimals)
            const amBMin = ethers.parseUnits(removeEstimate.amountB, selectedPosition.tokenB.decimals)
            const amASlip = amAMin - (amAMin * slip) / BigInt(10000)
            const amBSlip = amBMin - (amBMin * slip) / BigInt(10000)
            const block = await provider.getBlock('latest')
            const deadline = block.timestamp + 1800
            const pairContract = new ethers.Contract(selectedPosition.pairAddress, pairAbi, signer)
            const allowance = await pairContract.allowance(userAddress, customAddresses.router)
            if (allowance < liquidity) { showAlert('Approving LP tokens...', 'info'); await (await pairContract.approve(customAddresses.router, ethers.MaxUint256)).wait() }
            const isAETH = selectedPosition.tokenA.address.toLowerCase() === WETH_ADDRESS.toLowerCase()
            const isBETH = selectedPosition.tokenB.address.toLowerCase() === WETH_ADDRESS.toLowerCase()
            showAlert('Removing liquidity...', 'info')
            let tx
            if (isAETH || isBETH) {
                const [tokenAddress, tokenMin, ethMin] = isAETH ? [selectedPosition.tokenB.address, amBSlip, amASlip] : [selectedPosition.tokenA.address, amASlip, amBSlip]
                tx = await routerContract.removeLiquidityETH(tokenAddress, liquidity, tokenMin, ethMin, userAddress, deadline, { gasLimit: 5000000n })
            } else {
                tx = await routerContract.removeLiquidity(selectedPosition.tokenA.address, selectedPosition.tokenB.address, liquidity, amASlip, amBSlip, userAddress, deadline, { gasLimit: 5000000n })
            }
            await tx.wait()
            showAlert('Liquidity removed!', 'success')
            setRemovePercent(0); setRemoveEstimate(null); refreshBalances(); loadLiquidityPositions(); setView('list'); setSelectedPosition(null)
        } catch (err) {
            if (err.code === 4001 || err.code === 'ACTION_REJECTED') showAlert('User rejected', 'error')
            else showAlert(`Failed: ${err.reason || err.shortMessage || 'Unknown error'}`, 'error')
        } finally { setIsRemoving(false) }
    }

    const TokenIcon = ({ token }) => {
        const [err, setErr] = useState(false)
        if (err || !token?.logoURI) return <div className={s.tokenIconPlaceholder}>?</div>
        return <img src={token.logoURI} alt={token.symbol} className={s.tokenIcon} onError={() => setErr(true)} />
    }

    // REMOVE VIEW
    if (view === 'remove' && selectedPosition) {
        const lpToRemove = formatBalance(parseFloat(selectedPosition.lpBalance) * removePercent / 100)
        return (
            <>
                <button className={s.backBtn} onClick={() => { setView('list'); setSelectedPosition(null) }}><img src="/left-arrow.svg" alt="" className={s.backArrowIcon} /> Back to Pool</button>
                <div className={s.tokenSection} style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                    <div className={s.removeHeader}>
                        <img src={selectedPosition.tokenA.logoURI} className={s.removeHeaderIcon} alt="" />
                        <span className={s.removeHeaderText}>{selectedPosition.tokenA.symbol}</span>
                        <span className={s.removeHeaderSep}>/</span>
                        <img src={selectedPosition.tokenB.logoURI} className={s.removeHeaderIcon} alt="" />
                        <span className={s.removeHeaderText}>{selectedPosition.tokenB.symbol}</span>
                    </div>
                    <div className={s.removeCenter}>
                        <div className={s.removeSub}>Amount to remove</div>
                        <div className={s.removePercent}>{removePercent}%</div>
                        <div className={s.removeSub}>{lpToRemove} LP tokens</div>
                    </div>
                    <div className={s.percentBtns}>
                        {[25, 50, 75, 100].map(p => (
                            <button key={p} className={`${s.percentChoiceBtn} ${removePercent === p ? s.percentChoiceActive : ''}`} onClick={() => setRemovePercent(p)}>
                                {p === 100 ? 'MAX' : `${p}%`}
                            </button>
                        ))}
                    </div>
                    <div className={s.sliderWrap}>
                        <div className={s.sliderProgress} style={{ width: `${removePercent}%` }} />
                        <input type="range" min="0" max="100" value={removePercent} onChange={e => setRemovePercent(parseInt(e.target.value))} className={s.slider} />
                    </div>
                </div>
                {removePercent > 0 && (
                    <div className={s.receiveBox}>
                        <div className={s.receiveTitle}>You will receive</div>
                        <div className={s.positionRow}><div className={s.positionValue}><TokenIcon token={selectedPosition.tokenA} /> {selectedPosition.tokenA.symbol}</div><span className={s.positionValue}>{removeEstimate ? formatSwapAmount(removeEstimate.amountA) : '~'}</span></div>
                        <div className={s.positionRow}><div className={s.positionValue}><TokenIcon token={selectedPosition.tokenB} /> {selectedPosition.tokenB.symbol}</div><span className={s.positionValue}>{removeEstimate ? formatSwapAmount(removeEstimate.amountB) : '~'}</span></div>
                    </div>
                )}
                <button className={s.actionBtn} onClick={handleRemove} disabled={!signer || removePercent === 0 || isRemoving}>
                    {!signer ? 'Connect Wallet' : isRemoving ? 'Removing...' : removePercent === 0 ? 'Enter Amount' : 'Remove'}
                </button>
            </>
        )
    }

    // ADD LIQUIDITY VIEW
    if (view === 'add') {
        return (
            <>
                <button className={s.backBtn} onClick={() => setView('list')}><img src="/left-arrow.svg" alt="" className={s.backArrowIcon} /> Back to Pool</button>
                <div>
                    <div className={s.tokenSection}>
                        <div className={s.sectionHeader}>
                            <span className={s.sectionLabel}>Token A</span>
                            <div className={s.balanceRow}>
                                <button className={s.percentBtn} onClick={() => setAmountA((parseFloat(balanceA) * 0.5).toString())}>50%</button>
                                <button className={s.percentBtn} onClick={() => setAmountA(balanceA)}>MAX</button>
                                <span><img src="/wallet.svg" alt="" className={s.walletIcon} /> {balAFmt} {tokenA.symbol}</span>
                            </div>
                        </div>
                        <div className={s.tokenRow}>
                            <button className={s.tokenBtn} onClick={() => setSelectingFor('poolA')}><TokenIcon token={tokenA} /><span>{tokenA.symbol}</span><img src="/down-arrow.svg" alt="" className={s.chevronIcon} /></button>
                            <input className={s.amountInput} type="text" value={amountA} onChange={e => { setAmountA(e.target.value); setActiveInput('A') }} placeholder="0.00" />
                        </div>
                    </div>
                    <div className={s.plusRow}><div className={s.plusIcon}>＋</div></div>
                    <div className={s.tokenSection}>
                        <div className={s.sectionHeader}>
                            <span className={s.sectionLabel}>Token B</span>
                            {tokenB && <div className={s.balanceRow}><span><img src="/wallet.svg" alt="" className={s.walletIcon} /> {balBFmt} {tokenB.symbol}</span></div>}
                        </div>
                        <div className={s.tokenRow}>
                            <button className={`${s.tokenBtn} ${!tokenB ? s.tokenBtnSelect : ''}`} onClick={() => setSelectingFor('poolB')}>
                                {tokenB ? <><TokenIcon token={tokenB} /><span>{tokenB.symbol}</span></> : <span>Select token</span>}
                                <img src="/down-arrow.svg" alt="" className={s.chevronIcon} />
                            </button>
                            <input className={s.amountInput} type="text" value={amountB} onChange={e => { setAmountB(e.target.value); setActiveInput('B') }} placeholder="0.00" />
                        </div>
                    </div>
                </div>
                {poolInfo && (
                    <div className={s.poolInfoBox}>
                        <div className={s.poolInfoTitle}>Pool share</div>
                        <div className={s.poolInfoGrid}>
                            <div><div className={s.poolInfoValue}>{poolInfo.priceAPerB}</div><div className={s.poolInfoLabel}>{tokenB?.symbol} per {tokenA?.symbol}</div></div>
                            <div><div className={s.poolInfoValue}>{poolInfo.priceBPerA}</div><div className={s.poolInfoLabel}>{tokenA?.symbol} per {tokenB?.symbol}</div></div>
                            <div><div className={s.poolInfoValue}>{poolInfo.poolShare}%</div><div className={s.poolInfoLabel}>Share of Pool</div></div>
                        </div>
                    </div>
                )}
                <button className={s.actionBtn} onClick={handleAddLiquidity} disabled={!signer || !tokenA || !tokenB || !amountA || !amountB || isAdding}>
                    {!signer ? 'Connect Wallet' : isAdding ? 'Supplying...' : 'Supply'}
                </button>
                {selectingFor && (
                    <TokenSelectModal
                        onClose={() => setSelectingFor(null)}
                        onSelect={token => {
                            const other = selectingFor === 'poolA' ? tokenB : tokenA
                            if (other && token.address.toLowerCase() === other.address.toLowerCase()) return
                            if (selectingFor === 'poolA') setTokenA(token); else setTokenB(token)
                            setSelectingFor(null)
                        }}
                        excludeToken={selectingFor === 'poolA' ? tokenB : tokenA}
                    />
                )}

                {/* Listing Fee Modal */}
                {showListingFee && (
                    <ListingFeeModal
                        fee={listingFee}
                        feeSymbol="TEST"
                        onPay={handlePayListingFee}
                        onClose={() => setShowListingFee(false)}
                        isPaying={isPayingFee}
                    />
                )}
            </>
        )
    }

    // LIST VIEW (default)
    return (
        <>
            <button className={s.actionBtn} onClick={() => setView('add')}><img src="/plus-swap.svg" alt="" className={s.actionBtnIcon} /> Add Liquidity</button>
            <div className={s.poolHeader} style={{ marginTop: '1rem' }}>
                <div className={s.poolTitle}>Your Liquidity</div>
            </div>
            {isScanning ? (
                <div className={s.scanningPool}>Loading positions...</div>
            ) : liquidityPositions.length === 0 ? (
                <div className={s.emptyPool}>Your liquidity positions will appear here.</div>
            ) : (
                liquidityPositions.map((pos, i) => (
                    <PositionCard
                        key={i} position={pos}
                        isExpanded={expandedPosition === i}
                        onToggle={() => setExpandedPosition(expandedPosition === i ? null : i)}
                        getDetails={getPositionDetails}
                        onAddMore={p => { setTokenA(p.tokenA); setTokenB(p.tokenB); setView('add') }}
                        onRemove={p => { setSelectedPosition(p); setView('remove') }}
                    />
                ))
            )}
        </>
    )
}
