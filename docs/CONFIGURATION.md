# Konfiguration

Dashboard → Plugins → Streamystats Integration:

Die Seite ist als nummerierter Einrichtungsassistent aufgebaut. Sie prüft die Jellyfin-Hauptversion, erzeugt die optionale Header-Regel mit der tatsächlich verwendeten Jellyfin-Origin und enthält Health-Test sowie kompakte Fehlerdiagnose direkt im Plugin.

- **Menü aktivieren:** Master-Schalter.
- **Name:** Standard „Statistiken“, maximal 40 Zeichen.
- **Öffentliche URL:** `https://stats.media.example.com`, aus Sicht des Clients erreichbar.
- **Interne Health-URL:** optional `http://streamystats:3000`; wird nie an Clients geliefert.
- **Health-Timeout:** 1–15 Sekunden, Standard 4.
- **Browser-Fallback:** zeigt die sichere externe Aktion.
- **Allen Benutzern:** bequemster Modus.
- **Ausgewählte Benutzer:** Jellyfin lädt eine anklickbare Benutzerliste, wenn „Allen“ aus ist.
- **Einbetten erlauben (optional):** erzeugt die eine Header-Regel für Nginx/NPM, Cloudflare, Caddy oder Traefik, passend zur eingetragenen Jellyfin-Adresse. Ohne Regel öffnet Streamystats in einem neuen Tab.
- **Gespeicherte Verbindung prüfen:** führt den serverseitigen, credential-freien Healthcheck aus. Administratoren können ihn auch dann ausführen, wenn sie selbst nicht für den Statistik-Menüpunkt freigeschaltet sind.

Nach dem Speichern Jellyfin Web vollständig neu laden. Bei Service-Worker-/Wrapper-Caches die App schließen und erneut öffnen.

## Streamystats

Streamystats bleibt normal eingerichtet und authentifiziert. `SESSION_SECRET` und `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` müssen stabil und geheim bleiben. Imageversion über `VERSION=2.18.1` pinnen, statt produktiv `latest` zu verwenden.

## Mehrbenutzergeräte

Jellyfin- und Streamystats-Sessions sind getrennt. Jeder Benutzer meldet sich einmal selbst in Streamystats an (30 Tage gültig). Teilen sich mehrere Jellyfin-Benutzer ein Browserprofil, sieht der nächste die Streamystats-Sitzung des vorherigen, bis dieser sich dort abmeldet; getrennte Browserprofile vermeiden das.
