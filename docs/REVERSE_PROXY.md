# Reverse Proxy

## Empfohlenes DNS-Modell

- `https://media.example.com` → Jellyfin 12
- `https://stats.media.example.com` → Streamystats

Ersetze diese Hosts in **jeder** Konfigurationsdatei. Beide müssen per HTTPS erreichbar sein. Die Stats-Origin bleibt getrennt, ist aber same-site zu Jellyfin.

## Erforderliche Antwortheader

```http
Content-Security-Policy: frame-ancestors 'self' https://media.example.com
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

Die Streamystats-Antwort darf **kein** `X-Frame-Options: DENY` oder `SAMEORIGIN` enthalten, weil die Hosts unterschiedliche Origins sind. Die Beispiele entfernen XFO nur am Stats-vHost. Für die eigentliche Streamystats-Anwendung wird CORS nicht aktiviert.

Ausnahme: Nur `POST /__jellyfin_integration_reset` erhält exaktes credentialed CORS zur Jellyfin-Origin. Er löscht `streamystats-session` und `streamystats-token`, wenn ein anderer Jellyfin-Nutzer denselben Browser verwendet. Ohne diesen fail-closed Endpunkt lädt die Integration absichtlich keine Statistikdaten.

## Varianten

- Nginx: [`deploy/nginx/jellyfin-streamystats.conf`](../deploy/nginx/jellyfin-streamystats.conf)
- Nginx Proxy Manager: [`deploy/nginx-proxy-manager/advanced.conf`](../deploy/nginx-proxy-manager/advanced.conf)
- Caddy: [`deploy/caddy/Caddyfile`](../deploy/caddy/Caddyfile)
- Traefik/Docker labels: [`deploy/traefik/docker-compose.labels.yml`](../deploy/traefik/docker-compose.labels.yml)

Forwarded-Header dürfen nur vom eigenen Proxy vertraut werden. Die Backends sollten nicht zusätzlich direkt aus dem Internet erreichbar sein. WebSockets/HTTP-Upgrades werden in Nginx explizit weitergereicht; Caddy und Traefik behandeln sie im Reverse Proxy automatisch.

## Prüfung

```bash
curl -fsSI https://stats.media.example.com/ | tr -d '\r' \
  | grep -Ei '^(x-frame-options|content-security-policy|set-cookie):'
```

Erwartet: keine XFO-Zeile, CSP mit exakt der Jellyfin-Origin. Danach in Browser-DevTools unter Network das **Dokument im iframe** prüfen, nicht nur eine API-Antwort.

Reset prüfen:

```bash
curl -i -X POST -H 'Origin: https://media.example.com' \
  https://stats.media.example.com/__jellyfin_integration_reset
```

Erwartet: 204, zwei ablaufende `Set-Cookie`, `X-SSI-Session-Reset: 1` und exakt die konfigurierte Jellyfin-Origin (kein `*`).

## Warum nicht `/stats/`?

Streamystats unterstützt Base Paths seit 2.5, aber Next.js’ `basePath` wird in den Build eingebettet. Der unveränderte GHCR-Build ist daher nicht zuverlässig durch eine reine Proxy-Umschreibung unter `/stats/` zu betreiben. Wer zwingend dieselbe Origin braucht, muss ein Streamystats-Image mit festem `/stats`-Base-Path bauen und bei jedem Update separat testen. Das ist keine Standardinstallation dieses Projekts.

## Quellen

Nginx Proxy Module: https://nginx.org/en/docs/http/ngx_http_proxy_module.html  
Caddy `reverse_proxy`: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy  
Traefik Headers Middleware: https://doc.traefik.io/traefik/v3.4/middlewares/http/headers/  
MDN X-Frame-Options: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options
