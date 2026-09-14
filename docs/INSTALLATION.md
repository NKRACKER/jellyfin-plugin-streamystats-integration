# Installation für Jellyfin 12

## Voraussetzungen

- Jellyfin Server **12.0.x** mit zugehörigem jellyfin-web 12;
- Streamystats **2.18.1** oder eine separat getestete neuere 2.x-Version;
- HTTPS-DNS-Namen wie `media.example.com` und `stats.media.example.com`;
- .NET 10 SDK zum Bauen.

Vor einem Jellyfin-Upgrade die komplette Jellyfin-Datenbank/-Konfiguration sichern. Jellyfin 12 migriert Datenbanken und Jellyfin empfiehlt, externe Plugins beim Upgrade zunächst zu entfernen.

## Empfohlen: aus dem Jellyfin-Katalog

Der Herausgeber stellt eine Manifest-URL in dieser Form bereit:

```text
https://raw.githubusercontent.com/OWNER/REPOSITORY/main/manifest.json
```

Dabei müssen `OWNER` und `REPOSITORY` dem tatsächlich veröffentlichten Projekt entsprechen. Eine URL mit diesen Platzhaltern funktioniert nicht.

1. Als Administrator Jellyfin 12 öffnen.
2. Dashboard → Plugins → Repositories öffnen.
3. `+` wählen, als Namen beispielsweise `Streamystats Integration` eintragen und die Manifest-URL einfügen.
4. Speichern und Dashboard → Plugins → Katalog öffnen.
5. `Streamystats Integration` auswählen und installieren.
6. Jellyfin vollständig neu starten. Ein Neuladen des Browser-Tabs allein reicht nicht.
7. Dashboard → Plugins → Meine Plugins → Streamystats Integration öffnen.
8. Der eingebauten, nummerierten Einrichtung folgen.

Für ein Update erneut den Katalog öffnen, das angebotene Update installieren und Jellyfin neu starten. Das Plugin verändert keine kompilierten Jellyfin-Web-Dateien; nach einem Update ist deshalb kein Patch erneut anzuwenden.

Erscheint das Plugin nicht im Katalog, zuerst prüfen, ob die Manifest-URL im Browser ohne Anmeldung JSON liefert. Ein leeres `[]` bedeutet, dass der Herausgeber noch kein Release veröffentlicht hat. Außerdem muss die gewünschte Version im Manifest `"targetAbi": "12.0.0.0"` tragen.

## Alternative: aus dem Quellcode

Repository herunterladen und in dessen Hauptverzeichnis wechseln. Danach:

```bash
dotnet test tests/plugin/Jellyfin.Plugin.StreamystatsIntegration.Tests.csproj
npm test
bash scripts/package.sh
```

Das Archiv liegt danach unter `artifacts/Jellyfin.Plugin.StreamystatsIntegration_<Pluginversion>.zip`.

### Manuell

1. Jellyfin stoppen.
2. Unter Jellyfins Pluginverzeichnis einen Ordner `Streamystats Integration_1.0.0.0` anlegen.
3. Das ZIP dort entpacken. Die DLL muss direkt in diesem Ordner liegen, nicht in einem weiteren Unterordner.
4. Sicherstellen, dass der Jellyfin-Prozess die Datei lesen kann.
5. Jellyfin starten und im Log nach `Streamystats Integration` suchen.
6. Dashboard → Plugins → Streamystats Integration öffnen.

Übliche persistente Pluginverzeichnisse:

| Installation | Pluginverzeichnis |
|---|---|
| offizieller Jellyfin-Docker-Container | `/config/plugins` im persistenten Config-Volume |
| Debian/Ubuntu-Paket | `/var/lib/jellyfin/plugins` |
| Windows | `%ProgramData%\Jellyfin\Server\plugins` |

Beispiel für Docker mit einem Host-Verzeichnis `/srv/jellyfin/config`:

```bash
mkdir -p '/srv/jellyfin/config/plugins/Streamystats Integration_1.0.0.0'
unzip artifacts/Jellyfin.Plugin.StreamystatsIntegration_1.0.0.0.zip \
  -d '/srv/jellyfin/config/plugins/Streamystats Integration_1.0.0.0'
docker restart jellyfin
```

Pfade und Containername an die eigene Installation anpassen. Nicht in die nicht persistente Container-Layer kopieren.

## Einrichtung im Jellyfin Dashboard

Die Pluginseite enthält die vollständige Einrichtungshilfe:

1. Sie prüft, ob Jellyfin 12 erkannt wird.
2. Öffentliche Streamystats-URL eintragen.
3. Nginx, Nginx Proxy Manager, Caddy oder Traefik wählen.
4. Erzeugte Proxy-Konfiguration kopieren und am Streamystats-vHost anwenden.
5. Zugriff für alle oder ausgewählte Jellyfin-Benutzer festlegen.
6. Speichern und „Gespeicherte Verbindung prüfen“ anklicken.
7. Jellyfin Web hart neu laden und „Statistiken“ öffnen.
8. Beim ersten Öffnen einmal mit dem eigenen Jellyfin-Benutzer in Streamystats anmelden.

Der Health-Test bestätigt die Erreichbarkeit vom Jellyfin-Server. Die Frame-Header anschließend zusätzlich mit `tests/security/proxy_headers.sh` oder Browser-DevTools prüfen.

## Eigenes öffentliches Plugin-Repository

Ein Dashboard-Repository benötigt ein öffentlich per HTTPS abrufbares Manifest und Release-ZIP. Dieses Projekt enthält dafür bereits [`build.yaml`](../build.yaml), [`manifest.json`](../manifest.json) und den JPRM-Release-Workflow [`.github/workflows/release.yml`](../.github/workflows/release.yml).

Checksumme, UTC-Zeit, `sourceUrl` und Manifestversion werden nicht von Hand gepflegt. JPRM liest die Release-Metadaten, baut das ZIP und ergänzt das Manifest automatisch. Siehe [PUBLISHING.md](PUBLISHING.md) für den einmaligen GitHub-Aufbau und jeden weiteren Release.

`targetAbi` muss `12.0.0.0` bleiben. Keine 10.11-Binary als JF12-Release veröffentlichen.

## Deinstallation

Plugin im Dashboard deinstallieren und Jellyfin neu starten. Da keine Webdatei verändert wurde, ist kein `index.html` zu reparieren. Browsercache einmal hart aktualisieren, falls das alte Script noch im geladenen Tab lebt.
