/**
 * AniWorld TV v1.6.0 – TizenBrew Modul
 * Komplett neue Navigation: Flache Liste, immer zuverlässig.
 * ROT=Merkliste  GRÜN=Speichern  UP/DOWN=Navigation  OK=Auswählen
 * LEFT/RIGHT=Kalender-Tabs / Hoster  BACK=Zurück / Beenden
 */
(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════
     KONSTANTEN
  ═══════════════════════════════════════════════════════ */
  var VER     = '1.6.0';
  var HOST    = 'aniworld.to';
  var FAV_KEY = 'aw_fav';

  /* ═══════════════════════════════════════════════════════
     REMOTE KEY CODES (Samsung Tizen)
  ═══════════════════════════════════════════════════════ */
  var K = {
    UP:38, DOWN:40, LEFT:37, RIGHT:39, ENTER:13,
    BACK:10009, ESC:27,
    PLAY:415, PAUSE:19, PP:10252, FF:417, RW:412,
    RED:403, GREEN:404
  };

  (function() {
    if (!window.tizen || !tizen.tvinputdevice) return;
    ['MediaPlay','MediaPause','MediaPlayPause','MediaFastForward','MediaRewind',
     'ColorF0Red','ColorF1Green'].forEach(function(k) {
      try { tizen.tvinputdevice.registerKey(k); } catch(e) {}
    });
  })();

  /* ═══════════════════════════════════════════════════════
     ADBLOCKER
  ═══════════════════════════════════════════════════════ */
  (function() {
    // window.open blockieren
    var _op = window.open.bind(window);
    window.open = function(u) {
      if (!u || u === 'about:blank') return null;
      try { if (new URL(''+u).hostname.endsWith(HOST)) return _op.apply(this, arguments); } catch(e) {}
      return null;
    };

    // fetch/XHR zu Ad-Domains blockieren
    var AD_HOSTS = ['coleastrehabilitation.com','mc.yandex.ru','yandex.ru',
      'adsterra.com','propellerads.com','popcash.net','popads.net',
      'exoclick.com','trafficjunky.net','juicyads.com','hilltopads.net',
      'clickadu.com','adcash.com','bidvertiser.com','mgid.com','taboola.com'];
    var _fetch = window.fetch;
    window.fetch = function(url) {
      try {
        var h = new URL(''+url).hostname;
        if (AD_HOSTS.some(function(d){ return h === d || h.endsWith('.'+d); }))
          return Promise.reject(new Error('blocked'));
      } catch(e) {}
      return _fetch.apply(this, arguments);
    };
    var _xhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(m, url) {
      try {
        var h = new URL(''+url, location.href).hostname;
        if (AD_HOSTS.some(function(d){ return h === d || h.endsWith('.'+d); })) {
          this._blocked = true; return;
        }
      } catch(e) {}
      _xhrOpen.apply(this, arguments);
    };
    var _xhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function() {
      if (this._blocked) return;
      _xhrSend.apply(this, arguments);
    };

    // Externe Links säubern: kein target="_blank", mousedown blockieren
    function sanitize(a) {
      if (!a || a._aw) return; a._aw = 1;
      try {
        if (!new URL(a.href||'', location.href).hostname.endsWith(HOST)) {
          a.removeAttribute('target');
          a.addEventListener('mousedown', function(e) { e.stopImmediatePropagation(); }, true);
          a.addEventListener('pointerdown', function(e) { e.stopImmediatePropagation(); }, true);
        }
      } catch(e) {}
    }

    // Click-Guard: externe Links blockieren
    document.addEventListener('click', function(e) {
      var a = e.target.closest('a[href]'); if (!a) return;
      try {
        if (!new URL(a.href, location.href).hostname.endsWith(HOST)) {
          e.preventDefault(); e.stopImmediatePropagation();
        }
      } catch(e) {}
    }, true);

    // MutationObserver für dynamische Ads
    var AD_RE = /\b(ad|ads|advert|banner|popup|interstitial|sponsor|lightbox|gdpr|consent|cookie)\b/i;
    new MutationObserver(function(ms) {
      ms.forEach(function(m) {
        m.addedNodes.forEach(function(n) {
          if (n.nodeType !== 1) return;
          if (n.tagName === 'A') sanitize(n);
          if (n.querySelectorAll) n.querySelectorAll('a[href]').forEach(sanitize);
          var id = n.id||'', cl = typeof n.className==='string' ? n.className : '';
          if (AD_RE.test(id+' '+cl) && !id.startsWith('aw-')) { n.remove(); return; }
          try {
            var st = getComputedStyle(n);
            if (parseInt(st.zIndex) > 500 && !id.startsWith('aw-') &&
                (st.position === 'fixed' || st.position === 'absolute') &&
                n.offsetWidth > innerWidth*0.4 && n.offsetHeight > innerHeight*0.4 &&
                !n.querySelector('video')) n.remove();
          } catch(e) {}
        });
      });
    }).observe(document.documentElement, {childList:true, subtree:true});

    // Ad-CSS
    var css = document.createElement('style');
    css.textContent = 'ins.adsbygoogle,[data-ad-slot],[id^="google_ads"],[id^="div-gpt"],'
      + 'iframe[src*="doubleclick"],iframe[src*="googlesyndication"],'
      + 'iframe[src*="exoclick"],iframe[src*="trafficjunky"],iframe[src*="propellerads"],'
      + '[class*="jw-ad"],[class*="popup"]:not(#aw-fo),[class*="lightbox"]:not(#aw-fo),'
      + '[class*="interstitial"],[class*="gdpr"],[id*="gdpr"],'
      + '[class*="consent"],[id*="consent"],[class*="cookie"],[id*="cookie"],'
      + '#scroll-top-btn,.chatbot-button,.chat-widget,.scrollToTop,'
      + '.shoutboxHeader,.shoutbox'
      + '{display:none!important}';
    document.head.appendChild(css);

    // Slide-In Ads (alle 400ms prüfen)
    var SLIDE_RE = /slide.?in|fly.?in|push.?notif|szn-|aswift_|taboola|ob-widget/i;
    setInterval(function() {
      document.querySelectorAll('a[href][style*="position:fixed"],a[href][style*="position: fixed"]').forEach(function(a) {
        try { if (!new URL(a.href,location.href).hostname.endsWith(HOST)) a.remove(); } catch(e) {}
      });
      document.querySelectorAll('body>div[style*="position: fixed"]:not([id^="aw-"]),body>div[style*="position:fixed"]:not([id^="aw-"])').forEach(function(el) {
        var id = el.id||'', cl = typeof el.className==='string' ? el.className : '';
        if (SLIDE_RE.test(id+' '+cl)) el.remove();
      });
    }, 400);

    setTimeout(function() { document.querySelectorAll('a[href]').forEach(sanitize); }, 800);
  })();

  /* ═══════════════════════════════════════════════════════
     KOSMETIK: Unerwünschte Elemente ausblenden
  ═══════════════════════════════════════════════════════ */
  (function() {
    var hide = document.createElement('style');
    hide.textContent = [
      /* Anime News Carousel */
      '.carousel.animeNews.seriesNewsList,',
      /* "Derzeit beliebt", "Das sehen andere", Promo-Boxen */
      '.homeContentPromotionBox.row.homeSliderSection,',
      /* Generische Überschriften-Divs ohne nützlichen Inhalt */
      '.pageTitle15.bigTitle.pageTitleBold,',
      '.col-md-12.col-sm-12.col-xs-12.pageTitleBold,',
      /* Rechte Sidebar */
      '.col-md-3[style*="padding-left: 10px"],',
      /* Inline styled Promo-Banner (blauer Rand) */
      'div[style*="border: 4px solid #637cf9"],',
      /* Chat */
      '.shoutboxHeader,.shoutbox,',
      /* Scroll-Button */
      '#scroll-top-btn,.scrollToTop',
      '{display:none!important}'
    ].join('');
    document.head.appendChild(hide);
  })();

  /* ═══════════════════════════════════════════════════════
     STYLES (Fokus-Ring, Overlay, Hints)
  ═══════════════════════════════════════════════════════ */
  (function() {
    var s = document.createElement('style'); s.id = 'aw-s';
    s.textContent = [
      '*,*::before,*::after{box-sizing:border-box}',
      'html{scroll-behavior:smooth}',
      'body{cursor:none!important}',
      '::-webkit-scrollbar{display:none}',
      '*:focus{outline:none!important}',
      /* Fokus-Ring */
      '.aw-f{',
        'outline:4px solid #e53e3e!important;',
        'outline-offset:2px!important;',
        'border-radius:4px!important;',
        'box-shadow:0 0 0 6px rgba(229,62,62,.25)!important;',
        'position:relative;z-index:10;',
      '}',
      /* Fav-Overlay */
      '#aw-fo{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:99990;display:none;justify-content:flex-end}',
      '#aw-fo.on{display:flex}',
      '#aw-fp{width:430px;height:100%;background:#0f172a;color:#f1f5f9;display:flex;flex-direction:column;',
        'font-family:Arial,sans-serif;box-shadow:-8px 0 40px rgba(0,0,0,.8);',
        'transform:translateX(100%);transition:transform .2s}',
      '#aw-fo.on #aw-fp{transform:translateX(0)}',
      '#aw-fh{background:#1e293b;padding:14px 16px;flex-shrink:0;display:flex;align-items:center;',
        'justify-content:space-between;border-bottom:2px solid #e53e3e}',
      '#aw-fh h2{margin:0;font-size:18px;color:#f87171}',
      '#aw-fc{background:#334155;border:none;color:#f1f5f9;padding:5px 11px;',
        'border-radius:6px;font-size:13px;cursor:pointer;min-height:unset!important}',
      '#aw-fl{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:7px}',
      '.aw-fi{display:flex;gap:10px;align-items:center;background:#1e293b;border-radius:8px;',
        'padding:9px;text-decoration:none;color:#f1f5f9}',
      '.aw-fi img{width:46px;height:66px;object-fit:cover;border-radius:5px;flex-shrink:0;background:#334155}',
      '.aw-fn{font-size:13px;font-weight:bold;flex:1}',
      '.aw-fr{background:#7f1d1d;border:none;color:#fca5a5;padding:4px 9px;',
        'border-radius:5px;font-size:11px;cursor:pointer;flex-shrink:0;min-height:unset!important}',
      '.aw-fe{text-align:center;color:#64748b;padding:32px 16px;font-size:14px;line-height:1.8}',
      /* Fav-Btn */
      '#aw-fb{position:fixed;bottom:50px;right:22px;background:#e53e3e;color:#fff;border:none;',
        'border-radius:50px;padding:10px 18px;font-size:15px;font-family:Arial,sans-serif;',
        'cursor:pointer;z-index:9990;display:none;box-shadow:0 4px 16px rgba(229,62,62,.4);',
        'min-height:unset!important}',
      '#aw-fb.on{display:inline-flex;align-items:center}',
      '#aw-fb.sv{background:#15803d}',
      /* Toast */
      '#aw-t{position:fixed;bottom:108px;left:50%;transform:translateX(-50%) translateY(10px);',
        'background:#1e293b;color:#f1f5f9;padding:10px 20px;border-radius:50px;',
        'font-family:Arial,sans-serif;font-size:14px;z-index:100000;opacity:0;',
        'white-space:nowrap;transition:opacity .2s,transform .2s;pointer-events:none}',
      '#aw-t.on{opacity:1;transform:translateX(-50%) translateY(0)}',
      /* Hint-Bar */
      '#aw-h{position:fixed;bottom:0;left:0;right:0;background:rgba(15,23,42,.95);',
        'color:#94a3b8;font-family:Arial,sans-serif;font-size:11px;',
        'padding:5px 14px;display:flex;gap:14px;justify-content:center;z-index:9989;',
        'border-top:1px solid #334155}',
      '.aw-k{display:inline-block;background:#334155;color:#e2e8f0;',
        'padding:1px 5px;border-radius:3px;font-size:10px;margin-right:3px}',
    ].join('');
    document.head.appendChild(s);
  })();

  /* ═══════════════════════════════════════════════════════
     FAVS
  ═══════════════════════════════════════════════════════ */
  var Favs = {
    all: function() { try { return JSON.parse(localStorage.getItem(FAV_KEY)||'[]'); } catch(e) { return []; } },
    save: function(l) { localStorage.setItem(FAV_KEY, JSON.stringify(l)); },
    has: function(u) { return this.all().some(function(f){ return f.url===u; }); },
    add: function(x) { var l=this.all(); if(!this.has(x.url)){l.unshift(x);this.save(l);} },
    del: function(u) { this.save(this.all().filter(function(f){ return f.url!==u; })); }
  };
  function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function pageAnime() {
    if (!/\/(anime|serie)\//i.test(location.href)) return null;
    var t = document.querySelector('h1.seriesTitle,h1[itemprop="name"],h1');
    var i = document.querySelector('.seriesCoverBox img,[class*="cover"] img,[itemprop="image"]');
    return t ? {title:t.textContent.trim(), url:location.href, img:i?i.src:'', ts:Date.now()} : null;
  }

  /* ═══════════════════════════════════════════════════════
     UI AUFBAUEN
  ═══════════════════════════════════════════════════════ */
  function buildUI() {
    // Fav-Overlay
    var fo = document.createElement('div'); fo.id = 'aw-fo';
    fo.innerHTML = '<div id="aw-fp"><div id="aw-fh"><h2>⭐ Merkliste</h2>'
      + '<button id="aw-fc">✕</button></div><div id="aw-fl"></div></div>';
    document.body.appendChild(fo);
    fo.addEventListener('click', function(e){ if(e.target===fo) closeFav(); });
    document.getElementById('aw-fc').addEventListener('click', closeFav);
    // Fav-Button
    var fb = document.createElement('button'); fb.id = 'aw-fb';
    document.body.appendChild(fb);
    fb.addEventListener('click', toggleFav);
    // Toast
    var t = document.createElement('div'); t.id = 'aw-t';
    document.body.appendChild(t);
    // Hints
    var h = document.createElement('div'); h.id = 'aw-h';
    h.innerHTML = '<span><span class="aw-k" style="color:#f87171">●</span>Merkliste</span>'
      + '<span><span class="aw-k" style="color:#86efac">●</span>Speichern</span>'
      + '<span><span class="aw-k">↑↓</span>Navigation</span>'
      + '<span><span class="aw-k">OK</span>Auswählen</span>'
      + '<span><span class="aw-k">←→</span>Tabs/Hoster</span>'
      + '<span><span class="aw-k">Zurück</span>Zurück</span>';
    document.body.appendChild(h);
  }

  function renderFavs() {
    var l = document.getElementById('aw-fl'), fs = Favs.all();
    if (!fs.length) {
      l.innerHTML = '<div class="aw-fe">Leer. Drücke <span style="background:#1e293b;color:#86efac;padding:2px 7px;border-radius:4px">Grün</span> auf einer Anime-Seite.</div>';
      return;
    }
    l.innerHTML = fs.map(function(f) {
      return '<a class="aw-fi" href="'+esc(f.url)+'" tabindex="0">'
        + '<img src="'+esc(f.img||'')+'" alt="" onerror="this.style.display=\'none\'">'
        + '<span class="aw-fn">'+esc(f.title)+'</span>'
        + '<button class="aw-fr" data-u="'+esc(f.url)+'" tabindex="0">✕</button></a>';
    }).join('');
    l.querySelectorAll('.aw-fr').forEach(function(b) {
      b.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        Favs.del(b.dataset.u); renderFavs(); updateFavBtn();
      });
    });
  }
  function openFav()  { renderFavs(); document.getElementById('aw-fo').classList.add('on'); Nav.reset(); }
  function closeFav() { document.getElementById('aw-fo').classList.remove('on'); Nav.reset(); }
  function favOpen()  { return document.getElementById('aw-fo').classList.contains('on'); }

  function updateFavBtn() {
    var b = document.getElementById('aw-fb'), a = pageAnime();
    if (!a) { b.classList.remove('on'); return; }
    b.classList.add('on');
    var sv = Favs.has(a.url); b.classList.toggle('sv', sv);
    b.textContent = sv ? '✓ Merkliste' : '+ Merkliste';
  }
  function toggleFav() {
    var a = pageAnime(); if (!a) return;
    if (Favs.has(a.url)) { Favs.del(a.url); toast('Entfernt'); }
    else { Favs.add(a); toast('Gespeichert ⭐'); }
    updateFavBtn();
  }
  var _tt;
  function toast(m) {
    var t = document.getElementById('aw-t');
    t.textContent = m; t.classList.add('on');
    clearTimeout(_tt); _tt = setTimeout(function(){ t.classList.remove('on'); }, 2200);
  }

  /* ═══════════════════════════════════════════════════════
     NAVIGATION ENGINE (NEU: Flache geordnete Liste)
  ═══════════════════════════════════════════════════════ */
  var _idx  = -1;   // Index im aktuellen Elementarray
  var _list = [];   // Aktuelle Liste aller navigierbaren Elemente
  var _cur  = null; // Aktuell fokussiertes Element

  var Nav = {
    /* Erstelle sortierte Liste aller sichtbaren interaktiven Elemente */
    buildList: function() {
      var root = favOpen() ? document.getElementById('aw-fp') : document.body;
      var candidates = Array.from(root.querySelectorAll(
        'a[href]:not([href="#"]):not([href=""]):not([href^="javascript"]),'
        + 'button:not([disabled])'
      ));

      var result = candidates.filter(function(el) {
        // Unsere eigenen UI-Elemente beim Overlay nicht mit einbeziehen
        if (!favOpen() && el.closest('#aw-fo')) return false;
        // Elemente in bekannten Ad-Klassen überspringen
        var id = el.id||'', cl = typeof el.className==='string' ? el.className : '';
        if (/slide.?in|fly.?in|szn-|aswift_|taboola/i.test(id+' '+cl)) return false;
        // Elemente in fixed-Containern (Ads) überspringen
        var fp = el.closest('[style*="position: fixed"],[style*="position:fixed"]');
        if (fp && !(fp.id||'').startsWith('aw-') && !(fp.id||'').startsWith('claude')) return false;
        // Sichtbarkeit prüfen
        var r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) return false;
        var s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
        return true;
      });

      // Sortieren: nach vertikaler Position, dann horizontaler
      result.sort(function(a, b) {
        var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        var dy = (ra.top + ra.height/2) - (rb.top + rb.height/2);
        if (Math.abs(dy) > 15) return dy; // gleiche Zeile wenn < 15px Abstand
        return (ra.left + ra.width/2) - (rb.left + rb.width/2);
      });

      return result;
    },

    /* Fokus auf Element setzen und in Bildschirmmitte scrollen */
    focus: function(el) {
      if (!el) return;
      if (_cur && _cur !== el) _cur.classList.remove('aw-f');
      _cur = el;
      el.classList.add('aw-f');
      el.focus({ preventScroll: true });
      // Element in Bildschirmmitte bringen
      el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    },

    /* State komplett zurücksetzen (nach Seitenwechsel) */
    reset: function() {
      if (_cur) _cur.classList.remove('aw-f');
      _cur = null; _idx = -1; _list = [];
    },

    /* Zum nächsten/vorherigen Element navigieren */
    move: function(dir) {
      // Liste bei jedem Move neu bauen (Seite kann sich verändert haben)
      _list = this.buildList();
      if (!_list.length) return;

      // Aktuellen Index bestimmen
      var curIdx = _cur ? _list.indexOf(_cur) : -1;

      // Spezialfall: Kalender-Tabs (LEFT/RIGHT innerhalb der Tab-Zeile)
      if ((dir === 'left' || dir === 'right') && !favOpen()) {
        if (this.handleCalendarOrHoster(dir)) return;
      }

      var nextIdx;
      if (dir === 'up' || dir === 'left') {
        nextIdx = curIdx <= 0 ? 0 : curIdx - 1;
      } else {
        nextIdx = curIdx < 0 ? 0 : Math.min(curIdx + 1, _list.length - 1);
      }

      _idx = nextIdx;
      this.focus(_list[_idx]);
    },

    /* Erster Fokus beim Seitenstart */
    start: function() {
      _list = this.buildList();
      if (!_list.length) return;

      // Seitentyp-spezifischer Start-Fokus
      var first = null;

      // Kalender: aktiven Tab fokussieren
      var calActive = document.querySelector('li.ui-tabs-tab.active a, li.ui-tabs-tab.ui-state-active a');
      if (calActive && _list.indexOf(calActive) >= 0) {
        first = calActive;
      }
      // Episode: ersten Hoster
      else if (document.querySelector('.hosterSiteVideo ul li a')) {
        first = _list.find(function(el) { return el.closest('.hosterSiteVideo'); });
      }
      // Staffel/Detail: ersten Episoden-Link
      else if (document.querySelector('.seasonEpisodesList')) {
        first = _list.find(function(el) { return el.closest('.seasonEpisodesList'); });
      }
      // Generisch: erstes Element das KEIN reiner Nav-Link ist
      if (!first) {
        first = _list.find(function(el) {
          return !el.closest('.header-container, .responsive-menu-container, .footer-container');
        }) || _list[0];
      }

      _idx = _list.indexOf(first);
      if (first) this.focus(first);
    },

    /* Kalender-Tabs und Hoster LEFT/RIGHT */
    handleCalendarOrHoster: function(dir) {
      // Kalender: _cur ist ein Tab oder Kind eines Tabs
      var tab = _cur && _cur.closest('li.ui-tabs-tab');
      if (tab) {
        var tabs = Array.from(document.querySelectorAll('li.ui-tabs-tab'));
        var idx  = tabs.indexOf(tab);
        var next = dir === 'right' ? tabs[idx+1] : tabs[idx-1];
        if (next) {
          var a = next.querySelector('a.ui-tabs-anchor');
          if (a) { a.click(); this.focus(next); return true; }
        }
        return true; // im Kalender bleiben, nicht rausspringen
      }

      // Hoster-Seite: LEFT/RIGHT zwischen Hostern
      if (_cur && _cur.closest('.hosterSiteDirectNav, .hosterSiteVideo')) {
        // Links der Hoster-Zeile in Reihenfolge
        var row = _cur.closest('.hosterSiteDirectNav, .hosterSiteVideo');
        var links = Array.from(row.querySelectorAll('a'));
        var i = links.indexOf(_cur);
        var n = dir === 'right' ? links[i+1] : links[i-1];
        if (n) { _idx = _list.indexOf(n); this.focus(n); return true; }
        return true;
      }
      return false;
    }
  };

  /* ═══════════════════════════════════════════════════════
     VIDEO: Auto-Fokus auf Play-Button
  ═══════════════════════════════════════════════════════ */
  new MutationObserver(function() {
    var v = document.querySelector('video:not([data-aw])');
    if (!v) return;
    v.dataset.aw = '1';
    setTimeout(function() {
      var btn = document.querySelector('.plyr__control--overlaid, .vjs-big-play-button')
        || (v.closest('[class*="player"]') || {querySelector:function(){}}).querySelector('button');
      if (btn) Nav.focus(btn);
    }, 600);
  }).observe(document.body, {childList:true, subtree:true});

  /* ═══════════════════════════════════════════════════════
     ZURÜCK-TASTE (immer zuverlässig)
  ═══════════════════════════════════════════════════════ */
  function goBack() {
    // Fullscreen beenden
    if (document.fullscreenElement) {
      try { document.exitFullscreen(); } catch(e) {}
      return;
    }
    // Fav-Panel schließen
    if (favOpen()) { closeFav(); return; }
    // History zurück
    if (history.length > 1) {
      history.back();
    } else {
      // App beenden (Tizen)
      try { tizen.application.getCurrentApplication().exit(); } catch(e) {}
    }
  }

  /* ═══════════════════════════════════════════════════════
     KEY HANDLER
  ═══════════════════════════════════════════════════════ */
  var _keyLock = false; // Debounce gegen Key-Repeat

  document.addEventListener('keydown', function(e) {
    var c = e.keyCode;
    var vid = document.querySelector('video');

    // BACK immer
    if (c === K.BACK || c === K.ESC) {
      e.preventDefault(); goBack(); return;
    }

    // ROT = Merkliste
    if (c === K.RED) {
      e.preventDefault(); favOpen() ? closeFav() : openFav(); return;
    }

    // GRÜN = Speichern
    if (c === K.GREEN) { e.preventDefault(); toggleFav(); return; }

    // Navigation (mit leichtem Debounce)
    if (c === K.UP || c === K.DOWN || c === K.LEFT || c === K.RIGHT) {
      e.preventDefault();
      if (_keyLock) return;
      _keyLock = true;
      setTimeout(function() { _keyLock = false; }, 120);

      if (c === K.UP)    Nav.move('up');
      if (c === K.DOWN)  Nav.move('down');
      if (c === K.LEFT)  Nav.move('left');
      if (c === K.RIGHT) Nav.move('right');
      return;
    }

    // ENTER = Klick auf fokussiertes Element
    if (c === K.ENTER) {
      if (_cur) {
        e.preventDefault();
        // Sicherheits-Check: kein externer Link
        try {
          if (_cur.tagName === 'A') {
            if (!new URL(_cur.href, location.href).hostname.endsWith(HOST)) return;
          }
        } catch(e2) {}
        _cur.click();
      }
      return;
    }

    // Medientasten
    if (c === K.PLAY || c === K.PAUSE || c === K.PP) {
      if (vid) { e.preventDefault(); vid.paused ? vid.play() : vid.pause(); }
    }
    if (c === K.FF && vid) { e.preventDefault(); vid.currentTime += 10; toast('+10s'); }
    if (c === K.RW && vid) { e.preventDefault(); vid.currentTime -= 10; toast('-10s'); }
  }, true);

  /* ═══════════════════════════════════════════════════════
     URL-WECHSEL ERKENNEN (SPA + normale Navigation)
  ═══════════════════════════════════════════════════════ */
  var _lastUrl = location.href;

  function onUrlChange() {
    if (location.href === _lastUrl) return;
    _lastUrl = location.href;
    Nav.reset();
    updateFavBtn();
    // Warte bis DOM neu gerendert
    setTimeout(function() { Nav.start(); }, 600);
  }

  new MutationObserver(onUrlChange).observe(document, {subtree:true, childList:true});
  window.addEventListener('popstate', function() {
    // Nach history.back(): State resetten, dann neu starten
    Nav.reset();
    setTimeout(function() {
      updateFavBtn();
      Nav.start();
    }, 500);
  });

  /* ═══════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════ */
  function init() {
    buildUI();
    updateFavBtn();
    // Start-Fokus nach kurzem Delay (Seite fertig laden)
    var tries = 0;
    var timer = setInterval(function() {
      tries++;
      _list = Nav.buildList();
      if (_list.length > 3 || tries > 10) {
        clearInterval(timer);
        Nav.start();
      }
    }, 250);
    setTimeout(function() { toast('AniWorld TV v' + VER + ' ✓'); }, 1200);
    console.info('[AniWorld TV] v' + VER + ' geladen');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();