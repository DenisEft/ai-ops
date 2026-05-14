/* eslint-disable no-unused-vars */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

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

// Mock useDashboard hook
vi.mock('../hooks/useDashboard.js', () => ({
  useDashboard: () => ({
    data: null,
    loading: true,
    error: null,
    refresh: vi.fn(),
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
    expect(screen.getByText('AI Ops')).toBeInTheDocument()
  })

  it('renders new bottom tab bar with 4 tabs', () => {
    render(<App />)
    expect(screen.getByText('Обзор')).toBeInTheDocument()
    expect(screen.getByText('Метрики')).toBeInTheDocument()
    expect(screen.getByText('Управление')).toBeInTheDocument()
    expect(screen.getByText('Настройки')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    render(<App />)
    // SkeletonFull renders animated placeholder cards (no text content)
    expect(document.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('renders without errors', () => {
    const { container } = render(<App />)
    expect(container).toBeTruthy()
  })
})
