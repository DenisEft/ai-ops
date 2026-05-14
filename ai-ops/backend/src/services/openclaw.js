import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';

const execAsync = promisify(exec);

export async function getStatus() {
  // Check via process (works from root)
  try {
    const { stdout } = await execAsync('pgrep -f "openclaw.*gateway" | head -1', { timeout: 3000 });
    const pid = parseInt(stdout.trim());
    const active = pid && pid > 0 ? 'active' : 'inactive';
    return { active, pid: pid || null, name: 'OpenClaw Gateway', port: 18789 };
  } catch {
    return { active: 'inactive', pid: null, name: 'OpenClaw Gateway', port: 18789 };
  }
}

export async function getGatewayInfo() {
  // Step 1: Check if process is alive via pgrep (works in all contexts)
  let healthy = false;
  let pid = null;
  try {
    const { stdout } = await execAsync('pgrep -f "openclaw.*gateway" | head -1', { timeout: 3000 });
    const p = parseInt(stdout.trim());
    if (p && p > 0) {
      try {
        process.kill(p, 0); // signal 0 = check existence
        healthy = true;
        pid = p;
      } catch {}
    }
  } catch {}

  // Step 2: Try CLI for details (may fail in systemd context — that's OK)
  let model = 'Qwen3.6-35B';
  let sessions = 0;
  let version = 'v2026.5.6';
  let uptime = null;
  try {
    const { stdout } = await execAsync('openclaw gateway status 2>&1', { timeout: 5000 });
    const modelMatch = stdout.match(/Model:\s*(.+)/i);
    const sessionsMatch = stdout.match(/Sessions?\s*[:=]\s*(\d+)/i);
    const versionMatch = stdout.match(/Version:\s*(.+)/i);
    const runtimeMatch = stdout.match(/Runtime:\s*(.+)/i);
    const pidMatch = stdout.match(/pid\s+(\d+)/i);
    if (modelMatch) model = modelMatch[1].trim();
    if (sessionsMatch) sessions = parseInt(sessionsMatch[1]);
    if (versionMatch) version = versionMatch[1].trim();
    if (runtimeMatch) uptime = runtimeMatch[1].trim();
    if (pidMatch && !pid) pid = parseInt(pidMatch[1]);
  } catch {}

  // Step 3: Fallback — parse model from OpenClaw log file
  if (model === 'Qwen3.6-35B') {
    try {
      const { stdout: log } = await execAsync('grep "agent model:" /tmp/openclaw/openclaw-2026-05-14.log 2>/dev/null | tail -1', { timeout: 3000 });
      const m = log.match(/agent model:\s*([^\s(]+)/);
      if (m) model = m[1];
    } catch {}
  }

  return { healthy, port: 18789, model, sessions, version, uptime, pid, metrics: {} };
}

export async function getSessions() {
  // Use CLI — HTTP API endpoints changed
  try {
    const { stdout } = await execAsync('openclaw sessions list 2>&1', { timeout: 5000 });
    if (stdout.trim()) {
      const lines = stdout.trim().split('\n').filter(l => l.trim());
      return lines.map(line => {
        const match = line.match(/^(\S+)\s+(\S+)\s+(\S+\s+\S+|\S+)/);
        if (match) {
          return { id: match[1], label: match[3] || '-', kind: match[2] || 'main' };
        }
        return { id: line.split(' ')[0] || 'unknown', label: '-', kind: '-' };
      });
    }
  } catch {}
  return [];
}

export async function getMetrics() {
  // Gather system-level metrics for OpenClaw
  const result = {};

  // Memory
  try {
    const { stdout: memInfo } = await execAsync('free -m | grep Mem');
    const parts = memInfo.trim().split(/\s+/);
    result.memoryTotal = parseInt(parts[1]);
    result.memoryUsed = parseInt(parts[2]);
    result.memoryFree = parseInt(parts[3]);
  } catch {}

  // CPU
  try {
    const { stdout: cpuInfo } = await execAsync('nproc');
    result.cpuCores = parseInt(cpuInfo.trim());
  } catch {}

  // Disk
  try {
    const { stdout: diskInfo } = await execAsync('df -h /home/den/.openclaw | tail -1');
    const parts = diskInfo.trim().split(/\s+/);
    result.diskTotal = parts[1] || '0';
    result.diskUsed = parts[2] || '0';
    result.diskUsagePercent = parts[4] || '0%';
  } catch {}

  return result;
}

export async function restart() {
  try {
    const { stdout } = await execAsync('pgrep -f "openclaw.*gateway" | head -1', { timeout: 3000 });
    const pid = parseInt(stdout.trim());
    if (pid && pid > 0) {
      process.kill(pid, 15); // SIGTERM — graceful shutdown
      return { success: true };
    }
    return { success: false, error: 'Process not found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function stop() {
  try {
    const { stdout } = await execAsync('pgrep -f "openclaw.*gateway" | head -1', { timeout: 3000 });
    const pid = parseInt(stdout.trim());
    if (pid && pid > 0) {
      process.kill(pid, 15); // SIGTERM
      return { success: true };
    }
    return { success: false, error: 'Process not found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function start() {
  // OpenClaw Gateway is managed by systemd user service
  // Try to restart via systemctl --user (requires D-Bus)
  try {
    await execAsync('sudo -u den systemctl --user restart openclaw-gateway.service 2>&1', { timeout: 10000 });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function healthCheck() {
  // Direct process check — more reliable than HTTP
  try {
    const { stdout } = await execAsync('pgrep -f "openclaw.*gateway"', { timeout: 3000 });
    const pids = stdout.trim().split('\n').filter(p => p.trim()).map(p => parseInt(p.trim()));
    const hasGateway = pids.some(pid => {
      try {
        process.kill(pid, 0); // check if process exists
        return true;
      } catch {
        return false;
      }
    });
    return { healthy: hasGateway, port: 18789 };
  } catch {
    return { healthy: false, port: 18789 };
  }
}
