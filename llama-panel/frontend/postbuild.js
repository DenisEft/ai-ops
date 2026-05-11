import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.join(__dirname, 'dist', 'index.html')
let html = fs.readFileSync(distPath, 'utf-8')
const ts = Date.now()

// Strip ALL existing ?v= params from asset URLs, then add a single new one
html = html.replace(/(src|href)="(\/assets\/[^"]*)\?v=[^"]*"/g, '$1="$2?v=' + ts + '"')

// If no ?v= was found (first run), add it
if (!html.includes('?v=' + ts)) {
  html = html.replace(/(src|href)="(\/assets\/[^"]*)"/g, '$1="$2?v=' + ts + '"')
}

fs.writeFileSync(distPath, html)
console.log('✅ HTML patched with cache-bust v=' + ts)
