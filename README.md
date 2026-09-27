# Jellyfin 12 Streamystats Integration

Eine Jellyfin-12-spezifische Integration, die Streamystats als responsive Ansicht „Statistiken“ innerhalb von Jellyfin Web öffnet.

> Status: produktionsnaher Release Candidate. Quell-/Security-/Node-Checks sind enthalten. Ein echter Jellyfin-12-/Streamystats-Browserlauf ist in dieser Arbeitsumgebung nicht möglich gewesen und bleibt vor öffentlicher Version 1.0 ein verpflichtendes Release-Gate.

## Eigenschaften

- ausschließlich Jellyfin 12: `.NET 10`, `Jellyfin.Controller/Model 12.0.0`, ABI `12.0.0.0`;
- Dashboard-Konfiguration ohne hardcodierte URL oder Credentials;
- geführte Einrichtung direkt im Plugin mit Jellyfin-12-Versionscheck, Proxy-Generator, Health-Test und Fehlerhilfe;
- Eintrag „Statistiken“ im Benutzermenü (Avatar oben rechts), bei Legacy im Seitenmenü; Browser-History/Back;
- öffnet eingebettet, wenn Streamystats das erlaubt und dieselbe Domain nutzt, sonst automatisch in einem neuen Tab;
- rahmenlose responsive View mit Loading, Healthcheck, Fehler, Retry und Browser-Fallback;
- Sichtbarkeit für alle oder ausgewählte Jellyfin-Benutzer;
- keine Änderungen an kompilierten Jellyfin-Web-Dateien;
- ohne Proxy-Anpassung nutzbar; für die Einbettung genügt eine Header-Regel (Nginx/NPM, Cloudflare, Caddy, Traefik);
- keine Admin-Tokens, Passwörter oder URL-Tokens.

## Wichtige Grenze: SSO

Streamystats bietet keinen stabilen Token-Exchange, der eine Jellyfin-Websession in eine Streamystats-Session umwandelt. Beim ersten Öffnen ist deshalb der normale Streamystats-Login nötig (danach 30 Tage gültig). Teilen sich mehrere Jellyfin-Benutzer einen Browser, sieht der nächste die Streamystats-Sitzung des vorherigen, bis dieser sich dort abmeldet. Siehe [Security](docs/SECURITY.md).

## Schnellstart

### Installation aus einem Jellyfin-Repository

Nach der ersten Veröffentlichung lautet die Katalog-URL:

```text
https://raw.githubusercontent.com/OWNER/REPOSITORY/main/manifest.json
```

`OWNER/REPOSITORY` wird beim Veröffentlichen dieses Projekts durch den tatsächlichen öffentlichen GitHub-Pfad ersetzt. Danach in Jellyfin 12:

1. Dashboard → Plugins → Repositories → `+` öffnen.
2. Einen Namen wie `Streamystats Integration` und die obige Manifest-URL eintragen.
3. Speichern, den Katalog öffnen und `Streamystats Integration` installieren.
4. Jellyfin neu starten und Dashboard → Plugins → Streamystats Integration öffnen.
5. Der dortigen nummerierten Einrichtung folgen. Die Pluginseite erzeugt die nötige Proxy-Regel, prüft Jellyfin 12 und testet Streamystats.

Eine bebilderungsfreie, vollständig klickbare Schrittfolge steht unter [Installation](docs/INSTALLATION.md). Betreiber eines Forks finden den einmaligen Veröffentlichungsablauf unter [Plugin-Repository veröffentlichen](docs/PUBLISHING.md).

## Dokumentation

- [Research](docs/RESEARCH.md)
- [Architektur](docs/ARCHITECTURE.md)
- [Security](docs/SECURITY.md)
- [UX und Clientmatrix](docs/UX.md)
- [Installation](docs/INSTALLATION.md)
- [Konfiguration](docs/CONFIGURATION.md)
- [Reverse Proxy](docs/REVERSE_PROXY.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Entwicklung](docs/DEVELOPMENT.md)
- [Plugin-Repository veröffentlichen](docs/PUBLISHING.md)
- [Update-Anleitung](docs/UPDATE.md)
- [Test-/Review-Bericht](docs/TEST_REPORT.md)

## Lizenz

MIT. Jellyfin und Streamystats sind eigenständige Projekte und Marken ihrer jeweiligen Eigentümer.
