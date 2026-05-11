import request from 'supertest'
import app from '../src/index.js'

describe('Metrics API', () => {
  test('GET /health should return ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  test('GET /api/metrics should return system info', async () => {
    const res = await request(app).get('/api/metrics')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('system')
    expect(res.body).toHaveProperty('gpu')
  })
})

describe('Service API', () => {
  test('GET /api/service/status should return service status', async () => {
    const res = await request(app).get('/api/service/status')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('active')
  })

  test('GET /api/service/config should return config', async () => {
    const res = await request(app).get('/api/service/config')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('parallel')
    expect(res.body).toHaveProperty('threads')
  })

  test('POST /api/service/control with invalid action should return 400', async () => {
    const res = await request(app).post('/api/service/control')
      .send({ action: 'invalid' })
    expect(res.status).toBe(400)
  })

  test('POST /api/service/control with valid action should return 200', async () => {
    const res = await request(app).post('/api/service/control')
      .send({ action: 'status' })
    expect(res.status).toBe(200)
  })
})
