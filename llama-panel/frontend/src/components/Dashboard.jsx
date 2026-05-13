import { useState, useEffect } from 'react'
import GaugeWidget from './GaugeWidget'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8081'

function formatUptime(seconds) {
  if (!seconds) return 'N/A'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export default function Dashboard({ metrics, statsData, loading, wsStatus, metricsConfig }) {
  const [system, setSystem] = useState(null)
  const [gpu, setGpu] = useState(null)
  const [llama, setLlama] = useState(null)
  const [service, setService] = useState(null)
  const [openclaw, setOpenclaw] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [sysRes, gpuRes, llamaRes, svcRes, ocRes] = await Promise.all([
          fetch(`${API}/api/metrics/system`),
          fetch(`${API}/api/metrics/gpu`),
          fetch(`${API}/api/metrics/llama`),
          fetch(`${API}/api/metrics/service`),
          fetch(`${API}/api/openclaw/status`),
        ])
        setSystem(await sysRes.json())
        setGpu(await gpuRes.json())
        setLlama(await llamaRes.json())
        setService(await svcRes.json())
        setOpenclaw(ocRes.ok ? await ocRes.json() : null)
      } catch (err) {
        console.error('Failed to load dashboard:', err)
      }
    }
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>WS: <span className={wsStatus === 'connected' ? 'text-emerald-400' : 'text-red-400'}>{wsStatus}</span></span>
        <span>llama: <span className={llama?.status === 'ok' ? 'text-emerald-400' : 'text-red-400'}>{llama?.status || '—'}</span></span>
        <span>OC: <span className={openclaw?.active ? 'text-emerald-400' : 'text-red-400'}>{openclaw?.active ? 'active' : 'inactive'}</span></span>
      </div>

      {/* Service cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* OpenClaw */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">🐾 OpenClaw</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${openclaw?.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
              {openclaw?.active ? 'Active' : 'Down'}
            </span>
          </div>
          <div className="space-y-1 text-xs text-gray-400">
            <div className="flex justify-between"><span>PID</span><span className="text-white font-mono">{openclaw?.pid || '—'}</span></div>
            <div className="flex justify-between"><span>Port</span><span className="text-white font-mono">{openclaw?.port || '—'}</span></div>
            <div className="flex justify-between"><span>Uptime</span><span className="text-white">{formatUptime(system?.openclawUptime)}</span></div>
          </div>
        </div>

        {/* Llama Server */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">🦙 Llama Server</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${llama?.status === 'ok' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
              {llama?.status || '—'}
            </span>
          </div>
          <div className="space-y-1 text-xs text-gray-400">
            <div className="flex justify-between"><span>Model</span><span className="text-white text-[10px] truncate" title={llama?.model}>{llama?.model || '—'}</span></div>
            <div className="flex justify-between"><span>Queue</span><span className="text-white">{llama?.queue_size || 0}</span></div>
            <div className="flex justify-between"><span>Tokens/s</span><span className="text-emerald-400 font-medium">{llama?.tokens_per_second?.toFixed(1) || '—'}</span></div>
            <div className="flex justify-between"><span>Uptime</span><span className="text-white">{formatUptime(llama?.uptime_seconds)}</span></div>
          </div>
        </div>

        {/* Llama Panel */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">📊 Panel</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${service?.llama_panel?.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
              {service?.llama_panel?.active ? 'Active' : 'Down'}
            </span>
          </div>
          <div className="space-y-1 text-xs text-gray-400">
            <div className="flex justify-between"><span>PID</span><span className="text-white font-mono">{service?.llama_panel?.pid || '—'}</span></div>
            <div className="flex justify-between"><span>Port</span><span className="text-white font-mono">{service?.llama_panel?.port || '—'}</span></div>
          </div>
        </div>
      </div>

      {/* System & GPU gauges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GaugeWidget label="CPU" value={system?.cpu?.usage || 0} max={100} color="blue" />
        <GaugeWidget label="RAM" value={system?.memory?.used_percent || 0} max={100} color="green" />
        <GaugeWidget label="GPU Temp" value={gpu?.temperature || 0} max={100} color="purple" />
        <GaugeWidget label="GPU Load" value={gpu?.utilization || 0} max={100} color="cyan" />
      </div>

      {/* LLM Metrics */}
      {llama && llama.metrics && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-3">
          <h3 className="text-xs font-medium text-gray-400 mb-2">LLM Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-gray-500">Tokens/sec:</span>
              <span className="ml-2 font-medium text-emerald-400">
                {llama.tokens_per_second?.toFixed(1) ?? '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Decoded:</span>
              <span className="ml-2 font-medium text-white">
                {llama.metrics.llama_tokens_decoded ?? '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Promoted:</span>
              <span className="ml-2 font-medium text-white">
                {llama.metrics.llama_tokens_promoted ?? '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Context:</span>
              <span className="ml-2 font-medium text-white">
                {llama.metrics.llama_context_size ?? '—'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
