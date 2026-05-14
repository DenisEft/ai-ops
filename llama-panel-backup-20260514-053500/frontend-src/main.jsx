/* eslint-disable no-console */
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './contexts/AuthContext.jsx'
import App from './App.jsx'
import './index.css'

console.log('[MAIN] 🚀 Loading React app...')
console.log('[MAIN] localStorage token:', localStorage.getItem('llama-panel-token') ? 'EXISTS' : 'NONE')
console.log('[MAIN] App component:', typeof App)
console.log('[MAIN] AuthProvider:', typeof AuthProvider)

try {
  const rootEl = document.getElementById('root')
  if (!rootEl) {
    throw new Error('root element not found')
  }
  console.log('[MAIN] ✅ Root element found')
  
  const root = createRoot(rootEl)
  console.log('[MAIN] Creating root with AuthProvider + App...')
  
  // Debug: check if components are valid
  if (typeof App !== 'function' && typeof App !== 'object') {
    throw new Error('App is not a valid React component: ' + typeof App)
  }
  if (typeof AuthProvider !== 'function') {
    throw new Error('AuthProvider is not a valid React component: ' + typeof AuthProvider)
  }
  
  root.render(createElement(AuthProvider, null, createElement(App)))
  console.log('[MAIN] ✅ App mounted successfully')
} catch (err) {
  console.error('[MAIN] ❌ Failed to mount:', err)
  console.error('[MAIN] Stack:', err.stack)
  document.body.innerHTML = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:#000;color:#f44;padding:20px;font:14px monospace;overflow:auto;z-index:9999">' +
    '<h2 style="color:#f44">ERROR</h2>' +
    '<pre style="color:#fff">' + err.message + '</pre>' +
    '<pre style="color:#888">' + (err.stack || '') + '</pre>' +
    '<br><small>Check console (F12) for details</small></div>'
}
