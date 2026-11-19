// BrickSpeed PWA: Bluetooth link to the phone pad with Web Bluetooth (Chrome on Android, Chrome/Edge on PC).
// Gives the pad screen the same "transport" the Android app uses: text messages out, JSON back.
(function () {
  var SVC = '4b9f0001-8c2a-4d61-9a3e-b51c0b5e7001',
      RX  = '4b9f0002-8c2a-4d61-9a3e-b51c0b5e7001',
      TX  = '4b9f0003-8c2a-4d61-9a3e-b51c0b5e7001';
  var cb = null, dev = null, rx = null, linked = false, busy = false, pendingJ = null, queue = [], retryT = 0;
  var enc = new TextEncoder(), dec = new TextDecoder();
  var hasBT = !!(navigator.bluetooth && navigator.bluetooth.requestDevice);

  // page code checks for this; outside a secure page or without Web Bluetooth we fall back to Wi-Fi
  if (!window.isSecureContext) return;   // the pad's own Wi-Fi page (http) keeps using Wi-Fi

  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  var ui;
  function build() {
    ui = el('<div id="bleUi"><style>' +
      '#bleUi{position:fixed;inset:0;z-index:40;display:none;place-items:center;text-align:center;padding:24px;background:radial-gradient(120% 90% at 50% 120%,#0d2050 0%,#04081a 60%)}' +
      '#bleUi.on{display:grid}#bleUi .lg{font:italic 900 30px system-ui;color:#fff;margin-bottom:6px}#bleUi .lg i{color:#2f7bff}' +
      '#bleUi p{margin:6px 0 18px;color:#8ea5cc;font:600 15px system-ui;max-width:46ch}' +
      '#bleUi button{min-height:52px;padding:0 26px;border-radius:14px;border:0;background:#2f7bff;color:#fff;font:800 16px system-ui;margin:4px}' +
      '#bleUi .s{background:#12224a;border:1px solid #22386e}#bleUi .sp{width:40px;height:40px;border-radius:50%;border:4px solid #22386e;border-top-color:#2f7bff;animation:bsr .9s linear infinite;margin:0 auto 10px}' +
      '@keyframes bsr{to{transform:rotate(360deg)}}</style>' +
      '<div><div class="lg">BRICK<i>SPEED</i></div><div class="sp" id="bleSp" hidden></div><p id="bleMsg">Switch on your pad, then connect.</p>' +
      '<div><button id="bleGo">Connect to my pad</button><button class="s" id="bleNew" hidden>Choose another pad</button></div></div></div>');
    document.body.appendChild(ui);
    document.getElementById('bleGo').onclick = function () { dev ? relink() : choose(); };
    document.getElementById('bleNew').onclick = function () { if (dev && dev.gatt.connected) dev.gatt.disconnect(); dev = null; choose(); };
  }
  function screen(on, msg, spin) {
    if (!ui) build();
    ui.classList.toggle('on', on);
    if (msg) document.getElementById('bleMsg').textContent = msg;
    document.getElementById('bleSp').hidden = !spin;
    document.getElementById('bleNew').hidden = !dev;
  }

  function link(d) {
    dev = d;
    try { localStorage.setItem('bspadId', d.id); } catch (e) {}
    d.removeEventListener('gattserverdisconnected', lost);
    d.addEventListener('gattserverdisconnected', lost);
    screen(true, 'Connecting to ' + (d.name || 'your pad') + '…', true);
    return d.gatt.connect()
      .then(function (s) { return s.getPrimaryService(SVC); })
      .then(function (sv) { return Promise.all([sv.getCharacteristic(RX), sv.getCharacteristic(TX)]); })
      .then(function (c) {
        rx = c[0];
        c[1].addEventListener('characteristicvaluechanged', function (e) { cb && cb.msg(dec.decode(e.target.value)); });
        return c[1].startNotifications();
      })
      .then(function () { linked = true; screen(false); cb && cb.open(); });
  }

  function choose() {
    navigator.bluetooth.requestDevice({ filters: [{ services: [SVC] }, { namePrefix: 'BrickSpeed-Pad' }], optionalServices: [SVC] })
      .then(link)
      .catch(function (e) { screen(true, /cancel/i.test(e.message) ? 'Switch on your pad, then connect.' : 'Could not connect: ' + e.message, false); });
  }

  function relink() {
    if (!dev || linked) return;
    link(dev).catch(function () { screen(true, 'Looking for ' + (dev.name || 'your pad') + '… is it switched on?', true); retryT = setTimeout(relink, 2500); });
  }

  function lost() {
    linked = false; busy = false; pendingJ = null; queue = [];
    cb && cb.close();
    clearTimeout(retryT); retryT = setTimeout(relink, 1200);   // the page shows "Connection lost · car stopped"
  }

  // the pad we used last time, without the picker (Chrome supports this on newer versions)
  function remembered() {
    var id = null; try { id = localStorage.getItem('bspadId'); } catch (e) {}
    if (!id || !navigator.bluetooth.getDevices) return Promise.resolve(null);
    return navigator.bluetooth.getDevices().then(function (ds) { return ds.filter(function (d) { return d.id === id; })[0] || null; }).catch(function () { return null; });
  }

  function pump() {
    if (busy || !linked || !rx) return;
    var t = queue.length ? queue.shift() : pendingJ;
    if (!t) return;
    if (t === pendingJ) pendingJ = null;
    busy = true;
    var w = rx.writeValueWithoutResponse ? rx.writeValueWithoutResponse(enc.encode(t)) : rx.writeValue(enc.encode(t));
    w.catch(function () {}).then(function () { busy = false; if (queue.length || pendingJ) pump(); });
  }

  if (!hasBT) {                          // e.g. iPhone Safari, Firefox
    var ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    window.BS_TRANSPORT = { start: function () {
      screen(true, ios ? 'On iPhone the pad works over its own Wi-Fi: 1) Settings → Wi-Fi → join BrickSpeed-Pad-XXXX (password brickspeed). 2) Tap the button below. 3) Share → Add to Home Screen.'
                       : 'This browser has no Bluetooth. Use Chrome on Android, or join the pad Wi-Fi (BrickSpeed-Pad-XXXX) and open 192.168.4.1.', false);
      var b = document.getElementById('bleGo'); b.textContent = 'Open the pad (192.168.4.1)'; b.onclick = function () { location.href = 'http://192.168.4.1/'; };
    }, send: function () {} };
    return;
  }
  window.BS_TRANSPORT = {
    start: function (c) {
      cb = c;
      remembered().then(function (d) {
        if (d) { dev = d; relink(); }
        else screen(true, 'Switch on your pad, then connect.', false);
      });
    },
    send: function (t) {
      if (!linked) return;
      if (t[0] === 'J') pendingJ = t; else queue.push(t);       // buttons are never dropped
      pump();
    }
  };
})();
