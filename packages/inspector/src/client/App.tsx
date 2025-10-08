import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { InspectorDashboard } from './components/InspectorDashboard'
import { Layout } from './components/Layout'
import { ServerDetail } from './components/ServerDetail'
import { ServerList } from './components/ServerList'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<InspectorDashboard />} />
          <Route path="/servers" element={<ServerList />} />
          <Route path="/servers/:serverId" element={<ServerDetail />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
