import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.join(__dirname, 'dist', 'index.html')
const html = fs.readFileSync(distPath, 'utf-8')
const ts = Date.now()
const patched = html.replace(/src="(\/assets\/[^"]+)"/g, (match, url) => `src="${url}?v=${ts}"`)
fs.writeFileSync(distPath, patched)
console.log('✅ HTML patched with cache-bust v=' + ts)
