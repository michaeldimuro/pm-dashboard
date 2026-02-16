import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode disabled - was causing AbortError on all Supabase queries
// due to double-mounting behavior conflicting with async auth/data fetching
createRoot(document.getElementById('root')!).render(
  <App />
)
