import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { base } from 'wagmi/chains'
import { http, fallback } from 'wagmi'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo'

export const wagmiConfig = getDefaultConfig({
    appName: 'Nde-FPL',
    projectId,
    chains: [base],
    transports: {
        [base.id]: fallback([
            http('https://base-rpc.publicnode.com'),
            http('https://1rpc.io/base'),
            http('https://base.drpc.org'),
            http('https://base.api.pocket.network'),
        ]),
    },
    ssr: false,
})
