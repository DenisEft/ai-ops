import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWebSocket } from '../hooks/useWebSocket'

describe('useWebSocket', () => {
  let currentWs = null
  let MockClass

  beforeEach(() => {
    currentWs = null
    MockClass = vi.fn(function (url) {
      currentWs = {
        url,
        readyState: 0,
        onopen: null,
        onmessage: null,
        onclose: null,
        onerror: null,
        send: vi.fn(),
        close: vi.fn(),
      }
      return currentWs
    })
    MockClass.CONNECTING = 0
    MockClass.OPEN = 1
    MockClass.CLOSING = 2
    MockClass.CLOSED = 3
    MockClass.instance = () => currentWs
    global.WebSocket = MockClass
  })

  afterEach(() => {
    vi.restoreAllMocks()
    currentWs = null
  })

  it('initially connects', () => {
    renderHook(() => useWebSocket())
    expect(MockClass).toHaveBeenCalledWith('/ws')
    expect(currentWs).toBeDefined()
  })

  it('updates data and status on message', () => {
    const { result } = renderHook(() => useWebSocket('/ws'))

    const mockData = {
      timestamp: new Date().toISOString(),
      system: { cpu: { usage: 25 } },
      gpu: { temperature: 65 },
    }

    act(() => {
      currentWs.readyState = 1
      currentWs.onopen?.()
      currentWs.onmessage?.({
        data: JSON.stringify({ type: 'metrics', data: mockData }),
      })
    })

    expect(result.current.status).toBe('connected')
    expect(result.current.data).toEqual(mockData)
  })

  it('reconnects on close', () => {
    const { result, unmount } = renderHook(() => useWebSocket('/ws'))

    // Simulate initial connection
    act(() => {
      currentWs.readyState = 1
      currentWs.onopen?.()
    })
    expect(result.current.status).toBe('connected')

    // Simulate disconnect
    act(() => {
      currentWs.onclose?.()
    })

    expect(result.current.status).toBe('disconnected')

    // Manually trigger reconnect
    act(() => {
      result.current.reconnect()
    })

    // New WS should have been created
    expect(MockClass).toHaveBeenCalled()
    expect(currentWs).toBeDefined()

    unmount()
  })
})
