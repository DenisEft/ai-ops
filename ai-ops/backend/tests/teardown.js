// Kill any process listening on port 8081 after tests
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export default async () => {
  try {
    const { stdout } = await execAsync('lsof -ti:8081 2>/dev/null', { timeout: 2000 })
    if (stdout.trim()) {
      const pids = stdout.trim().split('\n')
      for (const pid of pids) {
        try { process.kill(parseInt(pid)) } catch {}
      }
    }
  } catch (e) {
    // Ignore - port might already be free
  }
}
