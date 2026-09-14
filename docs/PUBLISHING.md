# Plugin-Repository veröffentlichen

Diese Anleitung richtet sich an den Herausgeber oder Betreiber eines Forks. Endnutzer brauchen nur die fertige Manifest-URL aus dem Abschnitt „Installation für Endnutzer“.

## Was bereits vorbereitet ist

Das Projekt verwendet dasselbe Grundmuster wie aktuelle Jellyfin-Plugins:

- `build.yaml` enthält Plugin-ID, Version, Jellyfin-ABI, Framework, Artefakte und Changelog.
- `manifest.json` ist der öffentliche Jellyfin-Katalog. Vor dem ersten Release ist es absichtlich ein leeres JSON-Array.
- `.github/workflows/release.yml` testet das Projekt und ruft Jellyfin Plugin Repository Manager (JPRM) auf.
- Das erzeugte ZIP wird an ein GitHub Release angehängt.
- JPRM berechnet die Prüfsumme und ergänzt `sourceUrl`, `timestamp`, Version und `targetAbi` automatisch im Manifest.

Es müssen daher keine MD5-Werte oder Download-URLs von Hand kopiert werden.

## Einmalig einrichten

1. Ein öffentliches GitHub-Repository erstellen, zum Beispiel `meinname/jellyfin-plugin-streamystats-integration`.
2. Den vollständigen Projektinhalt auf den Branch `main` pushen. `manifest.json` muss dabei zunächst `[]` enthalten.
3. In GitHub Settings → Actions → General → Workflow permissions die Berechtigung **Read and write permissions** aktivieren. Der Workflow muss das Release hochladen und `manifest.json` nach `main` committen dürfen.
4. Falls `main` geschützt ist, GitHub Actions das Aktualisieren von `manifest.json` erlauben. Alternativ den Manifest-Commit nach einem Workflowlauf als Pull Request übernehmen.
5. In `build.yaml` darf `owner: "REPLACE_WITH_GITHUB_OWNER"` stehen bleiben: Der Workflow ersetzt den Wert im Release-Build durch den wirklichen GitHub-Owner. Wer lokal mit JPRM veröffentlicht, trägt dort vorher den eigenen Namen ein.

## Erstes und jedes weitere Release

1. Version und Changelog in `build.yaml` aktualisieren. Jellyfin-Pluginversionen verwenden vier Zahlen, zum Beispiel `1.0.1.0`.
2. Änderungen nach `main` pushen und den CI-Lauf abwarten.
3. In GitHub ein Release mit dem Tag `v` plus exakt dieser Version veröffentlichen, also zum Beispiel `v1.0.1.0`.
4. Der Workflow `release-plugin-repository` führt Node- und .NET-Tests aus, prüft `.NET 10` und `targetAbi 12.0.0.0`, baut über JPRM genau ein ZIP und lädt es in das Release.
5. Anschließend ergänzt er `manifest.json` auf `main`. Den erfolgreichen Workflow und den neuen Manifest-Eintrag kontrollieren.

Wurde ein Release bereits angelegt, kann der Workflow unter Actions → `release-plugin-repository` mit dem vorhandenen Tag manuell gestartet werden.

## Installation für Endnutzer

Die endgültige Repository-URL lautet:

```text
https://raw.githubusercontent.com/OWNER/REPOSITORY/main/manifest.json
```

Beispiel: Für `meinname/jellyfin-plugin-streamystats-integration` ist es:

```text
https://raw.githubusercontent.com/meinname/jellyfin-plugin-streamystats-integration/main/manifest.json
```

Diese eine URL öffentlich in README und Release Notes nennen. Endnutzer öffnen Jellyfin 12 → Dashboard → Plugins → Repositories → `+`, tragen Name und URL ein, öffnen den Katalog, installieren das Plugin und starten Jellyfin neu.

## Prüfungen vor Veröffentlichung

```bash
npm test
dotnet test Jellyfin.Plugin.StreamystatsIntegration.sln --configuration Release
```

Zusätzlich vor Version 1.0 die reale Testmatrix in [TEST_REPORT.md](TEST_REPORT.md) vollständig abnehmen. Besonders wichtig sind zwei verschiedene Nicht-Admin-Benutzer, Sessionwechsel, Desktop/Mobil und die Proxy-Header.

Nach dem Workflow:

1. `manifest.json` direkt über die Raw-GitHub-URL öffnen und als JSON prüfen.
2. Sicherstellen, dass `targetAbi` exakt `12.0.0.0` und die neue Version vorhanden ist.
3. Die `sourceUrl` aus dem Manifest ohne GitHub-Anmeldung herunterladen.
4. Prüfen, dass das ZIP `meta.json` und `Jellyfin.Plugin.StreamystatsIntegration.dll`, aber keine `Jellyfin.Controller.dll` oder `Jellyfin.Model.dll` enthält.
5. Das Plugin über einen frischen Jellyfin-12-Testserver aus genau dieser Repository-URL installieren und nach Installation sowie Update jeweils neu starten.

## Häufige Veröffentlichungsfehler

- **Katalog ist leer:** `manifest.json` ist noch `[]` oder die Release-Aktion ist fehlgeschlagen.
- **Tag-Prüfung schlägt fehl:** Tag `v1.0.1.0` und `version: "1.0.1.0"` müssen exakt zusammenpassen.
- **Workflow darf nicht pushen:** Workflow permissions oder Branch Protection blockieren den Manifest-Commit.
- **ZIP fehlt im Release:** Der Build/Test ist fehlgeschlagen oder das Release-Tag zeigt nicht auf den Commit mit derselben `build.yaml`-Version.
- **Plugin erscheint nicht unter Jellyfin 12:** `targetAbi` prüfen und sicherstellen, dass nicht versehentlich eine Jellyfin-10/11-Binary veröffentlicht wurde.
