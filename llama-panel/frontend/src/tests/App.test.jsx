import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from '../App'

const mockWsData = {
  timestamp: new Date().toISOString(),
  cpu: { brand: 'AMD Ryzen 5 5600XT', usage: 25, cores: 6, temperature: 45 },
  memory: { total: 34359738368, available: 21474836480, used: 12884901888, percent: 37 },
  load: { load1: 0.5, load5: 0.4, load15: 0.3 },
  disk: { total: 125000000000, used: 58000000000, avail: 67000000000, percent: 46 },
  gpu: {
    name: 'NVIDIA GeForce RTX 3090',
    memoryUsed: 17500,
    memoryTotal: 24576,
    temperature: 65,
    powerDraw: 180,
    memoryPercent: 71,
  },
  llama: { status: 'running', health: { ok: true }, props: {}, metrics: {} },
  services: { 'llama-8080': { active: true }, 'llama-panel': { active: true } },
  tokens: { total: 125000, prompt: 5000, predicted: 120000 },
  requests: 450,
  tokensPerSec: 45.2,
  gpuTemp: 65,
  gpuPower: 180,
  cpuFan: 0,
}

// Mock auth context
vi.mock('../contexts/AuthContext.jsx', () => ({
  AuthProvider: ({ children }) => children,
  RequireAuth: ({ children }) => children,
  useAuth: () => ({ user: { username: 'admin', name: 'Администратор', role: 'admin' }, loading: false, logout: vi.fn() }),
  authFetch: vi.fn(),
}))

// Mock useWidgetConfig
vi.mock('../hooks/useWidgetConfig.js', () => ({
  useWidgetConfig: () => ({
    widgets: [
      { id: 'cpu', label: 'CPU', type: 'gauge', enabled: true, order: 0 },
      { id: 'memory', label: 'Память', type: 'gauge', enabled: true, order: 1 },
    ],
    toggleWidget: vi.fn(),
    setSize: vi.fn(),
    setChartType: vi.fn(),
    reorder: vi.fn(),
    reset: vi.fn(),
  }),
}))

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders header with title', () => {
    render(<App />)
    expect(screen.getByText('Llama Panel')).toBeInTheDocument()
  })

  it('renders all dashboard tabs', () => {
    render(<App />)
    expect(screen.getByText('📊 Метрики')).toBeInTheDocument()
    expect(screen.getByText('📈 Статистика')).toBeInTheDocument()
    expect(screen.getByText('🛠 Управление')).toBeInTheDocument()
    expect(screen.getByText('⚙️ Конфиг')).toBeInTheDocument()
    expect(screen.getByText('📋 Логи')).toBeInTheDocument()
  })

  it('shows connection status', () => {
    render(<App />)
    // Initially shows "Подключение…" since fetch is async
    expect(screen.getByText('Подключение…')).toBeInTheDocument()
  })

  it('renders without errors', () => {
    const { container } = render(<App />)
    expect(container).toBeTruthy()
  })
})
