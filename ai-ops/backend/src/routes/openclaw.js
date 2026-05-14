import { Router } from 'express';
import * as openclawService from '../services/openclaw.js';

const router = Router();

router.get('/status', async (_req, res) => {
  try {
    const status = await openclawService.getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/gateway', async (_req, res) => {
  try {
    const info = await openclawService.getGatewayInfo();
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sessions', async (_req, res) => {
  try {
    const sessions = await openclawService.getSessions();
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/metrics', async (_req, res) => {
  try {
    const metrics = await openclawService.getMetrics();
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/restart', async (_req, res) => {
  try {
    const result = await openclawService.restart();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/stop', async (_req, res) => {
  try {
    const result = await openclawService.stop();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/start', async (_req, res) => {
  try {
    const result = await openclawService.start();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
