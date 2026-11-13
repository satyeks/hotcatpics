/* Responsive helper: exposes viewport-driven scale factors as CSS variables. */
(function () {
  function setVars() {
    var vw = document.documentElement.clientWidth || window.innerWidth;
    var root = document.documentElement.style;
    var side = Math.max(0, vw - 32);
    var cap = function (n) { return Math.min(1, n).toFixed(4); };
    root.setProperty('--page-zoom', cap(vw / 1470));
    // Independent-scroll panes on the inventory page (desktop): fit panes to the viewport
    var z = Math.min(1, vw / 1470);
    var vh = window.innerHeight / z;
    root.setProperty('--page-h', Math.round(vh) + 'px');
    root.setProperty('--pane-h', Math.max(320, Math.round(vh - 162 - 44)) + 'px');
    root.setProperty('--pv-zoom', cap(side / 595));
    root.setProperty('--sum-zoom', cap(side / 595));
    root.setProperty('--detail-zoom', cap(side / 598));
    root.setProperty('--box-zoom', cap(((vw - 42) / 2) / 329));
    root.setProperty('--block-zoom', cap(((vw - 42) / 2) / 330));
    var headerEl = document.querySelector('.header');
    if (headerEl) {
      root.setProperty('--header-h', Math.round(headerEl.offsetHeight) + 'px');
    }
  }
  setVars();
  window.addEventListener('resize', setVars);
  window.addEventListener('orientationchange', setVars);

  // Yeezy-style asset protection: ensure right clicking anywhere shows the page context menu instead of "Open Image in New Tab"
  document.addEventListener('contextmenu', function (e) {
    if (e.target && e.target.tagName === 'IMG') {
      e.target.style.pointerEvents = 'none';
    }
  }, true);
})();
