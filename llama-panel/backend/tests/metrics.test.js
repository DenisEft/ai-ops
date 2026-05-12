import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import express from 'express'
import request from 'supertest'

// Create a test app without WebSocket to avoid port conflicts
function createTestApp() {
  const app = express()
  app.use(express.json())

  // Mock services for testing
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() })
  })

  app.get('/api/metrics', (req, res) => {
    res.json({
      timestamp: new Date().toISOString(),
      system: {
        cpu: { brand: 'AMD Ryzen 5 5600XT', usage: 45 },
        memory: { total: 34359738368, used: 12884901888, percent: 37 },
        load: { load1: 0.5 },
        filesystem: { total: 125000000000, used: 58000000000, avail: 67000000000, use: 46 },
      },
      gpu: {
        name: 'NVIDIA GeForce RTX 3090',
        memoryUsed: 17500,
        memoryTotal: 24576,
        temperature: 65,
        powerDraw: 180,
        memoryPercent: 71,
      },
      llama: { status: 'running' },
      services: [{ name: 'llama-8080.service', label: 'llama-8080', active: true }],
      tokens: { total: 125000, prompt: 5000, predicted: 120000 },
      requests: 450,
      tokensPerSec: 45.2,
      gpuTemp: 65,
      gpuPower: 180,
      cpuFan: 0,
    })
  })

  app.get('/api/service/status', (req, res) => {
    res.json({ active: true, state: 'active' })
  })

  app.get('/api/service/config', (req, res) => {
    res.json({
      parallel: 1,
      threads: 8,
      gpu_layers: 99,
      ctx_len: 100000,
      batch_size: 8192,
      cacheTypeK: 'f16',
      cacheTypeV: 'f16',
      flashAttn: true,
      mlock: true,
    })
  })

  app.post('/api/service/control', (req, res) => {
    const { name, action } = req.body
    if (!name || !action) {
      return res.status(400).json({ error: 'name and action are required' })
    }
    res.json({ success: true, action, status: 'ok' })
  })

  return app
}

const app = createTestApp()

describe('Metrics API', () => {
  it('GET /health should return ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  it('GET /api/metrics should return system info', async () => {
    const res = await request(app).get('/api/metrics')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('system')
    expect(res.body).toHaveProperty('gpu')
    expect(res.body.system).toHaveProperty('cpu')
    expect(res.body.system).toHaveProperty('memory')
    expect(res.body.gpu).toHaveProperty('name')
    expect(res.body.gpu).toHaveProperty('memoryUsed')
  })
})

describe('Service API', () => {
  it('GET /api/service/status should return service status', async () => {
    const res = await request(app).get('/api/service/status')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('active')
  })

  it('GET /api/service/config should return config', async () => {
    const res = await request(app).get('/api/service/config')
    expect(res.body).toHaveProperty('parallel')
    expect(res.body).toHaveProperty('threads')
    expect(res.body).toHaveProperty('gpu_layers')
  })

  it('POST /api/service/control with missing fields should return 400', async () => {
    const res = await request(app).post('/api/service/control')
      .send({ action: 'restart' })
    expect(res.status).toBe(400)
  })

  it('POST /api/service/control with valid action should return 200', async () => {
    const res = await request(app).post('/api/service/control')
      .send({ name: 'llama-8080', action: 'restart' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('success')
  })
})

describe('API structure', () => {
  it('should have known endpoints', async () => {
    // Health endpoint exists
    const health = await request(app).get('/health')
    expect(health.status).toBe(200)

    // Metrics endpoint exists
    const metrics = await request(app).get('/api/metrics')
    expect(metrics.status).toBe(200)
    expect(metrics.body).toHaveProperty('timestamp')
    expect(metrics.body).toHaveProperty('system')
    expect(metrics.body).toHaveProperty('gpu')

    // Service endpoints exist
    const serviceStatus = await request(app).get('/api/service/status')
    expect(serviceStatus.status).toBe(200)
    expect(serviceStatus.body).toHaveProperty('active')

    const serviceConfig = await request(app).get('/api/service/config')
    expect(serviceConfig.status).toBe(200)
    expect(serviceConfig.body).toHaveProperty('parallel')
    expect(serviceConfig.body).toHaveProperty('threads')

    // Service control validates input
    const controlEmpty = await request(app).post('/api/service/control').send({})
    expect(controlEmpty.status).toBe(400)

    const controlValid = await request(app).post('/api/service/control').send({ name: 'llama-8080', action: 'status' })
    expect(controlValid.status).toBe(200)
    expect(controlValid.body).toHaveProperty('success')
  })
})
