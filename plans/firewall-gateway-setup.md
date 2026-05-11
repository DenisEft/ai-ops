# 🔥 Firewall Gateway Setup — Plan

## Pre-setup (завтра)
- [ ] Установить второй NIC в PCIe слот
- [ ] Проверить обнаружение: `lspci | grep -i eth`
- [ ] Проверить имя нового интерфейса: `ip link show`
- [ ] Подключить WAN-кабель к LAN3 роутера

## Network config
- [ ] Настройка IP:
  - LAN (enp3s0): 192.168.0.181/24 (текущий)
  - WAN (enpXs0): 100.66.46.97 (DHCP от провайдера)
- [ ] Отключить роутер как шлюз по умолчанию на сервере
- [ ] Включить IP forwarding: `echo 1 > /proc/sys/net/ipv4/ip_forward`
- [ ] Настроить persistent: `/etc/sysctl.conf`

## Firewall rules (iptables)
- [ ] Базовый policy: INPUT DROP, FORWARD DROP, OUTPUT ACCEPT
- [ ] Разрешить established/related: `-m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT`
- [ ] Разрешить loopback
- [ ] Разрешить LAN → WAN (маскарадинг)
- [ ] Разрешить ICMP (ping)
- [ ] Разрешить DNS (UDP/TCP 53)
- [ ] Разрешить NTP (UDP 123)
- [ ] Разрешить HTTP/HTTPS для обновлений

## Security rules
- [ ] Блок port-scanning detection
- [ ] Блок SYN-flood
- [ ] Блок ICMP flood
- [ ] Rate-limit для SSH (если нужен доступ из WAN)
- [ ] Логирование всех dropped пакетов

## Monitoring
- [ ] Настройка rsyslog/syslog для firewall-логов
- [ ] Cron job для анализа логов
- [ ] AI мониторинг: я читаю логи и алерчу

## Testing
- [ ] Проверить интернет на сервере
- [ ] Проверить интернет на других устройствах
- [ ] Проверить MajordomoSL доступ
- [ ] Проверить WiFi клиентов
- [ ] Протестировать блокировку (симулировать атаку)

## Notes
- Роутер: D-Link DIR-842, login admin/XjiQmPeadrq888
- WAN IP: 100.66.46.97 (carrier-NAT)
- LAN: 192.168.0.1/24
- Server LAN MAC: BC:0F:9A:04:B4:60
