/**
 * AniWorld TV – TizenBrew Loader
 * Lädt immer die neueste Version via jsDelivr CDN.
 * TizenBrew cached diese Datei – jsDelivr ist immer aktuell!
 */
(function () {
  var CDN   = 'https://cdn.jsdelivr.net/gh/Neogenes1s/aniworld@main/code.js';
  var CACHE = 'aw_code_v16';

  function run(src) {
    try { (new Function(src))(); } catch (e) { console.error('[AW]', e); }
  }

  var cached = localStorage.getItem(CACHE);
  if (cached) run(cached);

  var s = document.createElement('script');
  s.setAttribute('data-aw', '1');
  s.src = CDN + '?v=' + Date.now();
  s.onerror = function () {
    if (!cached) console.error('[AW Loader] Offline + kein Cache!');
  };
  (document.head || document.documentElement).appendChild(s);
})();
