/* Responsive helper: exposes viewport-driven scale factors as CSS variables. */
(function () {
  function setVars() {
    var vw = document.documentElement.clientWidth || window.innerWidth;
    var root = document.documentElement.style;
    var side = Math.max(0, vw - 32);
    var cap = function (n) { return Math.min(1, n).toFixed(4); };
    root.setProperty('--page-zoom', cap(vw / 1470));
    root.setProperty('--pv-zoom', cap(side / 595));
    root.setProperty('--sum-zoom', cap(side / 595));
    root.setProperty('--detail-zoom', cap(side / 598));
    root.setProperty('--box-zoom', cap(((vw - 42) / 2) / 329));
    root.setProperty('--block-zoom', cap(((vw - 42) / 2) / 330));
  }
  setVars();
  window.addEventListener('resize', setVars);
  window.addEventListener('orientationchange', setVars);
})();
