import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { InspectorDashboard } from './components/InspectorDashboard'
import { Layout } from './components/Layout'
import { ServerDetail } from './components/ServerDetail'
import { ServerList } from './components/ServerList'
import { McpProvider } from './context/McpContext'

function App() {
  return (
    <McpProvider>
      <Router basename="/inspector">
        <Layout>
          <Routes>
            <Route path="/" element={<InspectorDashboard />} />
            <Route path="/servers" element={<ServerList />} />
            <Route path="/servers/:serverId" element={<ServerDetail />} />
          </Routes>
        </Layout>
      </Router>
    </McpProvider>
  )
}

export default App
