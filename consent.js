/*
 * ANGO — Cookie consent (GDPR)
 *
 * How it works:
 * - The site <head> sets Google Consent Mode v2 defaults (everything "denied")
 *   and defines window.angoLoadGTM(). Google Tag Manager (GA4 + Microsoft
 *   Clarity) only loads AFTER the visitor accepts audience measurement.
 * - This file shows the banner, stores the choice (cookie "ango_consent",
 *   ~6 months) and reopens the preferences from any [data-cookie-settings] element.
 * - Script tag option: data-policy="/policy-url" (the policy link is shown only
 *   when this is set).
 */
(function () {
  'use strict';

  var COOKIE = 'ango_consent';
  var VERSION = 1;
  var MAX_AGE = 60 * 60 * 24 * 182; // ~6 months
  var script = document.currentScript;
  var POLICY_URL = (script && script.getAttribute('data-policy')) || '';

  /* ---------- Stored choice ---------- */

  function readConsent() {
    var m = document.cookie.match(new RegExp('(?:^|; )' + COOKIE + '=([^;]*)'));
    if (!m) return null;
    try {
      var c = JSON.parse(decodeURIComponent(m[1]));
      return c && c.v === VERSION ? c : null;
    } catch (e) {
      return null;
    }
  }

  function writeConsent(analytics) {
    var value = encodeURIComponent(JSON.stringify({ v: VERSION, analytics: !!analytics, ts: Date.now() }));
    var secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = COOKIE + '=' + value + '; Max-Age=' + MAX_AGE + '; Path=/; SameSite=Lax' + secure;
  }

  /* ---------- Applying the choice ---------- */

  function gtag() {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(arguments);
  }

  function clarity() {
    window.clarity = window.clarity || function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };
    window.clarity.apply(null, arguments);
  }

  // Removes analytics cookies already set (GA4 + Clarity) on every possible domain.
  function clearAnalyticsCookies() {
    var names = document.cookie.split('; ').map(function (c) { return c.split('=')[0]; });
    var host = location.hostname;
    var domains = ['', host, '.' + host];
    var parts = host.split('.');
    if (parts.length > 2) domains.push('.' + parts.slice(-2).join('.'));

    names.forEach(function (name) {
      if (!/^(_ga|_gid|_gat|_clck|_clsk|CLID|MUID)/.test(name)) return;
      domains.forEach(function (d) {
        document.cookie = name + '=; Max-Age=0; Path=/' + (d ? '; Domain=' + d : '');
      });
    });
  }

  function applyConsent(analytics, previous) {
    if (analytics) {
      gtag('consent', 'update', { analytics_storage: 'granted' });
      clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
      if (typeof window.angoLoadGTM === 'function') window.angoLoadGTM();
      return;
    }

    gtag('consent', 'update', { analytics_storage: 'denied' });

    // Consent withdrawn: scripts already running cannot be unloaded, so their
    // cookies are cleared and the page reloads without them.
    if (previous && previous.analytics) {
      clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
      clarity('consent', false);
      clearAnalyticsCookies();
      setTimeout(function () { location.reload(); }, 150);
    }
  }

  /* ---------- Banner UI ---------- */

  var CSS = [
    '.ango-cc{--cc-bg:var(--_colors---main-background,#d6d6d6);--cc-fg:var(--_colors---text-color,#13120f);--cc-red:var(--_colors---red,#ed0a30);--cc-line:var(--_colors---border-color,#13120f1a);',
    'position:fixed;left:30px;bottom:30px;z-index:2147483000;width:min(440px,calc(100vw - 60px));box-sizing:border-box;padding:24px;',
    'background:var(--cc-bg);color:var(--cc-fg);border:1px solid var(--cc-fg);',
    'font-family:var(--_typography---font-family--aeonik,Aeonik,Arial,sans-serif);font-size:15px;line-height:21px;',
    'opacity:0;transform:translateY(12px);transition:opacity .35s ease,transform .35s ease;pointer-events:none}',
    '.ango-cc.is-visible{opacity:1;transform:none;pointer-events:auto}',
    '.ango-cc *{box-sizing:border-box}',
    '.ango-cc__label{font-family:var(--_typography---font-family--aeonik-mono,"Aeonik Mono",monospace);font-size:11px;line-height:14px;text-transform:uppercase;color:var(--cc-red);margin:0 0 12px}',
    '.ango-cc__text{margin:0 0 20px}',
    '.ango-cc__text a,.ango-cc__link{color:inherit;text-decoration:underline;text-underline-offset:3px}',
    '.ango-cc__actions{display:flex;gap:10px}',
    '.ango-cc__btn{flex:1 1 0;appearance:none;border:1px solid var(--cc-fg);background:var(--cc-fg);color:var(--cc-bg);cursor:pointer;',
    'font-family:var(--_typography---font-family--aeonik-mono,"Aeonik Mono",monospace);font-size:11px;line-height:14px;text-transform:uppercase;padding:14px 12px;transition:background .2s,color .2s}',
    '.ango-cc__btn:hover{background:var(--cc-red);border-color:var(--cc-red);color:#fff}',
    '.ango-cc__more{appearance:none;background:none;border:0;padding:0;margin-top:16px;cursor:pointer;color:inherit;',
    'font-family:var(--_typography---font-family--aeonik-mono,"Aeonik Mono",monospace);font-size:11px;line-height:14px;text-transform:uppercase;text-decoration:underline;text-underline-offset:3px}',
    '.ango-cc__prefs{display:none;margin:0 0 20px;border-top:1px solid var(--cc-line)}',
    '.ango-cc.is-prefs .ango-cc__prefs{display:block}',
    '.ango-cc.is-prefs .ango-cc__more{display:none}',
    '.ango-cc__row{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:14px 0;border-bottom:1px solid var(--cc-line)}',
    '.ango-cc__row strong{display:block;font-weight:400;margin-bottom:2px}',
    '.ango-cc__row small{display:block;font-size:13px;line-height:18px;opacity:.7}',
    '.ango-cc__state{flex:none;font-family:var(--_typography---font-family--aeonik-mono,"Aeonik Mono",monospace);font-size:11px;line-height:14px;text-transform:uppercase;opacity:.7;padding-top:3px}',
    '.ango-cc__switch{flex:none;position:relative;width:40px;height:22px;margin-top:1px}',
    '.ango-cc__switch input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer;z-index:1}',
    '.ango-cc__switch span{position:absolute;inset:0;border:1px solid var(--cc-fg);transition:background .2s}',
    '.ango-cc__switch span::after{content:"";position:absolute;top:3px;left:3px;width:14px;height:14px;background:var(--cc-fg);transition:transform .2s,background .2s}',
    '.ango-cc__switch input:checked+span{background:var(--cc-fg)}',
    '.ango-cc__switch input:checked+span::after{transform:translateX(18px);background:var(--cc-bg)}',
    '.ango-cc__switch input:focus-visible+span,.ango-cc__btn:focus-visible,.ango-cc__more:focus-visible,.ango-cc a:focus-visible{outline:2px solid var(--cc-red);outline-offset:2px}',
    '.ango-cc__save{display:none}',
    '.ango-cc.is-prefs .ango-cc__save{display:flex}',
    '[data-cookie-settings]{cursor:pointer;font-family:var(--_typography---font-family--aeonik-mono,"Aeonik Mono",monospace);text-decoration:none;text-underline-offset:3px}',
    '[data-cookie-settings]:hover{text-decoration:underline}',
    '@media (max-width:767px){.ango-cc{left:15px;right:15px;bottom:15px;width:auto;padding:20px}}',
    '@media (max-width:479px){.ango-cc__actions{flex-direction:column}}',
    '@media (prefers-reduced-motion:reduce){.ango-cc,.ango-cc *{transition:none!important}}'
  ].join('');

  var banner = null;
  var toggle = null;

  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (html != null) node.innerHTML = html;
    return node;
  }

  function build() {
    if (banner) return banner;

    document.head.appendChild(el('style', { id: 'ango-cc-style' }, CSS));

    var policy = POLICY_URL
      ? ' <a href="' + POLICY_URL + '">En savoir plus</a>.'
      : '';

    banner = el('div', {
      class: 'ango-cc',
      role: 'dialog',
      'aria-modal': 'false',
      'aria-labelledby': 'ango-cc-title',
      'aria-describedby': 'ango-cc-text',
      'data-lenis-prevent': ''
    }, [
      '<p class="ango-cc__label" id="ango-cc-title">Cookies</p>',
      '<p class="ango-cc__text" id="ango-cc-text">Nous utilisons des cookies de mesure d’audience (Google Analytics, Microsoft Clarity) pour comprendre comment le site est utilisé et l’améliorer. Ils ne sont déposés qu’avec votre accord, que vous pouvez modifier à tout moment via « Paramètres des cookies » en bas de page.' + policy + '</p>',
      '<div class="ango-cc__prefs" id="ango-cc-prefs">',
      '  <div class="ango-cc__row"><div><strong>Nécessaires</strong><small>Mémorisent votre choix sur ce bandeau.</small></div><span class="ango-cc__state">Toujours actifs</span></div>',
      '  <div class="ango-cc__row"><div><strong id="ango-cc-analytics-label">Mesure d’audience</strong><small>Google Analytics et Microsoft Clarity : statistiques de visite et analyse de navigation.</small></div>',
      '  <label class="ango-cc__switch"><input type="checkbox" id="ango-cc-analytics" aria-labelledby="ango-cc-analytics-label"><span aria-hidden="true"></span></label></div>',
      '</div>',
      '<div class="ango-cc__actions">',
      '  <button type="button" class="ango-cc__btn" data-cc="reject">Tout refuser</button>',
      '  <button type="button" class="ango-cc__btn" data-cc="accept">Tout accepter</button>',
      '</div>',
      '<div class="ango-cc__actions ango-cc__save" style="margin-top:10px">',
      '  <button type="button" class="ango-cc__btn" data-cc="save">Enregistrer mes choix</button>',
      '</div>',
      '<button type="button" class="ango-cc__more" data-cc="prefs" aria-controls="ango-cc-prefs" aria-expanded="false">Personnaliser</button>'
    ].join(''));

    toggle = banner.querySelector('#ango-cc-analytics');

    banner.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-cc]');
      if (!btn) return;
      var action = btn.getAttribute('data-cc');
      if (action === 'accept') decide(true);
      else if (action === 'reject') decide(false);
      else if (action === 'save') decide(toggle.checked);
      else if (action === 'prefs') {
        banner.classList.add('is-prefs');
        btn.setAttribute('aria-expanded', 'true');
        toggle.focus();
      }
    });

    banner.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && readConsent()) hide();
    });

    document.body.appendChild(banner);
    return banner;
  }

  function show(withPrefs) {
    build();
    var current = readConsent();
    toggle.checked = !!(current && current.analytics);
    banner.classList.toggle('is-prefs', !!withPrefs);
    var more = banner.querySelector('[data-cc="prefs"]');
    if (more) more.setAttribute('aria-expanded', withPrefs ? 'true' : 'false');
    banner.removeAttribute('hidden');
    requestAnimationFrame(function () {
      banner.classList.add('is-visible');
      if (withPrefs) toggle.focus();
    });
  }

  function hide() {
    if (!banner) return;
    banner.classList.remove('is-visible');
    setTimeout(function () {
      if (!banner.classList.contains('is-visible')) banner.setAttribute('hidden', '');
    }, 400);
  }

  function decide(analytics) {
    var previous = readConsent();
    writeConsent(analytics);
    hide();
    applyConsent(analytics, previous);
  }

  /* ---------- Start ---------- */

  // "Cookie settings" link (footer): delegated listener, keeps working after Barba transitions.
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest && e.target.closest('[data-cookie-settings]');
    if (!trigger) return;
    e.preventDefault();
    e.stopPropagation();
    show(true);
  }, true);

  window.AngoConsent = {
    open: function () { show(true); },
    get: readConsent
  };

  var stored = readConsent();
  if (stored) {
    // The <head> already loaded GTM when consent exists; re-applied here as a safety net.
    if (stored.analytics) applyConsent(true);
    return;
  }

  function start() { setTimeout(function () { show(false); }, 800); }
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
})();
