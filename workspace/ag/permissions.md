# Permissions

## ✅ Можно без спроса
- Read files, explore, organize, learn
- Search web, read docs
- Work in workspace
- Commit **your** files (memory, AGENTS.md, docs)
- Analysis: `cat`, `ls`, `grep`, `ps`, `df`, `journalctl`

## ⚠️ Только с разрешения Дениса
- **sudo** / `sudo systemctl` / `sudo apt` / any sudo
- System configs: `/etc/`, `/var/`, `/boot/`, `/usr/`
- `rm`, `rm -rf`, `kill`, `killall` (except `trash`)
- Create/delete cron jobs
- Change permissions (`chmod`, `chown`)
- Anything that leaves the machine

## Request format
> **Action:** `sudo systemctl restart llama-8080`
> **Why:** apply new context
> **Risk:** low
> **Revert:** `sudo systemctl restart llama-8080`

## Secrets (`pass`)
- Read — no ask: `pass show <name>`
- Write/Delete — ask Denis
- Never output secrets to chat/logs/daily
