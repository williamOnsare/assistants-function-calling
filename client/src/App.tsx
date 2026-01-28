import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import HomePage from './pages/HomePage'
import OrgsPage from './pages/OrgsPage'
import AssistantsPage from './pages/AssistantsPage'
import { hasKeys } from './utils/storage'
import './App.css'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route 
            path="/orgs" 
            element={
              hasKeys() ? <OrgsPage /> : <Navigate to="/" replace />
            } 
          />
          <Route 
            path="/org/:uuid/assistants" 
            element={
              hasKeys() ? <AssistantsPage /> : <Navigate to="/" replace />
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
