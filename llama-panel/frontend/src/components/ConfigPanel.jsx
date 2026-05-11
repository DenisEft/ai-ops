import { useState } from 'react'

const defaultConfig = {
  parallel: 1,
  threads: 8,
  gpu_layers: 99,
  ctx_len: 100000,
  batch_size: 8192,
  cacheTypeK: 'f16',
  cacheTypeV: 'f16',
  flashAttn: true,
  mlock: true,
}

export default function ConfigPanel({ data }) {
  const [config, setConfig] = useState(defaultConfig)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [formData, setFormData] = useState({ ...config })

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
    setMessage(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/service/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setConfig(formData)
        setMessage({ type: 'success', text: result.message || 'Config saved!' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const presets = {
    parallel: { min: 1, max: 8, step: 1, label: 'Parallel Sequences', desc: 'Количество параллельных GPU-последовательностей (kv-cache)' },
    threads: { min: 1, max: 24, step: 1, label: 'CPU Threads', desc: 'CPU потоки (не более числа ядер)' },
    gpu_layers: { min: 0, max: 100, step: 1, label: 'GPU Layers', desc: 'Слоей на GPU (99 = почти всё на GPU)' },
    ctx_len: { min: 2048, max: 1000000, step: 1024, label: 'Context Length', desc: 'Максимальная длина контекста' },
    batch_size: { min: 128, max: 65536, step: 128, label: 'Batch Size', desc: 'Размер батча для обработки' },
  }

  const toggleFields = {
    cacheTypeK: { label: 'KV Cache Type K', desc: 'Тип кеша для KV-ключей' },
    cacheTypeV: { label: 'KV Cache Type V', desc: 'Тип кеша для KV-значений' },
    flashAttn: { label: 'Flash Attention', desc: 'Оптимизированный attention (быстрее, меньше VRAM)' },
    mlock: { label: 'Memory Lock', desc: 'Блокировка памяти в swap' },
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">⚙️ Параметры llama-server</h3>
            <p className="text-sm text-gray-500 mt-1">
              Изменения применяются после перезапуска сервиса
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? '⏳ Сохранение...' : '💾 Сохранить'}
          </button>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm mb-6 ${
            message.type === 'error'
              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}>
            {message.text}
          </div>
        )}

        {/* Numeric fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(presets).map(([key, { min, max, step, label, desc }]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <p className="text-xs text-gray-500 mb-2">{desc}</p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={formData[key]}
                  onChange={e => handleChange(key, parseInt(e.target.value))}
                  className="flex-1 accent-blue-500"
                />
                <input
                  type="number"
                  min={min}
                  max={max}
                  step={step}
                  value={formData[key]}
                  onChange={e => handleChange(key, parseInt(e.target.value))}
                  className="input w-24 text-center"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>{min}</span>
                <span>{max}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Toggle fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-6 border-t border-gray-800">
          {Object.entries(toggleFields).map(([key, { label, desc }]) => (
            <label key={key} className="flex items-center justify-between cursor-pointer group">
              <div>
                <p className="text-sm font-medium text-gray-300">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={formData[key]}
                  onChange={e => handleChange(key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-checked:bg-blue-600 rounded-full transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full peer-checked:translate-x-5 transition-transform" />
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Current config display */}
      <div className="card">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">📋 Текущая конфигурация</h4>
        <pre className="text-xs text-gray-400 bg-gray-950 p-4 rounded-lg overflow-auto">
{`llama-server \\
  -m /mnt/models/Qwen3.6-35B-A3B-UD-IQ4_NL_XL.gguf \\
  --host 127.0.0.1 --port 8080 \\
  -ngl ${formData.gpu_layers} \\
  -t ${formData.threads} \\
  -c ${formData.ctx_len} \\
  -b ${formData.batch_size} \\
  --cache-type-k ${formData.cacheTypeK} \\
  --cache-type-v ${formData.cacheTypeV} \\
  --flash-attn ${formData.flashAttn ? 'on' : 'off'} \\
  --parallel ${formData.parallel} \\
  --mlock`}
        </pre>
      </div>
    </div>
  )
}
