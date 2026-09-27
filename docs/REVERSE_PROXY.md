# Reverse Proxy

## Empfohlenes DNS-Modell

- `https://media.example.com` → Jellyfin 12
- `https://stats.media.example.com` → Streamystats

Ersetze diese Hosts in **jeder** Konfigurationsdatei. Beide müssen per HTTPS erreichbar sein. Die Stats-Origin bleibt getrennt, ist aber same-site zu Jellyfin.

## Ohne Proxy-Regel

Ohne jede Anpassung funktioniert das Plugin bereits: „Statistiken“ im Benutzermenü öffnet Streamystats in einem neuen Tab. Die Regel unten ist nur für die **eingebettete** Ansicht nötig.

## Header-Regel für die eingebettete Ansicht

```http
Content-Security-Policy: frame-ancestors 'self' https://media.example.com
```

Zusätzlich muss Streamystats' `X-Frame-Options: DENY` am Stats-Host entfernt werden. Mehr braucht es nicht, einen Reset-Endpunkt oder CORS gibt es nicht mehr.

Das Plugin prüft diese Header serverseitig (Healthcheck gegen die öffentliche URL) und bettet nur ein, wenn

1. Streamystats das Einbetten erlaubt (kein XFO bzw. `frame-ancestors` nennt die aufrufende Jellyfin-Adresse) **und**
2. Jellyfin und Streamystats dieselbe Site und dasselbe Schema nutzen (z. B. `https://media.example.com` + `https://stats.example.com`). Sonst würde der Browser die `SameSite=Lax`-Anmeldecookies von Streamystats im iframe verwerfen.

In allen anderen Fällen (z. B. Jellyfin per LAN-IP oder HTTP aufgerufen) öffnet sich automatisch ein neuer Tab.

## Varianten

- Nginx: [`deploy/nginx/jellyfin-streamystats.conf`](../deploy/nginx/jellyfin-streamystats.conf)
- Nginx Proxy Manager: [`deploy/nginx-proxy-manager/advanced.conf`](../deploy/nginx-proxy-manager/advanced.conf)
- Cloudflare (Tunnel oder Proxy): Rules → Transform Rules → *Modify Response Header* für den Stats-Hostnamen: `X-Frame-Options` entfernen, `Content-Security-Policy` statisch auf `frame-ancestors 'self' https://media.example.com` setzen.
- Caddy: [`deploy/caddy/Caddyfile`](../deploy/caddy/Caddyfile)
- Traefik/Docker labels: [`deploy/traefik/docker-compose.labels.yml`](../deploy/traefik/docker-compose.labels.yml)

Forwarded-Header dürfen nur vom eigenen Proxy vertraut werden. Die Backends sollten nicht zusätzlich direkt aus dem Internet erreichbar sein. WebSockets/HTTP-Upgrades werden in Nginx explizit weitergereicht; Caddy und Traefik behandeln sie im Reverse Proxy automatisch.

## Prüfung

```bash
curl -fsSI https://stats.media.example.com/ | tr -d '\r' \
  | grep -Ei '^(x-frame-options|content-security-policy|set-cookie):'
```

Erwartet: keine XFO-Zeile, CSP mit exakt der Jellyfin-Origin. Danach in Browser-DevTools unter Network das **Dokument im iframe** prüfen, nicht nur eine API-Antwort.


## Warum nicht `/stats/`?

Streamystats unterstützt Base Paths seit 2.5, aber Next.js’ `basePath` wird in den Build eingebettet. Der unveränderte GHCR-Build ist daher nicht zuverlässig durch eine reine Proxy-Umschreibung unter `/stats/` zu betreiben. Wer zwingend dieselbe Origin braucht, muss ein Streamystats-Image mit festem `/stats`-Base-Path bauen und bei jedem Update separat testen. Das ist keine Standardinstallation dieses Projekts.

## Quellen

Nginx Proxy Module: https://nginx.org/en/docs/http/ngx_http_proxy_module.html  
Caddy `reverse_proxy`: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy  
Traefik Headers Middleware: https://doc.traefik.io/traefik/v3.4/middlewares/http/headers/  
MDN X-Frame-Options: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options
