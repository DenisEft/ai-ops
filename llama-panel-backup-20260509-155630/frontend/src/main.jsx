import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './contexts/AuthContext.jsx'
import App from './App.jsx'
import './index.css'

console.log('[MAIN] Loading React app...')
try {
  const rootEl = document.getElementById('root')
  const root = createRoot(rootEl)
  root.render(
    createElement(AuthProvider, null, createElement(App))
  )
  console.log('[MAIN] App mounted')
} catch (err) {
  console.error('[MAIN] Failed:', err)
  document.body.innerHTML = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:#f00;color:#fff;padding:40px;font:16px monospace">ERROR: ' + err + '<br><pre>' + (err.stack || '') + '</pre></div>'
}
