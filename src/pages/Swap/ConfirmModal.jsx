import { useState } from 'react'
import { createPortal } from 'react-dom'
import s from './Swap.module.css'

export default function ConfirmModal({ priceImpact, onClose, onConfirm }) {
    const [text, setText] = useState('')
    const needsText = parseFloat(priceImpact) > 10
    const canConfirm = needsText ? text.toLowerCase() === 'confirm' : true

    return createPortal(
        <>
            <div className={s.modalBackdrop} onClick={onClose} />
            <div className={s.modalCenter}>
                <div className={s.modal}>
                    <div className={s.modalBody}>
                        <div className={s.confirmIcon}>⚠️</div>
                        <div className={s.confirmTitle}>High Price Impact Warning</div>
                        <div className={s.confirmText}>
                            This swap has a price impact of <span className={s.confirmImpact}>{priceImpact}%</span>. You may receive significantly less than expected.
                        </div>
                        {needsText && (
                            <input className={s.confirmInput} value={text} onChange={e => setText(e.target.value)} placeholder='Type "confirm" to continue' autoFocus />
                        )}
                        <div className={s.confirmActions}>
                            <button className={s.cancelBtn} onClick={onClose}>Cancel</button>
                            <button className={s.dangerBtn} onClick={onConfirm} disabled={!canConfirm}>Continue Anyway</button>
                        </div>
                    </div>
                </div>
            </div>
        </>,
        document.body
    )
}
