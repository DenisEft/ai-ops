import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '../contexts/AuthContext'

export default function MetricsManager({ metrics: initialMetrics = null, onClose }) {
  const [metrics, setMetrics] = useState(Array.isArray(initialMetrics) ? initialMetrics : [])
  
  // Guard: if metrics prop changes to null/undefined, reset state
  useEffect(() => {
    if (!Array.isArray(initialMetrics)) {
      setMetrics([])
    }
  }, [initialMetrics])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [newMetric, setNewMetric] = useState({
    id: '',
    nameRu: '',
    name: '',
    type: 'gauge',
    unit: '',
    max: 100,
    color: '#06b6d4',
    collect: {
      method: 'command',
      command: '',
      regex: '',
      interval: 5000
    },
    description: ''
  })

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await authFetch('/api/metrics-config')
      const data = await res.json()
      setMetrics(data.metrics || [])
    } catch (err) {
      console.error('Failed to load metrics config:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialMetrics) {
      setMetrics(initialMetrics)
      setLoading(false)
    } else {
      fetchMetrics()
    }
  }, [initialMetrics, fetchMetrics])

  const toggleMetric = async (id) => {
    try {
      await authFetch(`/api/metrics-config/${id}/toggle`, { method: 'PATCH' })
      setMetrics(metrics.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m))
    } catch (err) {
      console.error('Failed to toggle metric:', err)
    }
  }

  const removeMetric = async (id) => {
    if (!confirm('Удалить эту метрику?')) return
    try {
      await authFetch(`/api/metrics-config/${id}`, { method: 'DELETE' })
      setMetrics(metrics.filter(m => m.id !== id))
    } catch (err) {
      console.error('Failed to remove metric:', err)
    }
  }

  const saveNewMetric = async () => {
    if (!newMetric.id || !newMetric.nameRu) {
      alert('Заполните ID и название метрики')
      return
    }
    try {
      const res = await authFetch('/api/metrics-config/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMetric)
      })
      const data = await res.json()
      if (res.ok) {
        setMetrics([...metrics, data.metric])
        setShowAddForm(false)
        setNewMetric({
          id: '',
          nameRu: '',
          name: '',
          type: 'gauge',
          unit: '',
          max: 100,
          color: '#06b6d4',
          collect: {
            method: 'command',
            command: '',
            regex: '',
            interval: 5000
          },
          description: ''
        })
      } else {
        alert(data.error)
      }
    } catch (err) {
      alert('Ошибка сохранения метрики')
    }
  }

  const updateMetric = async (id, updates) => {
    try {
      await authFetch(`/api/metrics-config/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      setMetrics(metrics.map(m => m.id === id ? { ...m, ...updates } : m))
      setEditingId(null)
    } catch (err) {
      console.error('Failed to update metric:', err)
    }
  }

  const getCollectionMethodOptions = () => [
    { value: 'command', label: 'Команда (CLI)' },
    { value: 'nvidia-smi', label: 'nvidia-smi' },
    { value: 'systeminfo', label: 'systeminformation' },
    { value: 'prometheus', label: 'Prometheus (llama-server)' },
    { value: 'thermal', label: 'Температура (sysfs)' },
    { value: 'filesystem', label: 'Диск (filesystem)' },
    { value: 'procstat', label: '/proc/stat' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Управление метриками</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xl"
        >
          ×
        </button>
      </div>

      {/* Add metric button */}
      <button
        onClick={() => setShowAddForm(!showAddForm)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
      >
        {showAddForm ? 'Отмена' : '+ Добавить метрику'}
      </button>

      {/* Add form */}
      {showAddForm && (
        <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg space-y-4">
          <h4 className="text-sm font-medium text-gray-300">Новая метрика</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">ID (уникальный)</label>
              <input
                type="text"
                value={newMetric.id}
                onChange={e => setNewMetric({ ...newMetric, id: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                placeholder="cpu-fan-speed"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Название (RU)</label>
              <input
                type="text"
                value={newMetric.nameRu}
                onChange={e => setNewMetric({ ...newMetric, nameRu: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                placeholder="Скорость вентилятора CPU"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Тип</label>
              <select
                value={newMetric.type}
                onChange={e => setNewMetric({ ...newMetric, type: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
              >
                <option value="gauge">Gauge</option>
                <option value="chart">Chart</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Единица</label>
              <input
                type="text"
                value={newMetric.unit}
                onChange={e => setNewMetric({ ...newMetric, unit: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                placeholder="RPM"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Цвета</label>
              <input
                type="color"
                value={newMetric.color}
                onChange={e => setNewMetric({ ...newMetric, color: e.target.value })}
                className="w-full h-8 bg-gray-800 border border-gray-700 rounded cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Метод сбора</label>
            <select
              value={newMetric.collect.method}
              onChange={e => setNewMetric({ 
                ...newMetric, 
                collect: { ...newMetric.collect, method: e.target.value }
              })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
            >
              {getCollectionMethodOptions().map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {newMetric.collect.method === 'command' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Команда</label>
                <input
                  type="text"
                  value={newMetric.collect.command}
                  onChange={e => setNewMetric({ 
                    ...newMetric, 
                    collect: { ...newMetric.collect, command: e.target.value }
                  })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm font-mono"
                  placeholder="cat /sys/class/hwmon/hwmon0/fan1_input"
                />
                <p className="text-xs text-gray-500 mt-1">Пример: cat /sys/class/hwmon/hwmon0/fan1_input</p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Регулярное выражение (опционально)</label>
                <input
                  type="text"
                  value={newMetric.collect.regex}
                  onChange={e => setNewMetric({ 
                    ...newMetric, 
                    collect: { ...newMetric.collect, regex: e.target.value }
                  })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm font-mono"
                  placeholder="Fan:\s*(\\d+)"
                />
                <p className="text-xs text-gray-500 mt-1">Если команда возвращает текст, извлекет число по regex</p>
              </div>
            </div>
          )}

          {newMetric.collect.method === 'nvidia-smi' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Поле</label>
              <select
                value={newMetric.collect.field || ''}
                onChange={e => setNewMetric({ 
                  ...newMetric, 
                  collect: { ...newMetric.collect, field: e.target.value }
                })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
              >
                <option value="">Выберите поле...</option>
                <option value="memoryPercent">Загрузка памяти GPU (%)</option>
                <option value="temperature">Температура GPU (°C)</option>
                <option value="powerDraw">Потребление GPU (W)</option>
              </select>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <button
              onClick={saveNewMetric}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-medium transition-colors"
            >
              Сохранить
            </button>
          </div>
        </div>
      )}

      {/* Metrics list */}
      <div className="space-y-3">
        {(metrics || []).map(metric => (
          <div
            key={metric.id}
            className={`p-4 border rounded-lg transition-colors ${
              metric.enabled 
                ? 'bg-gray-900/50 border-gray-700' 
                : 'bg-gray-900/20 border-gray-800 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: metric.color }}
                />
                <span className="font-medium text-white text-sm">{metric.nameRu || metric.name}</span>
                {metric.custom && (
                  <span className="px-2 py-0.5 bg-purple-600/20 text-purple-400 text-xs rounded-full">
                    Пользовательская
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleMetric(metric.id)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    metric.enabled
                      ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                      : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                  }`}
                >
                  {metric.enabled ? 'Вкл' : 'Выкл'}
                </button>
                <button
                  onClick={() => setEditingId(editingId === metric.id ? null : metric.id)}
                  className="px-2 py-1 text-xs bg-gray-600/20 text-gray-400 hover:bg-gray-600/30 rounded transition-colors"
                >
                  ✏️
                </button>
                <button
                  onClick={() => removeMetric(metric.id)}
                  className="px-2 py-1 text-xs bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Metric details */}
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
              <div>
                <span className="text-gray-500">Метод:</span> {metric.collect.method}
              </div>
              <div>
                <span className="text-gray-500">Интервал:</span> {(metric.collect.interval / 1000).toFixed(1)}s
              </div>
              <div>
                <span className="text-gray-500">Единица:</span> {metric.unit || '-'}
              </div>
            </div>

            {/* Command preview for custom metrics */}
            {metric.collect.method === 'command' && metric.collect.command && (
              <div className="mt-2 p-2 bg-gray-800/50 rounded text-xs font-mono text-gray-300">
                $ {metric.collect.command}
                {metric.collect.regex && (
                  <span className="ml-2 text-blue-400">| {metric.collect.regex}</span>
                )}
              </div>
            )}

            {/* Edit form */}
            {editingId === metric.id && (
              <div className="mt-3 p-3 bg-gray-800/30 rounded space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={metric.nameRu || ''}
                    onChange={e => updateMetric(metric.id, { nameRu: e.target.value })}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                    placeholder="Название"
                  />
                  <input
                    type="number"
                    value={metric.max || 100}
                    onChange={e => updateMetric(metric.id, { max: parseInt(e.target.value) || 100 })}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                    placeholder="Максимум"
                  />
                </div>
                <div className="flex space-x-2">
                  <input
                    type="color"
                    value={metric.color || '#06b6d4'}
                    onChange={e => updateMetric(metric.id, { color: e.target.value })}
                    className="w-8 h-8 bg-gray-700 border border-gray-600 rounded cursor-pointer"
                  />
                  <button
                    onClick={() => updateMetric(metric.id, { max: metric.max })}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm"
                  >
                    Готово
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick add templates */}
      <div className="mt-6 p-4 bg-gray-900/30 border border-gray-800 rounded-lg">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Быстрые шаблоны</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setNewMetric({
                ...newMetric,
                id: 'cpu-fan',
                nameRu: 'Вентилятор CPU',
                name: 'CPU Fan Speed',
                unit: 'RPM',
                max: 8000,
                collect: { method: 'command', command: 'cat /sys/class/hwmon/hwmon0/fan1_input', regex: null, interval: 5000 }
              })
              setShowAddForm(true)
            }}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs text-gray-300 transition-colors"
          >
            💨 Вентилятор CPU
          </button>
          <button
            onClick={() => {
              setNewMetric({
                ...newMetric,
                id: 'gpu-fan',
                nameRu: 'Вентилятор GPU',
                name: 'GPU Fan Speed',
                unit: 'RPM',
                max: 3000,
                collect: { method: 'command', command: "nvidia-smi --query-gpu=fans.speed --format=csv,noheader", regex: '(\\d+)', interval: 5000 }
              })
              setShowAddForm(true)
            }}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs text-gray-300 transition-colors"
          >
            💨 Вентилятор GPU
          </button>
          <button
            onClick={() => {
              setNewMetric({
                ...newMetric,
                id: 'ram-temp',
                nameRu: 'Температура RAM',
                name: 'RAM Temperature',
                unit: '°C',
                max: 100,
                collect: { method: 'command', command: 'sensors | grep -m1 "Temp" | grep -o "[0-9]\\+\\.?[0-9]*" | head -1', regex: null, interval: 10000 }
              })
              setShowAddForm(true)
            }}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs text-gray-300 transition-colors"
          >
            🌡️ Температура RAM
          </button>
          <button
            onClick={() => {
              setNewMetric({
                ...newMetric,
                id: 'nvme-temp',
                nameRu: 'Температура NVMe',
                name: 'NVMe Temperature',
                unit: '°C',
                max: 100,
                collect: { method: 'command', command: 'smartctl -A /dev/nvme0n1 | grep Temperature | awk \'{print $10}\'', regex: null, interval: 30000 }
              })
              setShowAddForm(true)
            }}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs text-gray-300 transition-colors"
          >
            💾 Температура NVMe
          </button>
        </div>
      </div>
    </div>
  )
}
