import { useState } from 'react'

export default function ServicePanel({ data, onRefresh }) {
  const [action, setAction] = useState(null)
  const [message, setMessage] = useState(null)

  const handleControl = async (command) => {
    setAction(command)
    setMessage({ type: 'info', text: `Отправка команды ${command}...` })

    try {
      const res = await fetch('/api/service/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: command }),
      })

      const result = await res.json()

      if (result.success) {
        setMessage({ type: 'success', text: `✅ ${command} выполнен успешно` })
        setTimeout(onRefresh, 2000)
      } else {
        setMessage({ type: 'error', text: `❌ ${result.error}` })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setTimeout(() => setAction(null), 3000)
    }
  }

  const getStatusBadge = (active) => {
    if (active) return <span className="badge badge-success">● Active</span>
    return <span className="badge badge-error">● Inactive</span>
  }

  const getLlamaStatusBadge = (status) => {
    if (status === 'running') return <span className="badge badge-success">● Running</span>
    if (status === 'offline') return <span className="badge badge-error">● Offline</span>
    return <span className="badge badge-warning">● Unknown</span>
  }

  const commands = [
    { id: 'restart', label: '🔄 Перезапустить', desc: 'Restart service (quick)', danger: false },
    { id: 'reload', label: '📥 Reload', desc: 'Reload config without restart', danger: false },
    { id: 'stop', label: '⏹ Остановить', desc: 'Stop service', danger: true },
    { id: 'start', label: '▶️ Запустить', desc: 'Start service', danger: false },
  ]

  return (
    <div className="space-y-6">
      {/* Service Status */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">🔧 Статус сервиса</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">systemd</span>
              {getStatusBadge(data?.service?.active)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">llama-server</span>
              {getLlamaStatusBadge(data?.llama?.status)}
            </div>
            {data?.service?.active && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">PID</span>
                <span className="text-sm font-mono">{data?.service?.state || '—'}</span>
              </div>
            )}
          </div>

          {/* Quick status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Model</span>
              <span className="text-sm">Qwen3.6-35B</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Port</span>
              <span className="text-sm font-mono">8080</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">GPU</span>
              <span className="text-sm">{data?.gpu?.name || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">⚡ Управление</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {commands.map(cmd => (
            <button
              key={cmd.id}
              onClick={() => handleControl(cmd.id)}
              disabled={action !== null}
              className={`btn ${
                cmd.danger ? 'btn-danger' : 'btn-ghost'
              } ${action === cmd.id ? 'opacity-50 cursor-wait' : ''}`}
            >
              {cmd.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">{commands.find(c => c.id === action)?.desc || ''}</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-xl text-sm ${
          message.type === 'error'
            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
            : message.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
        }`}>
          {message.text}
        </div>
      )}

      {/* Logs */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">📋 Лог команды</h3>
        <pre className="text-xs text-gray-400 bg-gray-950 p-4 rounded-lg overflow-auto max-h-48">
{`# Service: llama-8080.service
# File: /etc/systemd/system/llama-8080.service
# Model: /mnt/models/Qwen3.6-35B-A3B-UD-IQ4_NL_XL.gguf

systemctl status llama-8080.service

[Unit]
Description=Llama Server (Qwen 35B MoE) on port 8080
After=network.target

[Service]
Type=simple
User=den
ExecStart=/home/den/llama.cpp/build/bin/llama-server \\
  -m /mnt/models/Qwen3.6-35B-A3B-UD-IQ4_NL_XL.gguf \\
  --host 127.0.0.1 --port 8080 \\
  -ngl 99 -t 8 -c 100000 -b 8192 \\
  --cache-type-k f16 --cache-type-v f16 \\
  --flash-attn on --parallel 1 --mlock
Restart=on-failure
RestartSec=5
TimeoutStopSec=60

[Install]
WantedBy=multi-user.target`}
        </pre>
      </div>
    </div>
  )
}
