import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Kill any process on port 8081 before tests start
export async function setup() {
  try {
    const { stdout } = await execAsync('lsof -ti:8081 2>/dev/null', { timeout: 2000 })
    if (stdout.trim()) {
      const pids = stdout.trim().split('\n')
      for (const pid of pids) {
        try { process.kill(parseInt(pid)) } catch {}
      }
    }
  } catch (e) {
    // Ignore
  }
}

// Kill any process on port 8081 after tests finish
export async function teardown() {
  try {
    const { stdout } = await execAsync('lsof -ti:8081 2>/dev/null', { timeout: 2000 })
    if (stdout.trim()) {
      const pids = stdout.trim().split('\n')
      for (const pid of pids) {
        try { process.kill(parseInt(pid)) } catch {}
      }
    }
  } catch (e) {
    // Ignore
  }
}
