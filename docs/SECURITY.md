# Security- und Auth-Konzept

## Bedrohungsmodell

Geschützt werden Jellyfin-Tokens, Streamystats-Sessions, Statistiken anderer Benutzer und die Jellyfin-Oberfläche. Angreifer können ein normaler Jellyfin-Benutzer, eine fremde Website (Clickjacking), ein manipuliertes URL-Feld oder ein kompromittierter Stats-Upstream sein.

## Regeln

1. Nur absolute `https://`-URLs; HTTP ist ausschließlich für expliziten Loopback-Entwicklungsbetrieb zulässig.
2. Konfiguration wird nur Administratoren schreibbar angeboten. Normale Benutzer erhalten nur Name, URL, Fallback und Status.
3. Benutzer-Allowlist steuert Menü-Sichtbarkeit. Streamystats selbst bleibt für Daten autoritativ.
4. Keine Admin-API-Keys, Passwörter, Streamystats-Internalschlüssel oder Sessiontokens im Clientcode, LocalStorage, Querystring oder Log.
5. Der iframe erhält eine konstante, serverseitig konfigurierte URL. Kein Open Redirect und keine per Query überschreibbare URL.
6. Proxy: `X-Frame-Options` nur am Stats-vHost entfernen; `frame-ancestors` exakt auf Jellyfin-Origin begrenzen. Kein Wildcard-CORS.
7. HTTPS, `Secure`, `HttpOnly` und Streamystats’ `SameSite=Lax` bleiben erhalten. Die Hosts müssen dieselbe registrierbare Domain besitzen.
8. Kein selbst gebautes SSO, solange Streamystats keinen stabilen Token-Exchange anbietet.
9. Das iframe lädt bei Erstbindung/Userwechsel erst nach erfolgreichem Reset beider bekannten Streamystats-Auth-Cookies. Der Reset-Endpunkt akzeptiert keine Parameter, gibt keine Daten zurück und erlaubt CORS nur der exakten Jellyfin-Origin.

## Benutzer A gegen Benutzer B

Der Integrationsteil übermittelt keinerlei Zielbenutzer-ID an Streamystats. Der eingeloggte Streamystats-Benutzer ergibt sich ausschließlich aus dessen HttpOnly-Session, die Streamystats nach eigener Jellyfin-Authentifizierung erstellt. Eine lokale, nicht geheime Bindung `Stats-Origin → Jellyfin-User-ID` löst bei fehlender/geänderter ID einen Cookie-Reset auf der Stats-Origin aus. Ohne Status 2xx und `X-SSI-Session-Reset: 1` wird nichts eingebettet. Testpflicht:

- getrennte Browserkontexte für A und B;
- `/Users/Me` in Streamystats muss zur erwarteten Jellyfin-ID gehören;
- A darf keine B-Historie, Watchlist oder nicht freigegebene Bibliothek sehen;
- Logout/Userwechsel in Jellyfin entfernt die View, lädt Zugriff neu und löscht vor dem nächsten Öffnen die frühere Streamystats-Session;
- geleerter Jellyfin-LocalStorage bei fortbestehenden Stats-Cookies führt ebenfalls zum Reset (fehlende Bindung ist Reset, nicht Vertrauen).

## CSRF, CORS und CSP

- Plugin-GET-Endpunkte sind read-only und benötigen Jellyfin-Authentifizierung. Konfiguration wird über die normale Jellyfin-Dashboard-Pluginseite gespeichert.
- Der einzige Cross-Origin-Fetch geht credentialed an den parameterlosen Reset-Pfad. Nur dort gelten exakter `Access-Control-Allow-Origin`, Credentials und ein exponierter Bestätigungsheader. Die übrige Stats-App erhält kein CORS.
- `frame-src` muss in Jellyfins eigener CSP nur ergänzt werden, falls eine vorgeschaltete globale CSP Frames standardmäßig blockiert. Jellyfin selbst darf nicht pauschal gelockert werden.
- Streamystats’ Antwort erhält `frame-ancestors 'self' https://media.example.com`. Existierende CSP muss ersetzt oder korrekt zusammengeführt werden; zwei widersprüchliche CSP-Header werden gemeinsam restriktiv ausgewertet.

## Security Review Checkliste

- [ ] `curl -I https://stats.media.example.com` enthält kein `X-Frame-Options: DENY`.
- [ ] Genau eine CSP erlaubt ausschließlich die Jellyfin-Origin als Ancestor.
- [ ] Direkter Streamystats-Aufruf fordert Authentifizierung.
- [ ] Browser-Netzwerklog enthält keine Tokens in URLs.
- [ ] Pluginlog enthält keine Header/Cookies/Passwörter.
- [ ] A/B-Isolation mit zwei echten Nicht-Admin-Konten bestanden.
- [ ] Nicht erlaubter Benutzer erhält 403 und keinen Menüpunkt.
- [ ] Externe Origin kann Streamystats nicht framen.
- [ ] Erstöffnung/Userwechsel ruft Reset auf; ohne Marker bleibt die View im Fehlerzustand.
- [ ] Sessionablauf zeigt Login statt fremder Daten.
- [ ] URL-Validierung blockiert `javascript:`, `data:`, Userinfo und unsicheres HTTP.
