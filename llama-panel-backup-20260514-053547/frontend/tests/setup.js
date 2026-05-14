import '@testing-library/jest-dom/vitest'
import { TextEncoder, TextDecoder } from 'util'

// ResizeObserver polyfill for jsdom
const mockResizeObserver = {
  observe: () => {},
  unobserve: () => {},
  disconnect: () => {},
}

global.ResizeObserver = class ResizeObserver {
  constructor(callback) { this._callback = callback }
  observe(target) { this._target = target; this._callback([{ target, contentRect: { width: 800, height: 600 } }]) }
  unobserve() {}
  disconnect() {}
}

// Node.js TextEncoder/TextDecoder for browser compat
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
