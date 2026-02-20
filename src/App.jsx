import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { FplProvider } from './hooks/useFplData'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard/Dashboard'
import LiveScores from './pages/LiveScores/LiveScores'
import Fixtures from './pages/Fixtures/Fixtures'
import Players from './pages/Players/Players'
import PriceChanges from './pages/PriceChanges/PriceChanges'
import Standings from './pages/Standings/Standings'

export default function App() {
  return (
    <FplProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/live" element={<LiveScores />} />
            <Route path="/fixtures" element={<Fixtures />} />
            <Route path="/players" element={<Players />} />
            <Route path="/price-changes" element={<PriceChanges />} />
            <Route path="/standings" element={<Standings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </FplProvider>
  )
}
