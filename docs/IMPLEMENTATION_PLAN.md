# Implementierungsplan

## Repository

```text
src/Jellyfin.Plugin.StreamystatsIntegration/
  Configuration/PluginConfiguration.cs
  Controllers/IntegrationController.cs
  Services/ScriptInjectionStartupFilter.cs
  Services/StreamystatsHealthService.cs
  Web/configPage.html
  Web/integration.js
  Plugin.cs
  PluginServiceRegistrator.cs
tests/
  client/integration.test.mjs
  repository/repository.test.mjs
  security/proxy_headers.sh
  plugin/UrlPolicyTests.cs
deploy/
  nginx/, nginx-proxy-manager/, caddy/, traefik/
build.yaml
manifest.json
.github/workflows/release.yml
docs/
  RESEARCH, ARCHITECTURE, SECURITY, UX, INSTALLATION,
  CONFIGURATION, REVERSE_PROXY, TROUBLESHOOTING,
  DEVELOPMENT, UPDATE, TEST_REPORT
```

## Module und APIs

- `PluginConfiguration`: URL, Menüname, aktiv, Zugriff alle/IDs, Browser-Fallback, Health-Pfad/Timeout.
- `GET /StreamystatsIntegration/config`: Jellyfin-authentifiziert; 403 bei nicht erlaubtem Benutzer; ausschließlich öffentliche UI-Daten.
- `GET /StreamystatsIntegration/health`: Jellyfin-authentifiziert; serverseitiger, gecachter Probe mit kurzem Timeout.
- `GET /StreamystatsIntegration/client.js`: statisches eingebettetes Asset, keine Secrets.
- Dashboard-Seite: Standard-Jellyfin-Pluginformular; URL- und Zugriffskonfiguration.
- Injection-Middleware: genau ein `defer`-Script, nur Jellyfin-12-Web-Shell.
- Proxy-Reset: fester parameterloser Pfad, löscht nur `streamystats-session` und `streamystats-token`, exaktes CORS zur Jellyfin-Origin.

## Logging

Info: Pluginversion, Hostmajor, Injection einmalig, Konfigurationsänderung ohne URL-Query/Userinfo. Warning: ungültige URL, Health-Timeout, unbekannte Webstruktur. Niemals Authorization, Cookie, Passwort, Querytoken oder Antwortbody loggen.

## Update-Strategie

JF 12.x und Streamystats werden in CI als Matrix gepinnt. Der Clientadapter besitzt Selektorgruppen `modern` und `legacy` an einer Stelle. Ein Contract-Test schlägt fehl, wenn weder Mountpunkt noch Navigation erkannt werden. Ein GitHub Release mit passendem Versions-Tag baut über JPRM das ZIP und ergänzt erst danach das Jellyfin-Katalogmanifest auf `main`.
