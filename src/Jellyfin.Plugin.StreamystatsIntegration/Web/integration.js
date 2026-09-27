(() => {
  'use strict';

  if (window.__streamystatsIntegrationLoaded) return;
  window.__streamystatsIntegrationLoaded = true;

  const ID = 'ssi-root';
  const LINK_CLASS = 'ssi-navigation-link';
  // Neutral fragment state: Modern owns #/ React Router routes, Legacy uses #!/ routes.
  const ROUTE = '#streamystats-integration';
  const API_ROOT = '/StreamystatsIntegration';
  const state = { config: null, health: null, observer: null, timer: null, jellyfinUserId: null, userPoll: null, listenersInstalled: false };

  const css = `
    #${ID}{position:fixed;left:0;right:0;bottom:0;z-index:1000;background:#101010;color:#fff;color-scheme:dark;overflow:hidden;padding-bottom:env(safe-area-inset-bottom);box-sizing:border-box}
    #${ID} .ssi-frame{display:none;width:100%;height:100%;border:0;background:#101010}
    #${ID} .ssi-state{height:100%;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;text-align:center;background:var(--background-color,#101010)}
    #${ID} .ssi-card{max-width:34rem}.ssi-spinner{width:36px;height:36px;margin:0 auto 18px;border:3px solid rgba(255,255,255,.2);border-top-color:var(--primary-accent-color,#00a4dc);border-radius:50%;animation:ssi-spin .8s linear infinite}
    #${ID} h2{font-size:1.35rem;margin:.5rem 0}#${ID} p{opacity:.8;line-height:1.5}
    #${ID} .ssi-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:20px}
    #${ID} button,#${ID} a{min-height:44px;border:0;border-radius:.35rem;padding:0 1.2rem;display:inline-flex;align-items:center;justify-content:center;font:inherit;font-weight:600;text-decoration:none;cursor:pointer}
    #${ID} button{background:var(--primary-accent-color,#00a4dc);color:#fff}#${ID} a{background:rgba(255,255,255,.12);color:#fff}
    .MuiToolbar-root .${LINK_CLASS}{display:inline-flex;align-items:center;justify-content:center;color:inherit!important;text-decoration:none}
    .${LINK_CLASS} .ssi-icon{font-size:24px;line-height:1}
    @keyframes ssi-spin{to{transform:rotate(360deg)}}
    @media(max-width:600px){#${ID} .ssi-actions{flex-direction:column}#${ID} .ssi-actions>*{width:100%;box-sizing:border-box}}
    @media(prefers-reduced-motion:reduce){.ssi-spinner{animation-duration:1.8s}}
  `;

  function log(level, message, error) {
    const fn = console[level] || console.log;
    fn.call(console, '[Streamystats Integration] ' + message, error || '');
  }

  function apiUrl(path) {
    const api = window.ApiClient;
    const base = api && typeof api.serverAddress === 'function' ? api.serverAddress() : location.origin;
    return new URL(path.replace(/^\//, ''), base.replace(/\/$/, '') + '/').toString();
  }

  async function apiGet(path) {
    const api = window.ApiClient;
    if (!api) throw new Error('ApiClient unavailable');
    const url = apiUrl(path);
    if (typeof api.getJSON === 'function') return api.getJSON(url);
    return api.ajax({ type: 'GET', url, dataType: 'json' });
  }

  function currentJellyfinUserId() {
    try {
      return String(window.ApiClient?.getCurrentUserId?.() || '');
    } catch {
      return '';
    }
  }

  function value(object, camel, pascal) {
    return object && (object[camel] !== undefined ? object[camel] : object[pascal]);
  }

  const statsUrl = () => value(state.config, 'streamystatsUrl', 'StreamystatsUrl');
  const menuName = () => value(state.config, 'menuName', 'MenuName') || 'Statistiken';

  function routeActive() {
    return String(location.hash).toLowerCase() === ROUTE;
  }

  function isIpHost(host) {
    return /^[\d.]+$/.test(host) || host.includes(':');
  }

  // Streamystats session cookies are SameSite=Lax: inside a cross-site iframe the login never sticks.
  // ponytail: last-two-labels heuristic ignores multi-part public suffixes (co.uk); upgrade path is a PSL lookup.
  function sameSite(a, b) {
    if (a.protocol !== b.protocol) return false;
    if (isIpHost(a.hostname) || isIpHost(b.hostname)) return a.hostname === b.hostname;
    const site = host => host.split('.').slice(-2).join('.');
    return site(a.hostname) === site(b.hostname);
  }

  function ancestorsAllow(ancestors, origin, statsOrigin) {
    if (ancestors == null) return true;
    const self = new URL(origin);
    return ancestors.split(/\s+/).filter(Boolean).some(source => {
      if (source === '*') return true;
      if (source.toLowerCase() === "'self'") return origin === statsOrigin;
      if (/^[a-z][a-z0-9+.-]*:$/i.test(source)) return self.protocol === source.toLowerCase();
      const match = /^(?:([a-z][a-z0-9+.-]*):\/\/)?(\*\.)?([^/:]+)(?::(\d+|\*))?\/?$/i.exec(source);
      if (!match) return false;
      const [, scheme, wildcard, host, port] = match;
      if (scheme && self.protocol !== scheme.toLowerCase() + ':') return false;
      if (port && port !== '*' && self.port !== port) return false;
      const target = host.toLowerCase();
      return wildcard ? self.hostname.endsWith('.' + target) : self.hostname === target;
    });
  }

  function canEmbed() {
    if (!state.health || !value(state.health, 'embeddable', 'Embeddable')) return false;
    try {
      const stats = new URL(statsUrl());
      return sameSite(location, stats)
        && ancestorsAllow(value(state.health, 'frameAncestors', 'FrameAncestors'), location.origin, stats.origin);
    } catch {
      return false;
    }
  }

  async function refreshHealth() {
    try {
      state.health = await apiGet(API_ROOT + '/health');
    } catch (error) {
      state.health = null;
      log('warn', 'health check failed', error);
    }
    document.querySelectorAll('.' + LINK_CLASS).forEach(applyLinkMode);
  }

  function headerBottom() {
    const candidates = [...document.querySelectorAll('.MuiAppBar-root, .skinHeader:not(.hide)')]
      .filter(element => element.getClientRects().length);
    return Math.max(0, ...candidates.map(element => element.getBoundingClientRect().bottom));
  }

  function resizeView() {
    const root = document.getElementById(ID);
    if (!root) return;
    const top = Math.max(0, Math.round(headerBottom()));
    root.style.top = `${top}px`;
    root.style.height = `${Math.max(200, (window.visualViewport?.height || window.innerHeight) - top)}px`;
  }

  function escapeAttribute(input) {
    return String(input || '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
  }

  function showError(root) {
    window.clearTimeout(state.timer);
    const fallback = value(state.config, 'browserFallback', 'BrowserFallback');
    root.innerHTML = `<div class="ssi-state"><div class="ssi-card"><span class="material-icons" aria-hidden="true">signal_wifi_off</span><h2>Statistiken sind momentan nicht verfügbar.</h2><p>Streamystats antwortet nicht oder lässt sich hier nicht einbetten.</p><div class="ssi-actions"><button type="button" data-action="retry">Erneut versuchen</button>${fallback ? `<a href="${escapeAttribute(statsUrl())}" target="_blank" rel="noopener noreferrer">Im Browser öffnen</a>` : ''}</div></div></div>`;
    root.querySelector('[data-action="retry"]')?.addEventListener('click', () => loadFrame(root));
  }

  async function loadFrame(root) {
    window.clearTimeout(state.timer);
    root.innerHTML = '<div class="ssi-state"><div class="ssi-card"><div class="ssi-spinner" aria-hidden="true"></div><h2>Statistiken werden geladen …</h2></div></div>';
    resizeView();
    await refreshHealth();
    if (!document.body.contains(root)) return;
    if (!value(state.health, 'reachable', 'Reachable') || !canEmbed()) return showError(root);

    const iframe = document.createElement('iframe');
    iframe.className = 'ssi-frame';
    iframe.title = menuName();
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allow = 'fullscreen';
    iframe.src = statsUrl();
    iframe.addEventListener('load', () => {
      window.clearTimeout(state.timer);
      root.querySelector('.ssi-state')?.remove();
      iframe.style.display = 'block';
    }, { once: true });
    root.appendChild(iframe);
    state.timer = window.setTimeout(() => showError(root), 15000);
  }

  function mount() {
    if (!state.config || document.getElementById(ID)) return;
    const root = document.createElement('section');
    root.id = ID;
    root.setAttribute('role', 'main');
    root.setAttribute('aria-label', menuName());
    document.body.appendChild(root);
    loadFrame(root);
  }

  function unmount() {
    window.clearTimeout(state.timer);
    document.getElementById(ID)?.remove();
  }

  function openView() {
    if (!routeActive()) history.pushState({ streamystatsIntegration: true }, '', ROUTE);
    mount();
  }

  function applyLinkMode(link) {
    if (canEmbed()) {
      link.href = ROUTE;
      link.removeAttribute('target');
      link.removeAttribute('rel');
    } else {
      link.href = statsUrl();
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  }

  function onLinkClick(event) {
    if (!canEmbed()) return;
    event.preventDefault();
    event.stopPropagation();
    openView();
  }

  // Same anchor as Jellyfin Enhanced: the icon box left of the user-menu button. Pages without a
  // user menu (video player, public pages) have no tray, so no button appears there.
  function headerTray() {
    const userButton = document.querySelector('.MuiAppBar-root [aria-controls="app-user-menu"]');
    const toolbar = userButton?.closest('.MuiToolbar-root');
    let box = userButton;
    while (box && box.parentElement !== toolbar) box = box.parentElement;
    return box?.previousElementSibling || null;
  }

  function headerButton(template) {
    const link = document.createElement('a');
    // Only MUI's own styling classes: sibling buttons may carry other plugins' hook classes.
    const styling = [...template.classList].filter(name => /^(Mui(?!-)|css-)/.test(name));
    link.className = [...styling, LINK_CLASS].join(' ');
    link.title = menuName();
    link.setAttribute('aria-label', menuName());
    link.innerHTML = '<span class="material-icons ssi-icon" aria-hidden="true">query_stats</span>';
    return link;
  }

  function legacyMenuItem() {
    const link = document.createElement('a');
    link.className = `${LINK_CLASS} navMenuOption lnkMediaFolder`;
    link.innerHTML = `<span class="material-icons navMenuOptionIcon" aria-hidden="true">query_stats</span><span class="sectionName navMenuOptionText">${escapeAttribute(menuName())}</span>`;
    return link;
  }

  function installNavigation() {
    if (!state.config) return;

    const tray = headerTray();
    // Jellyfin's own search link is a native MUI anchor; other plugins' buttons only imitate MUI.
    const template = tray?.querySelector('a.MuiIconButton-root[href*="search"]')
      || tray?.querySelector('.MuiIconButton-root:not(.' + LINK_CLASS + ')');
    if (template && !tray.querySelector('.' + LINK_CLASS)) {
      const link = headerButton(template);
      applyLinkMode(link);
      link.addEventListener('click', onLinkClick);
      tray.prepend(link);
    }

    // Jellyfin 12 keeps the legacy drawer hidden in the DOM under the modern layout; only use it without one.
    if (document.querySelector('.MuiAppBar-root')) return;
    const drawerOptions = document.querySelector('.mainDrawer-scrollContainer .userMenuOptions');
    if (drawerOptions && !drawerOptions.querySelector('.' + LINK_CLASS)) {
      const link = legacyMenuItem();
      applyLinkMode(link);
      link.addEventListener('click', onLinkClick);
      drawerOptions.appendChild(link);
    }
  }

  function onDomChange() {
    if (document.getElementById(ID) && !routeActive()) unmount();
    installNavigation();
  }

  async function start() {
    if (!document.getElementById('ssi-style')) {
      const style = document.createElement('style');
      style.id = 'ssi-style';
      style.textContent = css;
      document.head.appendChild(style);
    }

    for (let attempt = 0; attempt < 80 && !window.ApiClient; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    if (!window.ApiClient) return log('warn', 'Jellyfin ApiClient was not available; integration disabled.');

    if (!state.listenersInstalled) {
      state.listenersInstalled = true;
      window.addEventListener('popstate', () => routeActive() ? mount() : unmount());
      window.addEventListener('resize', resizeView, { passive: true });
      window.visualViewport?.addEventListener('resize', resizeView, { passive: true });
      state.userPoll = window.setInterval(() => {
        const userId = currentJellyfinUserId();
        if (userId === state.jellyfinUserId) return;
        unmount();
        document.querySelectorAll('.' + LINK_CLASS).forEach(element => element.remove());
        state.observer?.disconnect();
        state.config = null;
        state.health = null;
        state.jellyfinUserId = userId;
        if (userId) start().catch(error => log('error', 'user-change initialization failed', error));
      }, 2000);
    }

    state.jellyfinUserId = currentJellyfinUserId();
    if (!state.jellyfinUserId) return;

    try {
      state.config = await apiGet(API_ROOT + '/config');
      const target = value(state.config, 'jellyfinTarget', 'JellyfinTarget');
      if (target !== '12.0' || !statsUrl()) throw new Error('unsupported or incomplete configuration');
    } catch {
      state.config = null;
      return log('info', 'not enabled for this user or not configured');
    }

    await refreshHealth();
    installNavigation();
    state.observer = new MutationObserver(onDomChange);
    state.observer.observe(document.body, { childList: true, subtree: true });
    if (routeActive()) mount();
  }

  start().catch(error => log('error', 'initialization failed', error));
})();
