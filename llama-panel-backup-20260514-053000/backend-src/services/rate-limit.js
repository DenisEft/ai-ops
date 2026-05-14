/**
 * Simple in-memory rate limiter
 * Usage: const limiter = new RateLimiter({ windowMs: 60000, max: 5 })
 *        limiter.check(key) → true if allowed, false if rate limited
 */
export class RateLimiter {
  constructor({ windowMs = 60000, max = 5 } = {}) {
    this.windowMs = windowMs
    this.max = max
    this.buckets = new Map()
  }

  check(key) {
    const now = Date.now()
    const bucket = this.buckets.get(key)

    if (!bucket || now - bucket.windowStart > this.windowMs) {
      // Reset bucket
      this.buckets.set(key, { windowStart: now, count: 1 })
      return true
    }

    bucket.count++
    if (bucket.count > this.max) {
      return false
    }
    return true
  }

  getRemaining(key) {
    const bucket = this.buckets.get(key)
    if (!bucket) return this.max
    return Math.max(0, this.max - bucket.count)
  }

  /** Cleanup old buckets every 5 minutes */
  startCleanup(intervalMs = 300000) {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, bucket] of this.buckets) {
        if (now - bucket.windowStart > this.windowMs * 2) {
          this.buckets.delete(key)
        }
      }
    }, intervalMs)
  }

  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}

const authLimiter = new RateLimiter({ windowMs: 60000, max: 10 })
authLimiter.startCleanup()

export default authLimiter
