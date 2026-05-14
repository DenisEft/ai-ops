/* eslint-disable no-unused-vars, no-console */
import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'ai-ops-widgets'

const defaultWidgets = [
  { id: 'cpu', label: 'CPU', type: 'gauge', chartType: 'bar', size: 'm', enabled: true, order: 0 },
  { id: 'memory', label: 'Память', type: 'gauge', chartType: 'bar', size: 'm', enabled: true, order: 1 },
  { id: 'gpu', label: 'GPU', type: 'gauge', chartType: 'bar', size: 'm', enabled: true, order: 2 },
  { id: 'tokens', label: 'Токены', type: 'chart', chartType: 'area', size: 'l', enabled: true, order: 3 },
  { id: 'requests', label: 'Запросы', type: 'chart', chartType: 'bar', size: 'l', enabled: true, order: 4 },
  { id: 'tokens-per-sec', label: 'Ток/сек', type: 'chart', chartType: 'line', size: 'm', enabled: true, order: 5 },
  { id: 'temperature', label: 'Температура', type: 'chart', chartType: 'line', size: 'm', enabled: true, order: 6 },
  { id: 'disk', label: 'Диск', type: 'gauge', chartType: 'bar', size: 's', enabled: true, order: 7 },
  { id: 'service-status', label: 'Сервисы', type: 'status', chartType: 'bar', size: 's', enabled: true, order: 8 },
  { id: 'load', label: 'Нагрузка', type: 'gauge', chartType: 'bar', size: 's', enabled: false, order: 9 },
  { id: 'gpu-power', label: 'GPU Power', type: 'gauge', chartType: 'bar', size: 's', enabled: false, order: 10 },
  { id: 'token-rate', label: 'Скорость токенов', type: 'table', chartType: 'bar', size: 'm', enabled: false, order: 11 },
]

const sizeGrid = {
  s: { w: 1, h: 1 },
  m: { w: 2, h: 2 },
  l: { w: 4, h: 3 },
}

export function useWidgetConfig() {
  const [widgets, setWidgets] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      console.log('[WIDGETS] localStorage:', saved ? 'EXISTS' : 'MISSING')
      if (saved) {
        const parsed = JSON.parse(saved)
        console.log('[WIDGETS] parsed widgets:', parsed.length, parsed.map(w => `${w.id}(${w.enabled})`))
        const enabled = parsed.filter(w => w.enabled).length
        console.log('[WIDGETS] enabled:', enabled)
        // If no enabled widgets, reset to defaults
        if (enabled === 0) {
          console.log('[WIDGETS] No enabled widgets, resetting to defaults')
          localStorage.removeItem(STORAGE_KEY)
          return defaultWidgets
        }
        // Merge with defaults to handle new widgets
        const merged = defaultWidgets.map(def => {
          const found = parsed.find(p => p.id === def.id)
          return found || def
        })
        // Add any new ones not in saved
        parsed.forEach(p => {
          if (!merged.find(m => m.id === p.id)) merged.push(p)
        })
        return merged.sort((a, b) => a.order - b.order)
      }
    } catch (e) {
      console.error('[WIDGETS] Parse error:', e)
      localStorage.removeItem(STORAGE_KEY)
    }
    return defaultWidgets
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets))
    } catch {}
  }, [widgets])

  const toggleWidget = useCallback((id) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w))
  }, [])

  const setSize = useCallback((id, size) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, size } : w))
  }, [])

  const setChartType = useCallback((id, chartType) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, chartType } : w))
  }, [])

  const reorder = useCallback((dragIdx, dropIdx) => {
    setWidgets(prev => {
      const next = [...prev]
      const [dragged] = next.splice(dragIdx, 1)
      next.splice(dropIdx, 0, dragged)
      return next.map((w, i) => ({ ...w, order: i }))
    })
  }, [])

  const reset = useCallback(() => {
    setWidgets(defaultWidgets)
  }, [])

  return { widgets, toggleWidget, setSize, setChartType, reorder, reset }
}
