# Test-, Security- und UX-Review

Stand: 14. September 2026.

## In dieser Umgebung ausgeführt

| Prüfung | Ergebnis |
|---|---|
| JavaScript Syntax (`node --check`) | bestanden am 14.09.2026 |
| Node Client-, Secret-, Lifecycle-, Setup-UI- und Repository-Tests | 14/14 bestanden am 14.09.2026 |
| JSON-Parse, Shellsyntax | bestanden am 14.09.2026 |
| XML-Wohlform (`csproj`, `Directory.Build.props`) | bestanden am 14.09.2026 |
| Docker-Compose-Beispiel + Traefik-Compose (`docker compose config`) | bestanden am 14.09.2026 |
| Release-Workflow/JPRM-Paket | statische Verträge bestanden; echter GitHub-Release-Lauf vor Veröffentlichung erforderlich |
| Caddy/Nginx Binärvalidierung | nicht ausführbar: Binaries fehlen |
| .NET 10 Build/Tests | nicht ausführbar: .NET SDK ist in dieser Umgebung nicht installiert |
| echter Jellyfin-12-Server | nicht verfügbar; Docker-Daemon in der Arbeitsumgebung nicht zugreifbar |
| echter Streamystats-2.18.1-Server | nicht verfügbar; Docker-Daemon in der Arbeitsumgebung nicht zugreifbar |
| Browser-/Gerätetest | nicht verfügbar |

Ein nicht ausgeführter Runtime-Test wird nicht als bestanden behauptet. Öffentliche Version 1.0 darf erst nach den folgenden Gates veröffentlicht werden.

## Verbindliche Runtime-Matrix

| Bereich | Fälle | Erwartung |
|---|---|---|
| Benutzer | Admin, A normal, B normal, nicht erlaubt, ausgeloggt | korrekte Sichtbarkeit; 401/403; keine Fremddaten |
| Geräte | Chrome/Firefox/Safari Desktop, Android, iPhone, iPad | Loading/View/Scroll/Back/Login funktionieren |
| Layout | Modern + Legacy | Menü genau einmal, Navigation bleibt |
| Viewport | 320×568, 390×844, 768×1024, 1024×768, 1440×900 | keine weiße Fläche, Doppel- oder Parent-Scrollbars |
| Zustand | online, offline, 15s langsam, beide Sessions abgelaufen, beide Neustarts | verständlicher Fehler/Login/Recovery |
| History | öffnen, Back, Forward, Jellyfin-Nav | Overlay korrekt montiert/entfernt |
| Security | externe Frame-Origin, URLtoken-Suche, Cookies/CSP/CORS/CSRF | nur Jellyfin-Origin framet; keine Secrets; kein Wildcard-CORS |
| Isolation | zwei getrennte Browserprofile A/B | A sieht niemals B; Library Policy respektiert |
| Userwechsel | A öffnen, Jellyfin→B, erneut öffnen; Bindung löschen und wiederholen | Reset vor iframe; B sieht Login, nie A-Daten |

## Update-Simulation

- Jellyfin 12.0 → nächste 12.x in Staging; Shell-, Config- und DOM-Contracts.
- jellyfin-web Modern/Legacy separat.
- Streamystats 2.18.1 → Zielversion mit Datenbankkopie; Header/Auth/Session/Seiten.
- Kill-Switch: Plugin deaktivieren; Jellyfin Web muss ohne verbleibende Dateimodifikation laden.

## Manuelle UX-Abnahme

- Loading erscheint sofort und ohne weißen Flash.
- Fehlertext und Retry sind per Tastatur/Touch erreichbar.
- 44px Touchziele, Safe Areas, Portrait/Landscape, virtuelle Browserleiste.
- Jellyfin-Navigation sichtbar; Streamystats-Doppelnavigation wird nicht fragil per CSS entfernt.
- Dark Mode visuell akzeptabel; keine Cross-Origin-CSS-Manipulation.
