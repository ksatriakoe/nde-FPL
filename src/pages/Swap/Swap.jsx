import { useState, useEffect } from 'react'
import SwapTab from './SwapTab'
import PoolTab from './PoolTab'
import SettingsModal from './SettingsModal'
import s from './Swap.module.css'

export default function Swap() {
    const [activeTab, setActiveTab] = useState('swap')
    const [alerts, setAlerts] = useState([])
    const [showSettings, setShowSettings] = useState(false)
    const [slippage, setSlippage] = useState(0.5)

    const showAlert = (message, type = 'info') => {
        const id = Date.now()
        setAlerts(prev => [...prev, { id, message, type }])
        setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 4000)
    }

    return (
        <div className={s.page}>
            {/* Alerts */}
            {alerts.length > 0 && (
                <div className={s.alertContainer}>
                    {alerts.map(a => (
                        <div key={a.id} className={`${s.alert} ${a.type === 'success' ? s.alertSuccess : a.type === 'error' ? s.alertError : s.alertInfo}`}>
                            <span>{a.message}</span>
                            <button className={s.alertClose} onClick={() => setAlerts(prev => prev.filter(x => x.id !== a.id))}>×</button>
                        </div>
                    ))}
                </div>
            )}

            <div className={s.card}>
                {/* Header */}
                <div className={s.header}>
                    <h1 className={s.title}>Swap & Pool</h1>
                    <button className={s.settingsBtn} onClick={() => setShowSettings(true)}><img src="/gear-swap.svg" alt="Settings" className={s.iconSvg} /></button>
                </div>

                {/* Tabs */}
                <div className={s.tabs}>
                    <button className={`${s.tab} ${activeTab === 'swap' ? s.tabActive : ''}`} onClick={() => setActiveTab('swap')}>Swap</button>
                    <button className={`${s.tab} ${activeTab === 'pool' ? s.tabActive : ''}`} onClick={() => setActiveTab('pool')}>Pool</button>
                </div>

                {/* Tab Content */}
                {activeTab === 'swap'
                    ? <SwapTab showAlert={showAlert} slippage={slippage} />
                    : <PoolTab showAlert={showAlert} slippage={slippage} />
                }
            </div>

            <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} slippage={slippage} setSlippage={setSlippage} />
        </div>
    )
}
