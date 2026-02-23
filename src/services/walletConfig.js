import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { sepolia } from 'wagmi/chains'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo'

export const wagmiConfig = getDefaultConfig({
    appName: 'FPL Scout',
    projectId,
    chains: [sepolia],
    ssr: false,
})
