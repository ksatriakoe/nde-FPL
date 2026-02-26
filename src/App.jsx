import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { wagmiConfig } from './services/walletConfig'
import { FplProvider } from './hooks/useFplData'
import { AuthProvider } from './hooks/useAuth'
import PremiumGate from './components/PremiumGate'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard/Dashboard'
import LiveScores from './pages/LiveScores/LiveScores'
import Fixtures from './pages/Fixtures/Fixtures'
import Players from './pages/Players/Players'
import PlayerDetail from './pages/Players/PlayerDetail'
import PriceChanges from './pages/PriceChanges/PriceChanges'
import Standings from './pages/Standings/Standings'
import CaptainPicks from './pages/Premium/CaptainPicks'
import MatchPredictions from './pages/Premium/MatchPredictions'
import GWSummary from './pages/Premium/GWSummary'
import Differentials from './pages/Premium/Differentials'
import TransferSuggestions from './pages/Premium/TransferSuggestions'
import InjuryAlerts from './pages/Premium/InjuryAlerts'
import FormFixtureMatrix from './pages/Premium/FormFixtureMatrix'
import ConsistencyFixture from './pages/Premium/ConsistencyFixture'
import OwnershipEO from './pages/Premium/OwnershipEO'
import MyTeam from './pages/MyTeam/MyTeam'
import Watchlist from './pages/Watchlist/Watchlist'
import Subscribe from './pages/Subscribe/Subscribe'
import Swap from './pages/Swap/Swap'
import Staking from './pages/Staking/Staking'

const queryClient = new QueryClient()

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#22D3EE', accentColorForeground: '#0a0f1c' })}>
          <FplProvider>
            <AuthProvider>
              <BrowserRouter>
                <Routes>
                  <Route element={<Layout />}>
                    {/* Free features */}
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/live" element={<LiveScores />} />
                    <Route path="/fixtures" element={<Fixtures />} />
                    <Route path="/players" element={<Players />} />
                    <Route path="/players/:id" element={<PlayerDetail />} />
                    <Route path="/price-changes" element={<PriceChanges />} />
                    <Route path="/standings" element={<Standings />} />
                    <Route path="/my-team" element={<MyTeam />} />
                    <Route path="/watchlist" element={<Watchlist />} />
                    <Route path="/subscribe" element={<Subscribe />} />
                    <Route path="/swap" element={<Swap />} />
                    <Route path="/staking" element={<Staking />} />

                    {/* Premium features — locked behind PremiumGate */}
                    <Route path="/captain-picks" element={<PremiumGate><CaptainPicks /></PremiumGate>} />
                    <Route path="/match-predictions" element={<PremiumGate><MatchPredictions /></PremiumGate>} />
                    <Route path="/gw-summary" element={<PremiumGate><GWSummary /></PremiumGate>} />
                    <Route path="/differentials" element={<PremiumGate><Differentials /></PremiumGate>} />
                    <Route path="/transfers" element={<PremiumGate><TransferSuggestions /></PremiumGate>} />
                    <Route path="/injuries" element={<PremiumGate><InjuryAlerts /></PremiumGate>} />
                    <Route path="/form-fixture" element={<PremiumGate><FormFixtureMatrix /></PremiumGate>} />
                    <Route path="/consistency-fixture" element={<PremiumGate><ConsistencyFixture /></PremiumGate>} />
                    <Route path="/ownership" element={<PremiumGate><OwnershipEO /></PremiumGate>} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </AuthProvider>
          </FplProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
