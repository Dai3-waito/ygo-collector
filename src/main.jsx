import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ConfigError from './components/ConfigError.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { isSupabaseConfigured } from './lib/supabase.js'

const root = createRoot(document.getElementById('root'))

root.render(
  <StrictMode>
    <ErrorBoundary>
      {isSupabaseConfigured ? <App /> : <ConfigError />}
    </ErrorBoundary>
  </StrictMode>,
)
