import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './contexts/AuthContext.jsx'
import App from './App.jsx'
import './index.css'

console.log('[MAIN] Loading React app...')
console.log('[MAIN] localStorage token:', localStorage.getItem('llama-panel-token') ? 'EXISTS' : 'NONE')

try {
  const rootEl = document.getElementById('root')
  if (!rootEl) {
    throw new Error('root element not found')
  }
  const root = createRoot(rootEl)
  console.log('[MAIN] Creating root with AuthProvider + App')
  root.render(
    createElement(AuthProvider, null, createElement(App))
  )
  console.log('[MAIN] ✅ App mounted successfully')
} catch (err) {
  console.error('[MAIN] ❌ Failed to mount:', err)
  document.body.innerHTML = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:#111;color:#f44;padding:40px;font:16px monospace;overflow:auto">' +
    '<h2>Mount Error</h2><pre>' + err.message + '</pre><pre>' + (err.stack || '') + '</pre><br><small>Check console for details</small></div>'
}
