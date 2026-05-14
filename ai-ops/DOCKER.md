# Docker Guide — ai-ops

## Быстрый старт

```bash
# Build
docker build -t ai-ops:latest .

# Run
docker run -d \
  --name ai-ops \
  -p 8081:8081 \
  -e LLAMA_URL=http://host.docker.internal:8080 \
  -e JWT_SECRET=your-secret \
  ai-ops:latest

# Check
docker logs -f ai-ops
curl http://localhost:8081/health
```

## docker-compose

```bash
# Run
docker compose up -d

# Logs
docker compose logs -f ai-ops

# Stop
docker compose down
```

## Production

```bash
# Build with cache
docker buildx build \
  --push \
  --cache-to type=gha,mode=max \
  --cache-from type=gha \
  --tag ghcr.io/cyberden/ai-ops:latest \
  --tag ghcr.io/cyberden/ai-ops:sha-$(git rev-parse --short HEAD) \
  .
```
