import bcrypt from 'bcrypt'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const USERS_FILE = path.join(__dirname, 'users.json')

// Default password — change this!
const DEFAULT_PASSWORD = 'llama2026'

const users = [
  {
    username: 'den',
    password: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
    name: 'Денис',
    role: 'admin',
  },
]

fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8')
console.log(`✅ users.json created at ${USERS_FILE}`)
console.log(`   Default login: den / ${DEFAULT_PASSWORD}`)
console.log('   ⚠️  Change the password after first login!')
