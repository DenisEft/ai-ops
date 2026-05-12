# Network

## Router: D-Link DIR-842 (MTS)
- LAN: 192.168.0.1/24, WAN: 100.66.46.97 (carrier-NAT)
- IPv6: fd01::1/64, WiFi: `MTSRouter-04B461` / `MTSRouter-5G-04B461`
- Port forward: TCP 6677 → 192.168.0.17:2222
- ⚠️ No static IP, no global IPv6

## Firewall (plan)
- USB Ethernet adapter (RTL8153) for second port
- Internet → [Lora WAN] → nftables → [Lora LAN] → D-Link
