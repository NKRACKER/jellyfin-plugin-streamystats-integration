# Update-Anleitung und Update Review

## Jellyfin 12.x

1. Backup und Staging-Instanz.
2. Jellyfin-/jellyfin-web-Release Notes und `src/apps/modern/routes`/Navigation vergleichen.
3. Plugin gegen die niedrigste unterstützte 12.0.0-API bauen; nur bei nötiger API-Verwendung Paketpin erhöhen.
4. Modern und Legacy Contract-Smokes durchführen.
5. 401/403, Benutzerwechsel, Back/Forward und Injection-Einmaligkeit testen.

Wahrscheinliche Bruchstellen: Web-Shell-Pfad, AppBar-/Drawer-DOM, `window.ApiClient`. Stabile Teile: ASP.NET-Header, iframe, History, Plugincontroller. Bei nicht erkanntem Layout darf der Menüpunkt fehlen, Jellyfin selbst aber nicht brechen.

## Jellyfin Web

Mit `curl https://media.example.com/web/` prüfen, dass `/StreamystatsIntegration/client.js` exakt einmal vorkommt. Danach Browser-Smokes in Modern und Legacy. Die Injection-Middleware entfernt ETag/Range nur für den Web-Shell-GET, nicht für Medien.

## Streamystats

1. Imageversion pinnen und Datenbankbackup.
2. Release Notes insbesondere Auth, Cookie, Base Path und Security Header prüfen.
3. Header-Test ausführen. Wenn Streamystats eine eigene CSP einführt, nicht automatisch überschreiben: Richtlinien bewusst zusammenführen.
4. Login, Sessionablauf, alle Statistikseiten und A/B-Isolation testen.
5. Erst danach Produktionspin ändern.

## Zukünftiges SSO

Nur nach dokumentiertem Streamystats-Token-Exchange. Er muss Benutzer-Jellyfin-Token serverseitig via `/Users/Me` prüfen, die `serverId` binden, HttpOnly-Cookies selbst setzen, CSRF/Origin prüfen und einen expliziten Logout-/Userwechsel-Handshake liefern. Ein Sidecar, der private Cookieformate nachbaut, wird nicht akzeptiert.
