# Entwicklerdokumentation

## Build

```bash
dotnet restore
dotnet build src/Jellyfin.Plugin.StreamystatsIntegration/Jellyfin.Plugin.StreamystatsIntegration.csproj -c Release
dotnet test tests/plugin/Jellyfin.Plugin.StreamystatsIntegration.Tests.csproj
npm test
```

Die Jellyfin-Pakete sind exakt auf 12.0.0 gepinnt und mit `ExcludeAssets=runtime` reine Compile-Referenzen; die Hostassemblies dürfen nicht im Plugin-ZIP landen. Bei 12.x nie blind erhöhen: Release Notes und API-Diff prüfen.

## Clientadapter

Alle nicht öffentlichen Jellyfin-Web-Kopplungen liegen in `Web/integration.js`:

- Modern: `.MuiAppBar-root`, `.MuiToolbar-root`;
- Legacy: `.mainDrawer`, `.scrollContainer`, `.navMenuOption`;
- Headerhöhe: `.MuiAppBar-root`, `.skinHeader:not(.hide)`;
- Jellyfin globaler `window.ApiClient`.

Keine Streamystats-DOM-Selektoren existieren. Das ist absichtlich updatefreundlich.

## API

- `/StreamystatsIntegration/client.js`: anonym, statisches Asset, niemals Konfiguration.
- `/StreamystatsIntegration/config`: authentifiziert, erlaubter Benutzer, tokenfreie öffentliche Daten.
- `/StreamystatsIntegration/health`: authentifiziert, gecachter Serverprobe.

Die Benutzer-ID stammt aus dem Jellyfin-12-Claim `Jellyfin-UserId`; nicht aus Clientparametern.

## Release

`build.yaml` ist die einzige Versionsquelle. `bash scripts/package.sh` baut ein einfaches ZIP für eine manuelle Testinstallation. Veröffentlichte Katalogpakete werden dagegen ausschließlich durch `.github/workflows/release.yml` mit JPRM gebaut, damit `meta.json`, MD5, Zeitstempel, Download-URL und `targetAbi` nach demselben Muster wie bei etablierten Jellyfin-Plugins entstehen.

Der Release-Tag muss exakt `v` plus der Version aus `build.yaml` sein, beispielsweise `v1.0.0.0`. Der Workflow testet, baut, lädt das ZIP in das GitHub Release und ergänzt `manifest.json` auf `main`. Die vollständige Betreiberanleitung steht in [PUBLISHING.md](PUBLISHING.md).

Vor Veröffentlichung sämtliche Gates in `TEST_REPORT.md` ausführen. Zusätzlich sind SHA-256-Prüfsummen und signierte Tags empfehlenswert; Jellyfins Katalogfeld `checksum` wird von JPRM passend erzeugt.
