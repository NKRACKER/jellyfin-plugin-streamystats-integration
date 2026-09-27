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
9. Eingebettet wird nur, wenn der serverseitige Header-Check und der clientseitige Same-Site-Check beide bestehen; sonst neuer Tab mit `noopener noreferrer`.

## Benutzer A gegen Benutzer B

Der Integrationsteil übermittelt keinerlei Zielbenutzer-ID an Streamystats. Der eingeloggte Streamystats-Benutzer ergibt sich ausschließlich aus dessen HttpOnly-Session, die Streamystats nach eigener Jellyfin-Authentifizierung erstellt.

**Bekannte, bewusst akzeptierte Grenze (seit 1.1):** Teilen sich zwei Jellyfin-Benutzer denselben Browser, sieht B die Streamystats-Sitzung von A, bis A sich in Streamystats abmeldet oder die Sitzung (30 Tage) abläuft. Das entspricht dem Verhalten beim direkten Aufruf von Streamystats. Der frühere Cookie-Reset-Endpunkt am Proxy wurde entfernt, weil er die Einrichtung deutlich verkomplizierte und ohne ihn nie funktionierte. Streamystats bleibt die Autorisierungsgrenze: A sieht darüber nur, was As Streamystats-Konto sehen darf.

## CSRF, CORS und CSP

- Plugin-GET-Endpunkte sind read-only und benötigen Jellyfin-Authentifizierung. Konfiguration wird über die normale Jellyfin-Dashboard-Pluginseite gespeichert.
- Der Client macht keine Cross-Origin-Fetches; Streamystats erhält kein CORS.
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
- [ ] LAN-IP/HTTP-Aufruf öffnet neuen Tab statt iframe.
- [ ] Sessionablauf zeigt Login statt fremder Daten.
- [ ] URL-Validierung blockiert `javascript:`, `data:`, Userinfo und unsicheres HTTP.
