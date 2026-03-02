import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import s from './Swap.module.css'

export default function SettingsModal({ isOpen, onClose, slippage, setSlippage }) {
    const [isCustom, setIsCustom] = useState(false)
    const [customValue, setCustomValue] = useState('')
    if (!isOpen) return null

    const presets = [0.1, 0.5, 1]
    const handlePreset = v => { setSlippage(v); setIsCustom(false); setCustomValue('') }
    const handleCustom = e => {
        setCustomValue(e.target.value); setIsCustom(true)
        const n = parseFloat(e.target.value)
        if (!isNaN(n) && n > 0 && n <= 50) setSlippage(n)
    }

    return createPortal(
        <>
            <div className={s.modalBackdrop} onClick={onClose} />
            <div className={s.modalCenter}>
                <div className={s.modal}>
                    <div className={s.modalHeader}>
                        <span className={s.modalTitle}>Transaction Settings</span>
                        <button className={s.modalClose} onClick={onClose}>&times;</button>
                    </div>
                    <div className={s.modalBody}>
                        <div className={s.settingsLabel}><img src="/gear-swap.svg" alt="" className={s.iconSvg} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.4rem' }} /> Slippage tolerance</div>
                        <div className={s.settingsDesc}>If prices move beyond this % during processing, the transaction cancels automatically.</div>
                        <div className={s.slippageGrid}>
                            {presets.map(p => (
                                <button key={p} className={`${s.slippageBtn} ${!isCustom && slippage === p ? s.slippageBtnActive : ''}`} onClick={() => handlePreset(p)}>{p}%</button>
                            ))}
                            <button className={`${s.slippageBtn} ${isCustom ? s.slippageBtnActive : ''}`} onClick={() => setIsCustom(true)}>Custom</button>
                        </div>
                        {isCustom && (
                            <div className={s.customSlippageWrap}>
                                <input className={s.customSlippage} type="text" value={customValue} onChange={handleCustom} placeholder="Enter custom slippage" autoFocus />
                                <span className={s.customSlippageSuffix}>%</span>
                            </div>
                        )}
                        {slippage > 5 && (
                            <div className={s.warningBox}>
                                <span className={s.warningIcon}>⚠️</span>
                                <span className={s.warningText}>High slippage may result in unfavorable trades</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>,
        document.body
    )
}
