# Research-Bericht: Streamystats in Jellyfin 12

Stand: 14. September 2026. Referenz ist Jellyfin Server/Web **12.0.0** und Streamystats **2.18.1**. Aussagen, die nicht durch eine öffentliche API oder einen Test belegt sind, sind ausdrücklich als intern, experimentell oder ungetestet markiert.

## Executive Summary

Jellyfin 12 bietet serverseitigen Plugins weiterhin Dashboard-Konfigurationsseiten und eigene API-Endpunkte, aber keine gefundene, unterstützte API zum Registrieren einer normalen Benutzer-Route oder eines Navigationspunkts. Die neue Standardoberfläche ist die React/MUI-basierte „Modern“-Ansicht mit statisch definierten React-Router-Routen; „Legacy“ bleibt wählbar. Custom Menu Links funktionieren in 12 auch in Modern, öffnen aber weiterhin einen neuen Tab.[^jf-release][^web-routes][^menu-links]

Für die geforderte In-App-Seite ist deshalb eine kleine, zentral gekapselte Web-Injection nötig. Jellyfin Enhanced 12.6/12.7 belegt, dass eine `IStartupFilter`-Middleware unter Jellyfin 12 das ausgelieferte `index.html` zur Laufzeit erweitern kann, ohne kompilierte Webdateien zu verändern. Das ist keine öffentliche Web-Extension-API, aber die wartbarste aktuell nachgewiesene Brücke.[^enhanced-release][^startup-filter]

Streamystats 2.18.1 ist grundsätzlich als bestehendes Frontend wiederverwendbar, blockiert Frames aber absichtlich mit `X-Frame-Options: DENY`. Ein Reverse Proxy muss diesen einzelnen Header nur für Streamystats entfernen und stattdessen `Content-Security-Policy: frame-ancestors https://media.example.com` setzen. `DENY` blockiert auch Same-Origin-Framing.[^streamystats-proxy][^xfo]

Empfohlen wird `media.example.com` für Jellyfin und `stats.media.example.com` für Streamystats. Beide Origins sind getrennt, aber dieselbe Site. Das ist mit dem unveränderten Streamystats-Container robuster als `/stats/`: Streamystats hat zwar seit 2.5 Base-Path-Unterstützung, Next.js bindet `basePath` jedoch beim Build ein; ein fertiges Standard-Image lässt sich nicht zuverlässig nur per Laufzeitvariable umstellen.[^streamystats-changelog][^next-basepath]

Echtes, transparentes SSO wird in Version 1 bewusst **nicht vorgetäuscht**. Streamystats besitzt eine eigene, 30 Tage gültige HttpOnly-Session und speichert zusätzlich das Jellyfin-Benutzertoken in einem HttpOnly-Cookie. Es wurde kein öffentlicher, stabiler Token-Exchange-Endpunkt gefunden, der aus der Jellyfin-Websession sicher eine Streamystats-Session erstellt. Die sichere Standardlösung ist daher: einmalige Streamystats-Anmeldung im eingebetteten Fenster, danach Session-Wiederverwendung. Ein Proxy-Endpunkt löscht bei Erstbindung oder Jellyfin-Benutzerwechsel beide Streamystats-Cookies und bestätigt dies CORS-begrenzt, bevor das iframe geladen wird. Niemals werden Adminschlüssel, Passwörter oder Tokens in URL/DOM/Logs übertragen.[^streamystats-auth]

## Quellenmatrix

| Erkenntnis | Quelle / Datum / Version | Jellyfin-Version | Für 12 bestätigt? | Architekturfolge |
|---|---|---:|:---:|---|
| Jellyfin 12.0 erschien am 7./8.09.2026; 10.11-Plugins laden nicht; .NET 10 und Plugin-Interfaces änderten sich. | Jellyfin Release Notes, 07.09.2026[^jf-release] | 12.0 | Ja | Plugin zielt ausschließlich auf `net10.0`, ABI `12.0.0.0`, Pakete 12.0.0. |
| Legacy-Auth ist standardmäßig aus; `/emby`- und `/mediabrowser`-Aliases entfallen. | Release Notes und PR #15559, 27.11.2025[^jf-release][^legacy-auth] | 12.0 | Ja | Nur `Authorization: MediaBrowser … Token=…`; keine alten Query-Token-Muster. |
| Modern ist React/MUI, nutzt React Router und statische Routen; Dashboard, Modern, Legacy sind getrennte Apps. | jellyfin-web v12.0 Source/Contributing[^web-architecture][^web-routes] | 12.0 | Ja | Kein behauptetes Plugin-Routing; Clientadapter muss Modern und Legacy getrennt behandeln. |
| `menuLinks` sind in Modern 12 vorhanden, öffnen aber neue Tabs. | PR/Issue/Discussion zu v12[^menu-links] | 12.0 | Ja | Nur Fallback, erfüllt die In-App-Anforderung nicht. |
| `IHasWebPages`/`PluginPageInfo` liefert Dashboard-Konfigurationsseiten. | Plugin Template + aktuelle Pluginquellen[^plugin-template][^plugin-pages] | 12.0 geprüft | Ja, Dashboard | Konfiguration nativ; keine normale Nutzerseite daraus ableiten. |
| `GET /Users` und `GET /Users/Me` sind in JF12 authentifizierte Controller-Routen. | Jellyfin v12.0 `UserController.cs`[^jf-user-controller] | 12.0 | Ja | Dashboard-Benutzerauswahl und Tokenvalidierung nutzen bestätigte v12-Routen, keine 10.x-Aliases. |
| Request-time Injection ohne Dateischreibzugriff funktioniert unter JF12. | Jellyfin Enhanced 12.6/12.7 + Source[^enhanced-release][^startup-filter] | 12.0 | Ja | Gewählte, isolierte Kompatibilitätsschicht; Fehler lässt Original-HTML unverändert. |
| Aktuelle Seerr-Integrationen erzeugen In-App-Tabs ebenfalls per Injection/File Transformation; ihr Login nutzt Seerr-spezifische Benutzerverknüpfung. | Jellyfin Enhanced und Moonfin, Stand September 2026[^enhanced-seerr][^moonfin] | 10.11/12 laut Manifest bzw. Projekt | Muster für UI bestätigt; Seerr-SSO ist kein Beleg für einen Streamystats-Token-Exchange. |
| Streamystats 2.18.1 ist Next.js/React/TypeScript; Images sollen gepinnt werden. | Repository/README/Changelog[^streamystats-repo][^streamystats-changelog] | unabhängig | Ja | Frontend wiederverwenden; Image nicht auf `latest` pinnen. |
| Streamystats setzt `X-Frame-Options: DENY`. | `apps/nextjs-app/proxy.ts`[^streamystats-proxy] | Streamystats main, nach 2.18 | Ja | Nur am Stats-vHost ersetzen; enge `frame-ancestors`-Liste. |
| Streamystats validiert moderne Jellyfin-Tokens über `/Users/Me`. | `jellyfin-auth.ts`[^streamystats-jf-auth] | Kommentar: 10.12+/12 | Ja | Benutzer-Token ist technisch nutzbar; dennoch kein eigener SSO-Cookie-Forge. |
| Session/Jellyfin-Token liegen in HttpOnly-Cookies, SameSite=Lax, 30 Tage. | Streamystats Architekturhinweise im aktuellen Repo[^streamystats-auth] | Streamystats 2.x | Ja | Gleiche Site bevorzugen; sichere Einmalanmeldung bleibt erhalten. |
| Cross-site iframe-Cookies sind in Safari/anderen Browsern unzuverlässig. | MDN/WebKit, laufend gepflegt[^cookies][^webkit] | Browser | Ja | Keine fremde Domain; browserbasierter Fallback bei Cookieblockade. |
| Android und iOS Standardapps sind Web-Wrapper; Desktop nutzt Qt WebEngine; Android TV/Swiftfin sind nativ. | Offizielle Client-Repositories[^android][^ios][^desktop][^androidtv][^swiftfin] | aktuelle Clients | Ja | Volle Integration: Web/Android/iOS/Desktop; native Clients: externer Browser-Fallback. |
| Pluginmanifest nutzt `targetAbi`, `sourceUrl`, `checksum`, `timestamp`. | Offizielle Plugin-Doku und JF12-Manifest[^plugin-repo][^enhanced-manifest] | 12.0 | Ja | Repository-Manifest wird mit ABI 12 erzeugt. |
| TheIntroDB 1.1.0.1 und Custom Logo 2.0.0.2 veröffentlichen JF12-Versionen als GitHub-Release-ZIP und listen sie in einem öffentlichen `manifest.json`. | Aktuelle Projektmanifeste, geprüft 14.09.2026[^introdb-manifest][^custom-logo-manifest] | 12.0 | Ja | Dasselbe Kataloglayout: eine Plugin-ID, absteigend sortierte Versionen, `targetAbi`, `sourceUrl`, MD5 und UTC-Zeit. |
| Das offizielle Webhook-Plugin definiert für JF12 `targetAbi: 12.0.0.0`, `framework: net10.0` und eine explizite Artefaktliste in `build.yaml`. | Offizielles Jellyfin Webhook `build.yaml`, geprüft 14.09.2026[^webhook-build] | 12.0 | Ja | Buildmetadaten und erlaubte ZIP-Dateien werden zentral in `build.yaml` gepflegt. |
| JPRM kann Jellyfin-Pluginpakete bauen und Repository-Manifeste verwalten. | Jellyfin Plugin Repository Manager, geprüft 14.09.2026[^jprm] | versionsneutral; Metadaten bestimmen ABI | Ja für verwendetes Manifestformat | GitHub Actions baut mit JPRM, lädt das ZIP ins Release und ergänzt Prüfsumme/URL/Zeit automatisch statt fehleranfälliger Handarbeit. |

## Vergleich aktueller Repository-Plugins

TheIntroDB und Custom Logo lösen die Endnutzerinstallation auf dieselbe Weise: Das Projekt stellt eine Raw-HTTPS-URL zu `manifest.json` bereit; die Manifestversion verweist auf ein unveränderliches ZIP im jeweiligen GitHub Release. Beide führen ältere und Jellyfin-12-kompatible Pakete im selben Katalog, wobei Jellyfin über `targetAbi` die passende Version erkennt.[^introdb-manifest][^custom-logo-manifest]

Die Umsetzung dieses Projekts übernimmt dieses Muster, aber automatisiert die empfindlichen Felder. `build.yaml` folgt dem offiziellen Webhook-Aufbau; `.github/workflows/release.yml` prüft Versions-Tag, `.NET 10` und ABI, baut mit JPRM, kontrolliert den ZIP-Inhalt, lädt ihn zum Release und lässt JPRM `manifest.json` ergänzen. Das Root-Manifest ist vor dem ersten echten Release absichtlich `[]`: Eine erfundene Download-URL oder Prüfsumme wäre nicht installierbar und unsicher.

## Jellyfin 11 → 12: relevante Änderungen

1. **UI:** Modern ist nun Standard auf Desktop und Mobile; die alte Oberfläche bleibt „Legacy“. Der TV-Modus bleibt unverändert. CSS-Variablen für Themes werden zwischen Modern und Legacy geteilt.[^jf-release]
2. **Routing:** Modern nutzt eine statische React-Router-Liste mit `<Outlet>`; es existiert keine dokumentierte Runtime-Registry für Serverplugins.[^web-routes]
3. **Auth:** veraltete Token-Formate sind aus; die `/emby/`- und `/mediabrowser/`-Kompatibilitätsrouten entfallen. Headerbasierte MediaBrowser-Authentifizierung bleibt.[^legacy-auth]
4. **API:** mehrere Endpunkte und Modelle wurden umbenannt/entfernt; der TypeScript-SDK wurde auf OpenAPI 12 aktualisiert.[^jf-release][^sdk]
5. **Plugins:** v11-Binaries sind inkompatibel. Jellyfin 12 läuft auf .NET 10; Controller/Model-Pakete müssen 12.0.0 sein.[^jf-release][^jf-model]
6. **Navigation:** Custom Menu Links wurden für Modern ergänzt, sind aber externe Links mit neuem Tab.[^menu-links]

## Variantenanalyse

### A – iframe

Ein iframe ist für die Wiederverwendung des kompletten Streamystats-Frontends die kleinste Kopplung. Er isoliert CSS und JavaScript und übersteht Streamystats-Updates besser als DOM-Rewrites. Er benötigt aber eine erlaubende Frame-Policy. Das Attribut `sandbox` wird bewusst nicht gesetzt: Streamystats benötigt Formulare, Navigation, Cookies, Downloads und eigenes JavaScript; eine falsche Sandbox würde Auth oder Funktionen brechen. Die Sicherheit kommt aus fester, validierter URL, CSP `frame-ancestors`, HTTPS und Origin-Trennung.

Cross-Origin bedeutet: Der Parent kann weder DOM, Höhe, Loginstatus noch Fehlerstatus des Frames lesen. Die View nutzt deshalb `100dvh`, eine serverseitige Health-Prüfung und einen Timer. `load` allein beweist keine erfolgreiche App-Antwort. Theme-Synchronisation per DOM/CSS ist ebenfalls ausgeschlossen; ohne dokumentierte Streamystats-Theme-/postMessage-API wird nur `color-scheme: dark` gesetzt und Streamystats’ eigenes Theme verwendet.

### B – Reverse Proxy

Ein Proxy ist zwingend, weil die aktuelle Streamystats-Antwort `DENY` liefert. Eine Subdomain derselben registrierbaren Domain ist der beste Standard. Sie hält Origins getrennt (weniger XSS-Auswirkung) und bleibt cookie-seitig „same-site“. Eine echte gleiche Origin unter `/stats/` reduziert zwar SOP-Hürden, ist aber mit einem unveränderten veröffentlichten Next.js-Image nicht verlässlich: `basePath` ist Buildzeitkonfiguration.[^next-basepath]

CORS ist für das reine iframe nicht erforderlich. Die Konfiguration fügt daher **kein** `Access-Control-Allow-Origin: *` hinzu. WebSockets/Upgrade und die üblichen Forwarded-Header bleiben aktiv. XFO wird nur am Stats-vHost entfernt; `frame-ancestors` nennt exakt die Jellyfin-Origin.

### C – echtes Jellyfin-12-Plugin

Der Serverteil ist sinnvoll für Dashboard-Konfiguration, Zugriffskontrolle, Health-Check, Asset-Auslieferung und Installation. Nicht belegt ist eine öffentliche API für normale Nutzer-Navigation. `IHasWebPages` ist für Plugin-Konfiguration im Dashboard; Moderns Routen sind statisch. Ein ausschließlich „echtes“ Plugin ohne Clientbrücke kann daher das Ziel nicht erreichen.

### D – Web-Injection

Direktes Patchen kompilierter Dateien wird verworfen. Eine additive `IStartupFilter`-Transformation zur Requestzeit ist bei Jellyfin Enhanced für JF12 nachgewiesen, idempotent und fail-open: Bei Fehlern bleibt Jellyfin unverändert.[^startup-filter] Die Navigation/DOM-Adapter bleiben dennoch interne Abhängigkeiten. Sie werden in genau einem Modul mit Kompatibilitätsdiagnostik gekapselt und bei unbekannter Jellyfin-Hauptversion deaktiviert.

Aktuelle Seerr-Beispiele stützen diese Einschätzung: Jellyfin Enhanced und Moonfin verwenden ebenfalls injizierte Web-UIs beziehungsweise File Transformation für Tabs und Panels.[^enhanced-seerr][^moonfin] Ihre automatische Zuordnung funktioniert über Seerr-spezifische User-Linking-/Proxy-Logik. Daraus lässt sich kein sicherer Streamystats-SSO-Fluss ableiten; ein API-Key-basiertes Serverproxy-Muster würde außerdem die hier geforderte benutzerscharfe Streamystats-Oberfläche nicht automatisch autorisieren.

### E – Streamystats API + eigene UI

Streamystats besitzt interne und externe APIs, doch eine Neuentwicklung würde große Teile der Statistik-, Filter-, Visualisierungs- und Updatearbeit duplizieren. Sie erhöht Kopplung und Risiko von semantischen Abweichungen. Sie ist nur sinnvoll, wenn die Einbettung langfristig upstream-seitig verboten bleibt.

## Bewertung (1 schlecht, 10 sehr gut)

| Variante | UX | Wartbarkeit | JF12-Kompatibilität | Update-Sicherheit | Aufwand | Sicherheit |
|---|---:|---:|---:|---:|---:|---:|
| iframe allein | 7 | 8 | 4 | 8 | 8 | 5 |
| Reverse Proxy allein | 3 | 8 | 10 | 8 | 7 | 8 |
| reines Serverplugin | 4 | 9 | 9 | 9 | 7 | 9 |
| Web-Injection allein | 9 | 4 | 7 | 4 | 6 | 6 |
| eigene UI | 8 | 3 | 8 | 3 | 2 | 7 |
| **gewählter Verbund: Plugin + schmale Injection + Proxy + iframe** | **9** | **7** | **8** | **7** | **6** | **8** |

Die Einzelvarianten erfüllen jeweils nicht alle Ziele. Der Verbund nutzt das Serverplugin für stabile Teile und begrenzt die fragile Schicht auf Navigation/View-Mounting. Der Aufwand-Score bewertet „wenig Aufwand“ mit hoher Punktzahl.

- **iframe:** gute nahtlose UX und geringe Streamystats-Kopplung; allein fehlen JF12-Navigation, Headerfreigabe und verlässliche Cross-Origin-Fehler-/Identitätskontrolle. Deshalb hohe Wartbarkeit/Updatesicherheit, aber nur 4 für JF12-Vollintegration und 5 für Sicherheit ohne Zusatzmaßnahmen.
- **Reverse Proxy:** löst Frame-, TLS- und Same-Site-Fragen robust und sicher, erzeugt allein jedoch weder Menü noch In-App-View. Darum 10 für JF12-Neutralität, 8 für Wartung/Sicherheit, aber 3 für UX.
- **reines Plugin:** Dashboard, API und Zugriff sind sauber und updatefest; mangels unterstützter Nutzer-Route bleibt die Ziel-UX unerreichbar. Daher 9 bei Kompatibilität/Wartung/Sicherheit, 4 bei UX.
- **Web-Injection:** erreicht die beste native UX, hängt jedoch an internen Modern-/Legacy-DOM-Strukturen. Das erklärt 9 UX, aber nur 4 Wartbarkeit/Updatesicherheit und 6 Sicherheit.
- **eigene UI:** könnte UX und Autorisierung vollständig kontrollieren, dupliziert aber Streamystats und dessen sich ändernde Datenmodelle/APIs. Daher hoher Implementierungsaufwand (Score 2) und geringe Wartungs-/Updatesicherheit (3).
- **Verbund:** Plugin und Proxy tragen Auth, Konfiguration und Header; die Injection tut nur Navigation/Mounting, der iframe hält Streamystats isoliert. So werden die jeweiligen Schwächen begrenzt, ohne sie zu verschweigen.

## Authentifizierung und Benutzertrennung

### Bestätigter Bestand

Streamystats meldet Benutzer mit deren eigenen Jellyfin-Zugangsdaten an, validiert Tokens über `/Users/Me` und bindet die Streamystats-Session an `id`, `name`, `serverId` und `isAdmin`.[^streamystats-auth][^streamystats-jf-auth] Das sorgt bei korrekten Streamystats-Endpunkten für A→A/B→B. Release 2.18 nennt außerdem die Durchsetzung von Jellyfin-Bibliotheksrechten für Nicht-Admins.[^streamystats-release]

### Entscheidung für v1

- Kein Admin-Token und kein globaler API-Key im Browser.
- Kein Passwort-Autofill, keine URL-Tokens, keine vom Plugin selbst signierten Streamystats-Cookies.
- Benutzer melden sich einmal direkt in der eingebetteten Streamystats-Seite an. Das HttpOnly-Cookie wird anschließend wiederverwendet.
- Beim ersten Öffnen und bei einer geänderten Jellyfin-Benutzer-ID muss `POST /__jellyfin_integration_reset` beide Streamystats-Cookies löschen. Ohne bestätigten Marker lädt der Client fail-closed kein iframe.
- Stats-URL muss HTTPS und fest konfiguriert sein; die Clientseite akzeptiert keine URL-Parameter.
- Plugin-Sichtbarkeit ist Komfort/Zugangssteuerung, **keine** Ersatz-Autorisierung. Streamystats muss weiterhin Auth erzwingen.

Ein zukünftiges „echtes SSO“ ist nur akzeptabel, wenn Streamystats selbst einen dokumentierten Token-Exchange implementiert: Parent sendet das aktuelle **Benutzertoken** einmal per HTTPS-POST im Authorization-Header; Streamystats validiert `/Users/Me`, prüft `serverId`, setzt seine eigenen HttpOnly-Cookies und verwirft den Requestbody. Bis dahin bleibt der sichere Einmallogin die Produktionsvorgabe.

## Risiken und offene Grenzen

- Die Injection ist nicht öffentliche Jellyfin-Web-API. Ein 12.x-Webupdate kann Selektoren oder Mountpunkte ändern.
- Cross-Origin-iframe kann keine rohe 502-Seite zuverlässig erkennen; der Plugin-Healthcheck reduziert, beseitigt aber nicht jedes Zwischenproxy-Fehlerbild.
- Streamystats’ Sessionablauf führt zum eingebetteten Login. Das ist beabsichtigt sicher.
- Native TV-/Swiftfin-/Roku-Clients laden das injizierte Jellyfin Web nicht oder bieten keine passende Navigation. Dort gibt es keinen falschen Menüpunkt; der dokumentierte Fallback ist die Browser-URL.
- Streamystats ist ein schnell entwickeltes Projekt. Produktiv muss eine getestete Versionsnummer statt `latest` verwendet werden.

## Quellen

[^jf-release]: Jellyfin, „Jellyfin 12.0“, 7. September 2026, https://jellyfin.org/posts/jellyfin-release-12.0/
[^legacy-auth]: Jellyfin PR #15559, „Disable legacy authorization by default“, merged 27. November 2025, https://github.com/jellyfin/jellyfin/pull/15559
[^web-architecture]: jellyfin-web v12.0, CONTRIBUTING/Architektur, https://github.com/jellyfin/jellyfin-web/tree/v12.0/src/apps
[^web-routes]: jellyfin-web v12.0, Modern routes, https://github.com/jellyfin/jellyfin-web/blob/v12.0/src/apps/modern/routes/routes.tsx
[^menu-links]: Jellyfin Discussion #17213 und jellyfin-web Issue #8256/PR #7394, Juli/August 2026, https://github.com/orgs/jellyfin/discussions/17213
[^sdk]: Jellyfin TypeScript SDK Changelog, OpenAPI 12, https://github.com/jellyfin/jellyfin-sdk-typescript/blob/master/CHANGELOG.md
[^jf-model]: Jellyfin.Model 12.0.0 / net10.0, https://github.com/jellyfin/jellyfin/blob/v12.0/Jellyfin.Model/Jellyfin.Model.csproj
[^plugin-template]: Offizielles Jellyfin Plugin Template, https://github.com/jellyfin/jellyfin-plugin-template
[^plugin-pages]: Aktuelles Chapter Segments Plugin (`IHasWebPages`), https://github.com/jellyfin/jellyfin-plugin-chapter-segments
[^jf-user-controller]: Jellyfin v12.0, `Jellyfin.Api/Controllers/UserController.cs`, Routen `GET /Users` und `GET /Users/Me`, https://github.com/jellyfin/jellyfin/blob/v12.0/Jellyfin.Api/Controllers/UserController.cs
[^enhanced-release]: Jellyfin Enhanced 12.6.0.0/12.7.0.0 Releases, 8./11. September 2026, https://github.com/n00bcodr/Jellyfin-Enhanced/releases
[^startup-filter]: Jellyfin Enhanced, `ScriptInjectionStartupFilter.cs`, aktueller JF12-Quellcode, https://raw.githubusercontent.com/n00bcodr/Jellyfin-Enhanced/main/Jellyfin.Plugin.JellyfinEnhanced/Services/ScriptInjectionStartupFilter.cs
[^enhanced-seerr]: Jellyfin Enhanced, aktueller Quellcode/README mit Seerr Integration und JF12-kompatiblem Manifest, https://github.com/n00bcodr/Jellyfin-Enhanced
[^moonfin]: Moonfin Plugin, aktuelle Architektur mit File Transformation und eingebettetem Seerr-Panel, https://github.com/enyineer/moonfin-plugin
[^enhanced-manifest]: Jellyfin Enhanced JF12 Pluginmanifest, https://github.com/n00bcodr/Jellyfin-Enhanced/blob/main/manifest.json
[^streamystats-repo]: Streamystats Repository/README, https://github.com/fredrikburmester/streamystats
[^streamystats-changelog]: Streamystats Changelog 2.5.0–2.18.1, zuletzt 10. Juni 2026, https://github.com/fredrikburmester/streamystats/blob/main/CHANGELOG.md
[^streamystats-release]: Streamystats Releases, 2.18, https://github.com/fredrikburmester/streamystats/releases
[^streamystats-proxy]: Streamystats, `apps/nextjs-app/proxy.ts`, Security Headers, https://github.com/fredrikburmester/streamystats/blob/main/apps/nextjs-app/proxy.ts
[^streamystats-jf-auth]: Streamystats, `jellyfin-auth.ts`, https://github.com/fredrikburmester/streamystats/blob/main/apps/nextjs-app/lib/jellyfin-auth.ts
[^streamystats-auth]: Streamystats aktuelle Architektur-/Authentifizierungsdokumentation, https://github.com/fredrikburmester/streamystats/blob/main/CLAUDE.md
[^next-basepath]: Next.js, `basePath` (Buildzeit), https://nextjs.org/docs/pages/api-reference/config/next-config-js/basePath
[^xfo]: MDN, `X-Frame-Options`, laufend gepflegt, https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options
[^cookies]: MDN, Third-party cookies / SameSite, laufend gepflegt, https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/Third-party_cookies
[^webkit]: WebKit, Full Third-Party Cookie Blocking / Storage Access API, https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/
[^android]: Jellyfin Android (Web-Wrapper), https://github.com/jellyfin/jellyfin-android
[^ios]: Jellyfin iOS (Web-Wrapper), https://github.com/jellyfin/jellyfin-ios
[^desktop]: Jellyfin Desktop (Qt WebEngine), https://github.com/jellyfin/jellyfin-desktop
[^androidtv]: Jellyfin Android TV (native), https://github.com/jellyfin/jellyfin-androidtv
[^swiftfin]: Swiftfin (native Swift), https://github.com/jellyfin/Swiftfin
[^plugin-repo]: Jellyfin Plugin-Repositories, https://jellyfin.org/docs/general/server/plugins/
[^introdb-manifest]: TheIntroDB Pluginmanifest, Version 1.1.0.1 für Jellyfin 12, https://raw.githubusercontent.com/TheIntroDB/jellyfin-plugin/main/manifest.json
[^custom-logo-manifest]: Custom Logo Pluginmanifest, Version 2.0.0.2 für Jellyfin 12, https://raw.githubusercontent.com/WimWamWom/jellyfin-plugin-custom-logo/main/manifest.json
[^webhook-build]: Offizielles Jellyfin Webhook `build.yaml`, JF12/`net10.0`, https://raw.githubusercontent.com/jellyfin/jellyfin-plugin-webhook/master/build.yaml
[^jprm]: Jellyfin Plugin Repository Manager, https://github.com/oddstr13/jellyfin-plugin-repository-manager
