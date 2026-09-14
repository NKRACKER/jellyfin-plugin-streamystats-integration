# UX-Konzept

## Navigation und View

„Statistiken“ erscheint in Web-Clients für erlaubte Benutzer. Modern erhält einen Link in der primären Navigation bzw. im Überlauf; Legacy einen Drawer-Eintrag. Ein Klick erzeugt einen eigenen History-State und montiert eine View unterhalb der sichtbaren Jellyfin-Navigation. Back/Forward entfernt bzw. stellt sie wieder her.

Die View besteht aus:

- sofort sichtbarem dunklem Ladezustand „Statistiken werden geladen …“;
- rahmenlosem iframe mit `width/height: 100%`;
- Fehlerkarte „Statistiken sind momentan nicht verfügbar.“ mit „Erneut versuchen“ und „Im Browser öffnen“;
- diskretem Browser-Fallback bei nicht unterstützten eingebetteten Clients.

## Responsive Regeln

- Höhe über `100dvh` mit `100vh`-Fallback und gemessener Header-Unterkante;
- `env(safe-area-inset-*)` für iOS;
- kein Parent-Scroll während der Statistikview; iframe scrollt selbst;
- Touchziele mindestens 44 CSS-Pixel;
- Landscape aktualisiert die Höhe bei `resize`/`visualViewport.resize`;
- auf schmalen Displays stehen Fehleraktionen untereinander.

## Theme

Die Shell verwendet Jellyfin-CSS-Variablen mit neutralen Fallbacks und `color-scheme: dark`. Das iframe bleibt absichtlich unmanipuliert. Eine Theme-Synchronisation per `postMessage` wird erst aktiviert, wenn Streamystats dafür eine dokumentierte Origin-geprüfte Schnittstelle anbietet.

## Clientmatrix

| Client | Integration | Begründung/Fallback |
|---|---|---|
| Browser Desktop/Mobile | vollständig | Jellyfin Web 12 |
| Jellyfin Desktop | vollständig, Smoke-Test nötig | Qt WebEngine lädt Jellyfin Web |
| Android | vollständig, Smoke-Test nötig | offizieller Web-Wrapper |
| Jellyfin iOS/iPadOS | vollständig, Cookie-Test nötig | Web-Wrapper; WKWebView-Regeln |
| Android TV | nicht injiziert | nativer Client; Browser-URL dokumentieren |
| Swiftfin | nicht injiziert | nativer Client; Browser-URL dokumentieren |
| Roku/andere native Clients | nicht injiziert | keine kaputte Seite; externer Browser |
| webOS/Tizen | nicht zugesichert | TV-Webruntime/Remote-UX nicht Teil v1 |

