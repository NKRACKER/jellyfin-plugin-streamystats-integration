(() => {
  'use strict';

  if (window.__streamystatsIntegrationLoaded) return;
  window.__streamystatsIntegrationLoaded = true;

  const ID = 'ssi-root';
  const LINK_CLASS = 'ssi-navigation-link';
  // Neutral fragment state: Modern owns path-based React Router routes while
  // Legacy uses #!/ routes. This marker deliberately belongs to neither.
  const ROUTE = '#streamystats-integration';
  const API_ROOT = '/StreamystatsIntegration';
  const state = { config: null, observer: null, timer: null, jellyfinUserId: null, userPoll: null, listenersInstalled: false };

  const css = `
    #${ID}{position:fixed;left:0;right:0;bottom:0;z-index:1000;background:#101010;color:#fff;color-scheme:dark;overflow:hidden;padding-bottom:env(safe-area-inset-bottom);box-sizing:border-box}
    #${ID} .ssi-frame{display:none;width:100%;height:100%;border:0;background:#101010}
    #${ID} .ssi-state{height:100%;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;text-align:center;background:var(--background-color,#101010)}
    #${ID} .ssi-card{max-width:34rem}.ssi-spinner{width:36px;height:36px;margin:0 auto 18px;border:3px solid rgba(255,255,255,.2);border-top-color:var(--primary-accent-color,#00a4dc);border-radius:50%;animation:ssi-spin .8s linear infinite}
    #${ID} h2{font-size:1.35rem;margin:.5rem 0}#${ID} p{opacity:.8;line-height:1.5}
    #${ID} .ssi-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:20px}
    #${ID} button,#${ID} a{min-height:44px;border:0;border-radius:.35rem;padding:0 1.2rem;display:inline-flex;align-items:center;justify-content:center;font:inherit;font-weight:600;text-decoration:none;cursor:pointer}
    #${ID} button{background:var(--primary-accent-color,#00a4dc);color:#fff}#${ID} a{background:rgba(255,255,255,.12);color:#fff}
    .${LINK_CLASS}{min-width:44px;min-height:44px;background:transparent!important;color:inherit!important;border:0;cursor:pointer;display:inline-flex;align-items:center;gap:.45rem;padding:0 .8rem;font:inherit;text-decoration:none}
    .${LINK_CLASS} .material-icons{font-size:1.4rem}.mainDrawer .${LINK_CLASS}{width:100%;box-sizing:border-box;justify-content:flex-start}
    @keyframes ssi-spin{to{transform:rotate(360deg)}}
    @media(max-width:600px){.${LINK_CLASS}.ssi-modern span:last-child{display:none}#${ID} .ssi-actions{flex-direction:column}#${ID} .ssi-actions>*{width:100%;box-sizing:border-box}}
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

  function routeActive() {
    return String(location.hash).toLowerCase() === ROUTE;
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

  function errorMarkup() {
    const fallback = value(state.config, 'browserFallback', 'BrowserFallback');
    const url = value(state.config, 'streamystatsUrl', 'StreamystatsUrl');
    return `<div class="ssi-state"><div class="ssi-card"><span class="material-icons" aria-hidden="true">signal_wifi_off</span><h2>Statistiken sind momentan nicht verfügbar.</h2><p>Verbindung und Reverse-Proxy-Header prüfen.</p><div class="ssi-actions"><button type="button" data-action="retry">Erneut versuchen</button>${fallback ? `<a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">Im Browser öffnen</a>` : ''}</div></div></div>`;
  }

  function escapeAttribute(input) {
    return String(input || '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
  }

  function showError(root) {
    window.clearTimeout(state.timer);
    root.innerHTML = errorMarkup();
    root.querySelector('[data-action="retry"]')?.addEventListener('click', () => loadFrame(root));
  }

  async function resetForeignStreamystatsSessionIfNeeded() {
    const statsUrl = value(state.config, 'streamystatsUrl', 'StreamystatsUrl');
    const statsOrigin = new URL(statsUrl).origin;
    const bindingKey = `ssi:jellyfin-user:${statsOrigin}`;
    const boundUser = localStorage.getItem(bindingKey);
    if (boundUser === state.jellyfinUserId) return;

    const resetUrl = new URL('/__jellyfin_integration_reset', statsOrigin);
    const response = await fetch(resetUrl, {
      method: 'POST',
      mode: 'cors',
      credentials: 'include',
      cache: 'no-store',
      redirect: 'error'
    });
    if (!response.ok || response.headers.get('X-SSI-Session-Reset') !== '1') {
      throw new Error('The required session-reset proxy endpoint is unavailable.');
    }
    localStorage.setItem(bindingKey, state.jellyfinUserId);
  }

  async function loadFrame(root) {
    window.clearTimeout(state.timer);
    root.innerHTML = '<div class="ssi-state"><div class="ssi-card"><div class="ssi-spinner" aria-hidden="true"></div><h2>Statistiken werden geladen …</h2></div></div>';
    resizeView();
    try {
      const health = await apiGet(API_ROOT + '/health');
      if (!value(health, 'reachable', 'Reachable')) return showError(root);
      await resetForeignStreamystatsSessionIfNeeded();

      const iframe = document.createElement('iframe');
      iframe.className = 'ssi-frame';
      iframe.title = value(state.config, 'menuName', 'MenuName') || 'Statistiken';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allow = 'fullscreen; picture-in-picture';
      iframe.src = value(state.config, 'streamystatsUrl', 'StreamystatsUrl');
      iframe.addEventListener('load', () => {
        window.clearTimeout(state.timer);
        root.querySelector('.ssi-state')?.remove();
        iframe.style.display = 'block';
      }, { once: true });
      root.appendChild(iframe);
      state.timer = window.setTimeout(() => showError(root), 15000);
    } catch (error) {
      log('warn', 'health check failed', error);
      showError(root);
    }
  }

  function mount() {
    if (!state.config || document.getElementById(ID)) return;
    const root = document.createElement('section');
    root.id = ID;
    root.setAttribute('role', 'main');
    root.setAttribute('aria-label', value(state.config, 'menuName', 'MenuName') || 'Statistiken');
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

  function makeLink(modern) {
    const link = document.createElement('button');
    link.type = 'button';
    link.className = `${LINK_CLASS} ${modern ? 'ssi-modern' : 'navMenuOption'}`;
    link.setAttribute('aria-label', value(state.config, 'menuName', 'MenuName'));
    link.innerHTML = `<span class="material-icons" aria-hidden="true">query_stats</span><span>${escapeAttribute(value(state.config, 'menuName', 'MenuName'))}</span>`;
    link.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      openView();
    });
    return link;
  }

  function installNavigation() {
    if (!state.config || document.querySelector('.' + LINK_CLASS)) return;
    const modern = document.querySelector('.MuiAppBar-root .MuiToolbar-root, .MuiAppBar-root');
    if (modern) {
      const controls = modern.querySelector('[class*="button" i]')?.parentElement || modern;
      controls.insertBefore(makeLink(true), controls.firstChild);
      return;
    }
    const legacy = document.querySelector('.mainDrawer .scrollContainer, .mainDrawer');
    if (legacy) legacy.appendChild(makeLink(false));
  }

  function onNavigationClick(event) {
    if (!document.getElementById(ID)) return;
    const target = event.target instanceof Element ? event.target.closest('a,button') : null;
    if (target && !target.classList.contains(LINK_CLASS) && target.closest('.MuiAppBar-root,.mainDrawer,.skinHeader')) unmount();
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
      document.addEventListener('click', onNavigationClick, true);
      state.userPoll = window.setInterval(() => {
        const userId = currentJellyfinUserId();
        if (userId === state.jellyfinUserId) return;
        unmount();
        document.querySelectorAll('.' + LINK_CLASS).forEach(element => element.remove());
        state.observer?.disconnect();
        state.config = null;
        state.jellyfinUserId = userId;
        if (userId) start().catch(error => log('error', 'user-change initialization failed', error));
      }, 2000);
    }

    state.jellyfinUserId = currentJellyfinUserId();
    if (!state.jellyfinUserId) return;

    try {
      state.config = await apiGet(API_ROOT + '/config');
      const target = value(state.config, 'jellyfinTarget', 'JellyfinTarget');
      const url = value(state.config, 'streamystatsUrl', 'StreamystatsUrl');
      if (target !== '12.0' || !url) throw new Error('unsupported or incomplete configuration');
    } catch (error) {
      return log('info', 'not enabled for this user or not configured');
    }

    installNavigation();
    state.observer = new MutationObserver(installNavigation);
    state.observer.observe(document.body, { childList: true, subtree: true });
    if (routeActive()) mount();
  }

  start().catch(error => log('error', 'initialization failed', error));
})();
