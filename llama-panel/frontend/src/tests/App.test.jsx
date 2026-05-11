import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from '../App'

const mockWsData = {
  timestamp: new Date().toISOString(),
  system: {
    cpu: { brand: 'AMD Ryzen 5 5600XT', usage: 25, physicalCores: 6 },
    memory: { total: 34359738368, available: 21474836480, used: 12884901888, activeMem: 0.4 },
    load: { load1: 0.5 },
    filesystem: { size: 125000000000, used: 58000000000, avail: 67000000000, use: 46 },
  },
  gpu: {
    name: 'NVIDIA GeForce RTX 3090',
    memoryUsed: 17500,
    memoryTotal: 24576,
    temperature: 65,
    powerDraw: 180,
    memoryPercent: 71,
  },
  llama: { status: 'running', props: { default_generation_settings: { params: { n_ctx: 100000, n_batch: 8192 } } } },
  service: { active: true },
}

// Mock the WebSocket hook — all tests get connected data
vi.mock('../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    data: mockWsData,
    status: 'connected',
    reconnect: vi.fn(),
  }),
}))

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders header with title', () => {
    render(<App />)
    expect(screen.getByText('Llama Panel')).toBeInTheDocument()
  })

  it('renders all dashboard tabs', () => {
    render(<App />)
    expect(screen.getByText('📊 Дашборд')).toBeInTheDocument()
    expect(screen.getByText('⚙️ Конфиг')).toBeInTheDocument()
    expect(screen.getByText('🔧 Сервис')).toBeInTheDocument()
    expect(screen.getByText('💬 Чат')).toBeInTheDocument()
  })

  it('renders CPU metric with data', () => {
    render(<App />)
    expect(screen.getByText('CPU Usage')).toBeInTheDocument()
  })

  it('renders GPU metrics', () => {
    render(<App />)
    const vramLabels = screen.queryAllByText('VRAM')
    expect(vramLabels.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('GPU Temp')).toBeInTheDocument()
  })

  it('shows WebSocket connected status', () => {
    render(<App />)
    expect(screen.getByText('Онлайн')).toBeInTheDocument()
  })

  it('shows LIVE badge when connected', () => {
    render(<App />)
    expect(screen.getByText('LIVE')).toBeInTheDocument()
  })

  it('renders service control button', () => {
    render(<App />)
    expect(screen.getByText('🔧 Сервис')).toBeInTheDocument()
  })

  it('renders all dashboard info cards', () => {
    render(<App />)
    expect(screen.getByText('🖥 System')).toBeInTheDocument()
    expect(screen.getByText('🎮 GPU')).toBeInTheDocument()
    expect(screen.getByText('🤖 Llama Server')).toBeInTheDocument()
  })

  it('renders without errors', () => {
    const { container } = render(<App />)
    expect(container).toBeTruthy()
  })
})
