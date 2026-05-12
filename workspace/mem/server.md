# Server

Ubuntu 24.04 LTS, AMD Ryzen 5 5600XT, 32 GB RAM, RTX 3090 (24 GB)
Network: enp3s0 (192.168.0.181)
sudo: `pass show sudo-password`

## llama-server (Qwen 35B MoE)
- Service: `llama-8080.service`
- Port: 8080, API: `http://127.0.0.1:8080/v1`
- RAM: ~9 ГБ, context: 200k
- ⚠️ Needs `--metrics` for dashboard

## llama-panel
- Backend: port **8081**
- Frontend: port **3001**
- Service: `llama-panel.service`
- JWT auth from `users.json`
