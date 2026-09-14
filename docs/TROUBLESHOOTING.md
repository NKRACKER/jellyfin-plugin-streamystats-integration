# Troubleshooting

## „Streamystats refused to connect“ / X-Frame-Options

`curl -I` auf die Stats-URL. `X-Frame-Options: DENY` muss am Stats-Proxy fehlen. Die CSP muss `frame-ancestors 'self' https://<jellyfin-host>` enthalten. Regeln nicht am falschen vHost einfügen.

## iframe bleibt weiß

Browser-DevTools → Console/Network öffnen. Häufig: widersprüchliche zweite CSP, TLS-Zertifikatsfehler, Proxy liefert HTML-Login/502, JavaScriptfehler oder Streamystats lädt Assets von einem falschen Base Path. Die empfohlene Subdomain statt `/stats/` verwenden.

## Streamystats verlangt erneut Login

Das ist bei erster/abgelaufener Session und nach einem Jellyfin-Benutzerwechsel erwartbar. Jellyfin und Stats müssen dieselbe Site (`media.example.com` / `stats.media.example.com`) und HTTPS nutzen. Private-/Inkognito-Modus oder WKWebView kann Cookies strenger behandeln. Kein SameSite-Hack und keine Auth-Deaktivierung verwenden.

## Fehler direkt nach „Statistiken“ / Session-Reset fehlt

In Network nach `__jellyfin_integration_reset` suchen. Erwartet sind 204, `X-SSI-Session-Reset: 1`, exaktes `Access-Control-Allow-Origin` und Credentials. Bei CORS-Fehler die Jellyfin-Origin inklusive Scheme/Port in der Proxyvorlage korrigieren. Ein Wildcard-Origin ist mit Credentials verboten und wird nicht verwendet.

## Cookies funktionieren nicht

In DevTools Application/Storage prüfen, ob `streamystats-session`/Token-Cookies für die Stats-Origin existieren und `Secure`, `HttpOnly`, passenden Path und SameSite besitzen. Uhrzeit, HTTPS und stabile `SESSION_SECRET`/`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` prüfen.

## CSP-Fehler

Die Fehlermeldung nennt die blockierende Direktive. `frame-ancestors` gehört in die **Streamystats-Antwort**; `frame-src` ggf. in eine eigene globale CSP der **Jellyfin-Antwort**. Keine Wildcards. Mehrere CSP-Header werden gemeinsam restriktiv angewandt.

## Menüpunkt erscheint nicht

1. Jellyfin exakt 12.0.x und Webclient passend?
2. Plugin nach Installation neu gestartet?
3. Aktiv, URL gespeichert, Benutzer erlaubt?
4. `GET /StreamystatsIntegration/config` im Network-Tab: 200, nicht 401/403/409?
5. Console nach `[Streamystats Integration]` filtern.
6. Cache/App vollständig schließen.

## Mobile Darstellung fehlerhaft

Viewport-Meta der Jellyfin-Seite, Browserzoom und Safe Areas prüfen. Bei iOS die offizielle Web-Wrapper-App und Safari getrennt testen. Screenshots in Portrait und Landscape mit sichtbarer/verborgener Browserleiste erfassen.

## 401 / 403

401: Jellyfin-Session abgelaufen oder Client sendet den API-Header nicht. Neu anmelden. 403: Nutzer fehlt in der Allowlist oder Plugin ist aus. Keine alte `X-Emby-Token`-/Query-Token-Lösung ergänzen.

## Nach Jellyfin-Update kaputt

Zuerst auf letzte bekannte JF12-Punktversion zurück oder Plugin deaktivieren. Prüfen: Script genau einmal in `/web/index.html`, Config-Endpunkt, dann Modern-/Legacy-Selektoren. Siehe [Update](UPDATE.md). Keine kompilierten Dateien patchen.

## Streamystats offline/langsam

Der Healthcheck zeigt den freundlichen Fehler nach dem eingestellten Timeout. Interne Health-URL aus dem Jellyfin-Container testen. DNS und Docker-Netzwerk prüfen. Der Retry erzeugt einen neuen iframe.
