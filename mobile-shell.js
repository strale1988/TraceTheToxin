/* TraceTheToxin — mobile-shell.js (index.html only): PWA install/alert banners, wind alerts, GPS + last location, pull-to-refresh, report FAB. Load after app-core.js. */
(function injectShellMarkup() {
  document.body.insertAdjacentHTML('beforeend', "<div id=\"pullRefreshIndicator\">\n  <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n    <line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"></line>\n    <polyline points=\"19 12 12 19 5 12\"></polyline>\n  </svg>\n  <span id=\"pullRefreshLabel\">Pull to refresh</span>\n</div><div id=\"installBanner\" class=\"pwa-banner\" role=\"dialog\">\n  <img src=\"image/TraceTheToxin.png\" alt=\"\">\n  <div class=\"pwa-banner-text\"><b id=\"installBannerTitle\">Install TraceTheToxin</b><span id=\"installBannerBody\">Add it to your home screen for quick access.</span></div>\n  <button type=\"button\" class=\"pwa-banner-btn\" id=\"installBannerBtn\" onclick=\"installApp()\">Install</button>\n  <button type=\"button\" class=\"pwa-banner-x\" onclick=\"dismissInstallBanner()\" aria-label=\"Close\">✕</button>\n</div><div id=\"alertPromptBanner\" class=\"pwa-banner\" role=\"dialog\">\n  <img src=\"image/TraceTheToxin.png\" alt=\"\">\n  <div class=\"pwa-banner-text\"><b id=\"alertPromptTitle\">Turn on wind alerts</b><span id=\"alertPromptBody\">Get notified when bad air is reported nearby and the wind is carrying it toward you.</span></div>\n  <button type=\"button\" class=\"pwa-banner-btn\" id=\"alertPromptBtn\" onclick=\"enableAlertsFromPrompt()\">Turn on</button>\n  <button type=\"button\" class=\"pwa-banner-x\" onclick=\"dismissAlertPrompt()\" aria-label=\"Close\">✕</button>\n</div><div id=\"alertToast\" class=\"pwa-banner\" role=\"alert\">\n  <div class=\"pwa-banner-text\"><b id=\"alertToastTitle\"></b><span id=\"alertToastBody\"></span></div>\n  <button type=\"button\" class=\"pwa-banner-btn\" id=\"alertToastBtn\" onclick=\"alertToastShowOnMap()\">Show on map</button>\n  <button type=\"button\" class=\"pwa-banner-x\" onclick=\"hideAlertToast()\" aria-label=\"Close\">✕</button>\n</div><div id=\"locChip\" class=\"loc-chip\" role=\"button\" tabindex=\"0\" onclick=\"locChipEnableGps()\" onkeydown=\"if(event.key==='Enter'||event.key===' '){event.preventDefault();locChipEnableGps();}\">\n  <span class=\"loc-chip-btn\" id=\"locChipGpsBtn\">Enable GPS</span>\n  <span class=\"loc-chip-text\" id=\"locChipText\">or drop a pin</span>\n  <span class=\"loc-chip-arrow\" aria-hidden=\"true\">➜</span>\n</div><div id=\"gpsModal\" class=\"generic-modal-overlay\" style=\"display:none\">\n  <div class=\"generic-modal\">\n    <div class=\"generic-modal-icon\"><img class=\"icon-tint\" src=\"icons/pin.png\" alt=\"Pin\" style=\"width:18px;height:18px;vertical-align:middle;\"></div>\n    <h2 id=\"gpsModalTitle\">GPS Not Enabled</h2>\n    <p id=\"gpsModalBody\">Location access is turned off. To report bad air at your location, enable it in your settings.</p>\n    <p id=\"gpsModalAlt\" style=\"font-size:12px;color:var(--text-secondary);margin-bottom:16px;\">Or use the <img class=\"icon-tint\" src=\"icons/pin.png\" alt=\"Pin\" style=\"width:18px;height:18px;vertical-align:middle;\"> button on the map to drop a pin manually.</p>\n    <button class=\"generic-modal-close\" onclick=\"hideGpsModal()\" id=\"gpsModalBtn\">Got it</button>\n  </div>\n</div><button type=\"button\" class=\"report-fab-btn\" id=\"reportFabBtn\" title=\"Report bad air\" aria-label=\"Report bad air\" onclick=\"reportFabTap()\" disabled=\"\">\n  <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"white\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n    <line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"></line>\n    <line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"></line>\n  </svg>\n</button>");
  const before = (id, html) => { const e = document.getElementById(id); if (e) e.insertAdjacentHTML('beforebegin', html); };
  before('freshDriftSettingsSection', "<div class=\"detail-section\" id=\"installSettingsSection\">\n      <div class=\"detail-section-title\" id=\"installSectionTitle\">Install app</div>\n      <button type=\"button\" class=\"export-btn\" style=\"width:100%;\" id=\"installAppBtn\" onclick=\"installApp()\">Add to home screen</button>\n      <p class=\"detail-export-hint\" id=\"installHint\"></p>\n    </div><div class=\"detail-section\" id=\"alertSettingsSection\">\n      <label class=\"settings-toggle-row\" for=\"alertToggle\">\n        <span id=\"alertToggleLabel\">Wind alerts</span>\n        <span class=\"toggle-switch\">\n          <input type=\"checkbox\" id=\"alertToggle\" autocomplete=\"off\" onchange=\"setAlertsEnabled(this.checked)\">\n          <span class=\"toggle-switch-track\"><span class=\"toggle-switch-thumb\"></span></span>\n        </span>\n      </label>\n      <p class=\"detail-export-hint\" id=\"alertToggleHint\"></p>\n      <div id=\"alertOptions\" style=\"display:none;\">\n        <div class=\"detail-section-title alert-radius-title\" id=\"alertRadiusTitle\">Alert distance</div>\n        <div class=\"theme-segment\" id=\"alertRadiusSegment\">\n          <button type=\"button\" class=\"theme-segment-btn\" data-km=\"10\" onclick=\"setAlertRadius(10)\">10 km</button>\n          <button type=\"button\" class=\"theme-segment-btn\" data-km=\"25\" onclick=\"setAlertRadius(25)\">25 km</button>\n          <button type=\"button\" class=\"theme-segment-btn\" data-km=\"50\" onclick=\"setAlertRadius(50)\">50 km</button>\n        </div>\n        <p class=\"detail-export-hint\" id=\"alertLocInfo\" style=\"margin-top:12px;\"></p>\n        <button type=\"button\" class=\"export-btn\" style=\"width:100%;\" id=\"alertLocBtn\" onclick=\"refreshAlertLocationNow()\">Update my location now</button>\n      </div>\n      <p class=\"detail-export-hint\" id=\"alertStatus\"></p>\n    </div><div class=\"detail-section\" id=\"lastLocSettingsSection\">\n      <div class=\"detail-section-title\" id=\"lastLocSectionTitle\">Last known location</div>\n      <button type=\"button\" class=\"settings-btn\" style=\"width:100%;\" id=\"forgetLastLocBtn\" onclick=\"forgetLastLocation()\">Forget last location</button>\n      <p class=\"detail-export-hint\" id=\"forgetLastLocHint\"></p>\n      <p class=\"detail-export-hint\" id=\"forgetLastLocStatus\" style=\"margin-top:4px;\"></p>\n    </div>");
  before('splashQuotesSettingsSection', "<div class=\"detail-section\" id=\"remindersSettingsSection\">\n      <label class=\"settings-toggle-row\" for=\"remindersToggle\">\n        <span id=\"remindersToggleLabel\">Reminders</span>\n        <span class=\"toggle-switch\">\n          <input type=\"checkbox\" id=\"remindersToggle\" autocomplete=\"off\" onchange=\"setRemindersEnabled(this.checked)\">\n          <span class=\"toggle-switch-track\"><span class=\"toggle-switch-thumb\"></span></span>\n        </span>\n      </label>\n      <p class=\"detail-export-hint\" id=\"remindersToggleHint\"></p>\n    </div>");
})();
/* ═══════════════════════════════════════════════════
   GPS MODAL
═══════════════════════════════════════════════════ */
function updateGpsModalText(){
  const el = id => document.getElementById(id);
  if(el('gpsModalTitle')) el('gpsModalTitle').textContent  = t('gpsTitle');
  if(el('gpsModalBody'))  el('gpsModalBody').textContent   = t('gpsBody');
  if(el('gpsModalAlt')) el('gpsModalAlt').innerHTML = t('gpsAlt');
  if(el('gpsModalBtn'))   el('gpsModalBtn').textContent    = t('gpsBtn');
}

// Only auto-pop the "GPS not enabled" notice once per page load. After
// that we keep silently retrying GPS in the background (see the
// setInterval(startWatching, ...) below) without interrupting the user
// again and again.
let gpsModalShownThisLoad = false;

function showGpsModal(){
  const modal = document.getElementById('gpsModal');
  if(!modal) return;
  if (gpsModalShownThisLoad) return;
  gpsModalShownThisLoad = true;
  updateGpsModalText();
  modal.style.display = 'flex';
  modal.offsetHeight;
}

function hideGpsModal(){
  const modal = document.getElementById('gpsModal');
  if(modal) modal.style.display = 'none';
}

/* ═══════════════════════════════════════════════════
   GPS INIT
═══════════════════════════════════════════════════ */
function enableManualPinMode() {
  // Called when GPS is unavailable/denied (see initGps() below). Its job is
  // just to turn ON pin-drop mode -- same as tapping the pin button -- so
  // the user can tap their real location via the existing map click
  // handler. It previously tried to drop a marker at `center`, an
  // undefined variable (ReferenceError, silently aborting this whole
  // function every time it ran) at the map's arbitrary current center --
  // which isn't the user's actual location, and would have wrongly enabled
  // the submit button at that bogus spot before they'd tapped anything.
  if (pinMode) return;
  pinMode = true;
  const btn = document.getElementById('pinMapBtn');
  if (btn) btn.classList.add('active');
  clearMarkers();
  clearBackgroundTrails();
  if (userMarker && map.hasLayer(userMarker)) map.removeLayer(userMarker);
  checkFormReady();
}

// Keeps the big red "+" report button disabled until the user has a
// location — either a live GPS fix or a manually-dropped pin. Called
// whenever userCoords / manualCoords change (GPS fix, pin drop, pin
// clear). Also nudges the open wizard's own submit-readiness check,
// which is a harmless no-op if the wizard isn't open.


// Max random offset applied to every GPS fix before it is stored or shown.
const GPS_BLUR_METERS = 150;

// Obfuscate a GPS fix by offsetting it a random distance (up to radiusMeters)
// in a random direction, so the device's true location is never stored or shown.
function fuzzCoords(lat, lon, radiusMeters = GPS_BLUR_METERS) {
  const earthRadius = 6371000; // meters
  const randomAngle = Math.random() * 2 * Math.PI;
  // sqrt() gives a uniform distribution of points across the disk area
  // (otherwise points would cluster near the center)
  const randomDist = radiusMeters * Math.sqrt(Math.random());

  const latRad = lat * Math.PI / 180;
  const deltaLat = (randomDist * Math.cos(randomAngle)) / earthRadius;
  const deltaLon = (randomDist * Math.sin(randomAngle)) / (earthRadius * Math.cos(latRad));

  return {
    lat: lat + (deltaLat * 180 / Math.PI),
    lon: lon + (deltaLon * 180 / Math.PI)
  };
}

// GPS dot icon: a white halo (for contrast against busy map tiles/pins)
// behind the usual blue dot, plus -- once we have a wind reading -- an
// arrow drawn on top pointing where the wind is blowing toward, so the
// user's own location marker doubles as a wind indicator at a glance.


function startWatching() {
  navigator.geolocation.getCurrentPosition(
    pos => {
      userCoords = fuzzCoords(pos.coords.latitude, pos.coords.longitude, GPS_BLUR_METERS);
      saveLastGps(userCoords);
      hideGpsModal();

      // Create the blue dot the first time we get a fix, then just move
      // it on every subsequent fix so the dot tracks the device instead
      // of freezing at the very first location the app ever saw. Not
      // added to the map yet if pin mode is currently active -- it stays
      // hidden (see togglePinMode) until pin mode is turned back off.
      if (!userMarker) {
        userMarker = L.marker([userCoords.lat, userCoords.lon], {
          icon: makeUserLocationIcon(currentWindDegForMarker),
          pane: 'userLocationPane'
        });
        if (!pinMode) {
          userMarker.addTo(map);
          map.setView([userCoords.lat, userCoords.lon], 13);
        }
      } else {
        userMarker.setLatLng([userCoords.lat, userCoords.lon]);
      }
      // Get a fresh wind reading for wherever GPS just landed. Not forced --
      // triggerWindUpdate's own distance gate (WIND_REFETCH_MIN_KM) means this
      // only actually re-fetches once the fix has moved meaningfully, so it's
      // safe to call on every 5s watch tick without spamming Open-Meteo.
      triggerWindUpdate();
      checkFormReady();
      evaluateActiveNearbyClusters();
    },
    err => {
      // If GPS fails, switch to manual mode automatically
      showGpsModal();
      //enableManualPinMode();
    },
    { enableHighAccuracy: true, timeout: 12000 }
  );
}

// Re-check GPS every 5s. This does two things at once:
//  1. Keeps the blue dot in sync if the device has physically moved
//     while the app was left open.
//  2. Catches the case where GPS was off at load and the user turns it
//     on afterwards — the very next tick will pick up a fix, hide the
//     "GPS Not Enabled" modal, and drop the blue dot in automatically.
setInterval(startWatching, 5000);

function initGps() {
  if (!navigator.geolocation) {
    showGpsModal();
    return;
  }

  // Check permission state directly
  navigator.permissions.query({ name: 'geolocation' }).then(result => {
    if (result.state === 'denied') {
      // Don't auto-switch into manual pin mode just because GPS is
      // denied/unavailable -- that used to silently flip the map into
      // pin-drop mode without the user asking for it. Just show the "GPS
      // Not Enabled" modal (which itself points at the pin button) and
      // let the user opt into manual mode themselves by tapping it.
      showGpsModal();
    } else {
      startWatching();
    }
  }).catch(() => {
    // If permissions API not supported, just try to get the position
    startWatching();
  });
}

initGps();

/* ═══════════════════════════════════════════════════
   LAST KNOWN LOCATION (shown while GPS is off)
   The last (already fuzzed) GPS fix is kept on this device only and shown
   as a grey ghost marker with a "GPS off" label until a live fix arrives.
═══════════════════════════════════════════════════ */
const LAST_GPS_KEY = (TT_LS + 'last_gps');
let lastGpsSavedAt = 0;
var lastGpsForgotten = false;   // set by forgetLastLocation(): stop re-saving for the rest of this session
let lastLocMarker = null;
function saveLastGps(c) {
  if (!c || lastGpsForgotten || Date.now() - lastGpsSavedAt < 30000) return;
  lastGpsSavedAt = Date.now();
  try { localStorage.setItem(LAST_GPS_KEY, JSON.stringify({ lat: c.lat, lon: c.lon, ts: Date.now() })); } catch (e) {}
}
function readLastGps() {
  try {
    const o = JSON.parse(localStorage.getItem(LAST_GPS_KEY) || 'null');
    return (o && isFinite(o.lat) && isFinite(o.lon) && isFinite(o.ts)) ? o : null;
  } catch (e) { return null; }
}
function lastLocAgo(ts) {
  const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
  const sr = lang === 'sr';
  if (m < 1)  return sr ? 'upravo sada' : 'just now';
  if (m < 60) return sr ? `pre ${m} min` : `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return sr ? `pre ${h} h` : `${h} h ago`;
  const d = Math.round(h / 24);
  return sr ? `pre ${d} d` : `${d} d ago`;
}
function makeLastLocIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="18" fill="rgba(138,143,152,.14)" stroke="#8a8f98" stroke-width="1.5" stroke-dasharray="3 4" class="lastloc-ring"/>
      <circle cx="22" cy="22" r="8" fill="#9aa0a8" stroke="#ffffff" stroke-width="2"/>
      <line x1="14" y1="30" x2="30" y2="14" stroke="#d93025" stroke-width="2.6" stroke-linecap="round"/>
    </svg>`;
  return L.divIcon({
    className: 'lastloc-icon',
    html: `<div class="lastloc-wrap"><span class="loc-pulse"></span><span class="loc-pulse p2"></span>${svg}<span class="lastloc-label">${t('lastLocGpsOff')}</span></div>`,
    iconSize: [44, 44], iconAnchor: [22, 22]
  });
}
function buildLastLocPopup(saved) {
  return `<div style="min-width:170px;">
    <div style="font-weight:600; margin-bottom:4px;">${t('lastLocTitle')}</div>
    <div style="color:var(--text-secondary); font-size:12px; margin-bottom:8px;">${t('lastLocBody')}<br>${t('lastLocSeen')}: ${lastLocAgo(saved.ts)}</div>
    <button type="button" class="loc-chip-btn" onclick="map.closePopup(); locChipEnableGps();">${t('locChipGps')}</button>
  </div>`;
}
// Called every second from the location tick: show the ghost marker while
// there is no live fix, remove it the moment GPS delivers one.
function updateLastLocMarker() {
  const saved = (!userCoords && performance.now() > 2500) ? readLastGps() : null;
  if (!saved) {
    if (lastLocMarker && map.hasLayer(lastLocMarker)) map.removeLayer(lastLocMarker);
    return;
  }
  if (!lastLocMarker) {
    lastLocMarker = L.marker([saved.lat, saved.lon], { icon: makeLastLocIcon(), pane: 'lastLocPane', keyboard: false });
    lastLocMarker.bindPopup(buildLastLocPopup(saved));
    lastLocMarker.on('popupopen', () => { const sv = readLastGps(); if (sv) lastLocMarker.setPopupContent(buildLastLocPopup(sv)); });
  } else {
    lastLocMarker.setLatLng([saved.lat, saved.lon]);
  }
  if (!map.hasLayer(lastLocMarker)) lastLocMarker.addTo(map);
  const lab = lastLocMarker.getElement() && lastLocMarker.getElement().querySelector('.lastloc-label');
  if (lab && lab.textContent !== t('lastLocGpsOff')) lab.textContent = t('lastLocGpsOff');
}

// Settings > "Forget last location": deletes the saved position from this
// device and removes the grey marker. Saving stays paused until the next page
// load -- otherwise a live GPS fix would just write it straight back.
function forgetLastLocation() {
  lastGpsForgotten = true;
  try { localStorage.removeItem(LAST_GPS_KEY); } catch (e) {}
  updateLastLocMarker();            // no saved position now, so this removes the marker
  refreshForgetLastLocUi();
}
function refreshForgetLastLocUi() {
  const el = id => document.getElementById(id);
  if (!el('forgetLastLocBtn')) return;
  const saved = readLastGps();
  el('lastLocSectionTitle').textContent = t('lastLocTitle');
  el('forgetLastLocBtn').textContent = t('forgetLastLocBtn');
  el('forgetLastLocBtn').disabled = !saved;
  el('forgetLastLocHint').textContent = t('forgetLastLocHint');
  el('forgetLastLocStatus').textContent = saved
    ? t('forgetLastLocSaved').replace('{when}', lastLocAgo(saved.ts))
    : t(lastGpsForgotten ? 'forgetLastLocDone' : 'forgetLastLocNone');
}


// Install-app and wind-alert shortcut buttons, stacked under the zoom +/-.
// Shown/hidden by updateMapActionButtons() (PWA block) and the Reminders switch.
const MapActionControl = L.Control.extend({
  options:{ position:'topleft' },
  onAdd(){
    const c = L.DomUtil.create('div', 'map-act-stack');
    c.innerHTML =
      '<button type="button" class="map-act-btn" id="installMapBtn" style="display:none" onclick="installApp()">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M5 21h14"/></svg>' +
      '</button>' +
      '<button type="button" class="map-act-btn" id="alertMapBtn" style="display:none" onclick="enableAlertsFromPrompt()">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>' +
      '</button>';
    L.DomEvent.disableClickPropagation(c);
    return c;
  }
});
new MapActionControl().addTo(map);


/* ═══════════════════════════════════════════════════
   PWA (install + reminder) AND WIND ALERTS
   - sw.js / manifest.webmanifest live next to index.html
   - Alerts: when >= ALERT_MIN_REPORTS people report bad air within
     ALERT_CLUSTER_KM of each other, the wind direction at those reports
     decides who is downwind. Subscribers inside that cone get a push
     (server: the send-air-alerts edge function). While the app is open,
     the same check also runs here off a realtime feed.
═══════════════════════════════════════════════════ */
// The VAPID public key is served by the send-air-alerts edge function (GET), so the
// app never hard-codes it and can't drift out of sync with the server's private key.
let vapidPublicKeyCache = null;
async function getVapidPublicKey() {
  if (vapidPublicKeyCache) return vapidPublicKeyCache;
  const res = await fetch(SUPABASE_URL + '/functions/v1/send-air-alerts', { method: 'GET' });
  if (!res.ok) throw new Error('VAPID key request failed: ' + res.status);
  const { publicKey } = await res.json();
  if (!publicKey) throw new Error('Server returned no VAPID public key');
  return (vapidPublicKeyCache = publicKey);
}
const ALERTS_KEY         = (TT_LS + 'alerts_v1');
const ALERT_MIN_REPORTS  = 2;    // keep in sync with MIN_REPORTS in the edge function
const ALERT_CLUSTER_KM   = 5;
const ALERT_MAX_AGE_MIN  = 90;
const ALERT_COOLDOWN_MIN = 60;

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);


/* ---------- Install (button in Settings + periodic reminder banner) ---------- */
let deferredInstallPrompt = null;
let installBannerTimer = null;




/* ---------- Reminders master switch (Settings) + persistent location chip ---------- */
function remindersEnabled() { return lsGet((TT_LS + 'reminders'), '1') !== '0'; }
function setRemindersEnabled(on) {
  lsSet((TT_LS + 'reminders'), on ? '1' : '0');
  if (!on) {
    clearTimeout(installBannerTimer); clearTimeout(alertPromptTimer);
    hideInstallBanner(); hideAlertPrompt();
  } else {
    scheduleInstallBanner(); scheduleAlertPrompt();
  }
  updateLocChip();
}

const LOC_CHIP_DELAY_MS = 10000;
const locChipLoadedAt = Date.now();

// Tap "Enable GPS": ask the browser if it can; if permission was already
// denied the browser won't prompt again, so show the explainer instead.
function locChipEnableGps() {
  const explain = () => { gpsModalShownThisLoad = false; showGpsModal(); };
  if (!navigator.geolocation) { explain(); return; }
  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: 'geolocation' }).then(r => {
      if (r.state === 'denied') explain(); else startWatching();
    }).catch(() => startWatching());
  } else {
    startWatching();
  }
}

// Runs every second: shows the chip (and pulses the pin button) once 10s
// have passed with no GPS fix and no pin in use. Hides as soon as either
// exists, while a modal is open, or if Reminders is switched off.
function updateMapActionButtons() {
  const inst = document.getElementById('installMapBtn');
  const al = document.getElementById('alertMapBtn');
  if (!inst || !al) return;
  let showInst = false, showAlert = false;
  try {
    const on = remindersEnabled();
    showInst = on && !isStandalone() && lsGet((TT_LS + 'installed'), '') !== '1' && (!!deferredInstallPrompt || isIOS());
    showAlert = on && !getAlertPrefs().on && !alertsBlockedReason();
  } catch (e) {}
  inst.style.display = showInst ? 'flex' : 'none';
  al.style.display = showAlert ? 'flex' : 'none';
  inst.title = t('installBannerTitle'); inst.setAttribute('aria-label', inst.title);
  al.title = t('alertPromptTitle');     al.setAttribute('aria-label', al.title);
}

// Banners share one spot under the header; when more than one is showing,
// stack them instead of letting them cover each other.
function restackBanners() {
  const h = document.querySelector('header');
  let top = (h ? h.offsetHeight : 60) + 10;
  ['updateBanner', 'alertToast', 'installBanner', 'alertPromptBanner'].forEach(id => {
    const b = document.getElementById(id);
    if (!b || !b.style.display || b.style.display === 'none') return;
    b.style.top = top + 'px';
    top += b.offsetHeight + 8;
  });
}

function updateLocChip() {
  updateMapActionButtons();
  try { restackBanners(); } catch (e) {}
  try { updateLastLocMarker(); } catch (e) {}
  const chip = document.getElementById('locChip');
  const pinBtn = document.getElementById('pinMapBtn');
  if (!chip) return;
  const noLocation = !userCoords && !manualCoords && !pinMode;
  const due = remindersEnabled() && noLocation && (Date.now() - locChipLoadedAt >= LOC_CHIP_DELAY_MS);
  const blocked = typeof anyModalOpen === 'function' && anyModalOpen();
  if (pinBtn) pinBtn.classList.toggle('pin-attn', due);
  if (due && !blocked) {
    const gb = document.getElementById('locChipGpsBtn'), tx = document.getElementById('locChipText');
    if (gb.textContent !== t('locChipGps')) gb.textContent = t('locChipGps');
    if (tx.textContent !== t('locChipOr')) tx.textContent = t('locChipOr');
    chip.style.display = 'flex';
    // Anchor to the pin button's real on-screen position so it is always centred on it.
    const r = pinBtn ? pinBtn.getBoundingClientRect() : null;
    if (r && r.width) {
      chip.style.bottom = 'auto';
      chip.style.top = Math.round(r.top + r.height / 2) + 'px';
      chip.style.right = Math.round(document.documentElement.clientWidth - r.left + 8) + 'px';
      chip.style.transform = 'translateY(-50%)';
    }
  } else {
    chip.style.display = 'none';
  }
}
setInterval(updateLocChip, 1000);

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  refreshInstallUi();
  scheduleInstallBanner();
});
window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  lsSet((TT_LS + 'installed'), '1');
  hideInstallBanner();
  refreshInstallUi();
});

async function installApp() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    let outcome = null;
    try { outcome = (await deferredInstallPrompt.userChoice).outcome; } catch (e) {}
    deferredInstallPrompt = null;
    if (outcome === 'accepted') hideInstallBanner();
    refreshInstallUi();
    return;
  }
  showInstallBanner(true); // no native prompt available: show the manual steps
}

function installHelpText() {
  return isIOS() ? t('installIos') : t('installManual');
}


function showInstallBanner(manual) {
  const b = document.getElementById('installBanner');
  if (!b) return;
  document.getElementById('installBannerBody').textContent = manual ? installHelpText() : t('installBannerBody');
  document.getElementById('installBannerBtn').style.display = manual ? 'none' : '';
  placeBelowHeader(b);
  b.style.display = 'flex';
}
function hideInstallBanner() {
  const b = document.getElementById('installBanner');
  if (b) b.style.display = 'none';
}
function dismissInstallBanner() {
  hideInstallBanner();
  const n = (parseInt(lsGet((TT_LS + 'install_dismissals'), '0'), 10) || 0) + 1;
  lsSet((TT_LS + 'install_dismissals'), n);
  // First two dismissals: ask again in a week. After that: once a month.
  lsSet((TT_LS + 'install_snooze_until'), Date.now() + (n >= 3 ? 30 : 7) * 86400000);
}


function scheduleInstallBanner() {
  if (!remindersEnabled()) return;
  if (isStandalone() || lsGet((TT_LS + 'installed'), '') === '1') return;
  if (Date.now() < (parseInt(lsGet((TT_LS + 'install_snooze_until'), '0'), 10) || 0)) return;
  if ((parseInt(lsGet((TT_LS + 'visit_count'), '0'), 10) || 0) < 2) return;   // not on the very first visit
  clearTimeout(installBannerTimer);
  installBannerTimer = setTimeout(tryShowInstallBanner, 7000);
}
function tryShowInstallBanner() {
  if (!remindersEnabled()) return;
  if (isStandalone()) return;
  if (!deferredInstallPrompt && !isIOS()) return;   // nothing we can actually offer
  if (anyModalOpen()) { installBannerTimer = setTimeout(tryShowInstallBanner, 8000); return; }
  showInstallBanner(false);
}

/* ---------- Wind-alerts opt-in reminder (same pattern as the install banner) ---------- */
let alertPromptTimer = null;
var alertPromptAfterReport = false;   // true while the banner shows the "just reported" wording

function renderAlertPromptText() {
  const k = alertPromptAfterReport ? 'alertPromptAfterReport' : 'alertPrompt';
  const set = (id, key) => { const el = document.getElementById(id); if (el) el.textContent = t(key); };
  set('alertPromptTitle', k + 'Title'); set('alertPromptBody', k + 'Body'); set('alertPromptBtn', 'alertPromptBtn');
}
function showAlertPrompt(afterReport) {
  const b = document.getElementById('alertPromptBanner');
  if (!b) return;
  alertPromptAfterReport = !!afterReport;
  renderAlertPromptText();
  placeBelowHeader(b);
  b.style.display = 'flex';
}
function hideAlertPrompt() {
  const b = document.getElementById('alertPromptBanner');
  if (b) b.style.display = 'none';
  alertPromptAfterReport = false;
}
// Offered right after a bad-air report is submitted. Same Turn on / dismiss
// buttons and the same snooze as the timed reminder, so a "no" is remembered.
function offerAlertsAfterReport(category) {
  try {
    if (category === 'Clean Air') return;        // alerts are about bad air
    if (!remindersEnabled()) return;
    if (getAlertPrefs().on || alertsBlockedReason()) return;
    if (Date.now() < (parseInt(lsGet((TT_LS + 'alert_prompt_snooze_until'), '0'), 10) || 0)) return;
    if (anyModalOpen()) return;
    clearTimeout(alertPromptTimer);              // the generic reminder isn't needed now
    showAlertPrompt(true);
    restackBanners();
  } catch (e) { console.warn('Post-report alert offer failed:', e); }
}
function dismissAlertPrompt() {
  hideAlertPrompt();
  const n = (parseInt(lsGet((TT_LS + 'alert_prompt_dismissals'), '0'), 10) || 0) + 1;
  lsSet((TT_LS + 'alert_prompt_dismissals'), n);
  // First two dismissals: ask again in a week. After that: once a month.
  lsSet((TT_LS + 'alert_prompt_snooze_until'), Date.now() + (n >= 3 ? 30 : 7) * 86400000);
}
async function enableAlertsFromPrompt() {
  hideAlertPrompt();
  lsSet((TT_LS + 'alert_prompt_snooze_until'), Date.now() + 7 * 86400000);   // don't nag again right after a failed attempt
  await setAlertsEnabled(true);   // runs inside the tap, so the browser permission prompt is allowed
  // If it didn't switch on (denied, no location...), open Settings so the reason is visible.
  if (!getAlertPrefs().on) showSettingsModal();
}
function scheduleAlertPrompt() {
  if (!remindersEnabled()) return;
  if (getAlertPrefs().on) return;
  if (alertsBlockedReason()) return;   // unsupported, denied, or iOS tab not installed yet: nothing to offer
  if (Date.now() < (parseInt(lsGet((TT_LS + 'alert_prompt_snooze_until'), '0'), 10) || 0)) return;
  if ((parseInt(lsGet((TT_LS + 'visit_count'), '0'), 10) || 0) < 2) return;   // not on the very first visit
  clearTimeout(alertPromptTimer);
  alertPromptTimer = setTimeout(tryShowAlertPrompt, 12000);   // after the install banner's 7s
}
function tryShowAlertPrompt() {
  if (!remindersEnabled()) return;
  if (getAlertPrefs().on || alertsBlockedReason()) return;
  const shown = document.getElementById('alertPromptBanner');
  if (shown && shown.style.display === 'flex') return;   // already up (e.g. the post-report offer)
  const inst = document.getElementById('installBanner');
  const toast = document.getElementById('alertToast');
  const otherBannerUp = (inst && inst.style.display === 'flex') || (toast && toast.style.display === 'flex');
  if (anyModalOpen() || otherBannerUp) { alertPromptTimer = setTimeout(tryShowAlertPrompt, 8000); return; }
  showAlertPrompt();
}

function refreshInstallUi() {
  const sec = document.getElementById('installSettingsSection');
  if (!sec) return;
  sec.style.display = isStandalone() ? 'none' : '';
  const hint = document.getElementById('installHint');
  if (hint) hint.textContent = deferredInstallPrompt ? t('installHintPrompt') : installHelpText();
}

// Count one visit per browser session.
try {
  if (!sessionStorage.getItem((TT_LS + 'visit_counted'))) {
    sessionStorage.setItem((TT_LS + 'visit_counted'), '1');
    lsSet((TT_LS + 'visit_count'), (parseInt(lsGet((TT_LS + 'visit_count'), '0'), 10) || 0) + 1);
  }
} catch (e) {}
window.addEventListener('load', () => { refreshInstallUi(); scheduleInstallBanner(); });

/* ---------- Wind-alert geometry (mirrored in the edge function) ---------- */




// A reporter-typed wind that differs from the model wind by more than 60 degrees is almost
// certainly a typo or a misread of the wind app: trust the model value then.

const alertHalfAngle = d => d < 5 ? 60 : 40;   // measured scatter of the plume direction is ~25 deg
// Wind direction is meteorological (where it blows FROM), so the plume travels toward
// fromDeg + 180 (+ the episode correction near a known chimney). `me` is downwind if it sits in a
// cone from the middle of the reports, or in a cone from the chimney the smell is attributed to.
// Light wind (<3 km/h) has no reliable direction, so then only people next to the reports are alerted.
function assessDownwind(c, me, radiusKm) {
  const dist = getHaversineDistance(c.lat, c.lon, me.lat, me.lon);
  if (dist > radiusKm) return null;
  if (dist <= 1.5) return { kind: 'near', distKm: dist, etaMin: 0, fromDeg: c.windFromDeg };
  if (c.windFromDeg == null || (c.speedKmh != null && c.speedKmh < 3)) return null;
  const sp = c.speedKmh ?? 10;
  const toDeg = (c.windFromDeg + 180 + (c.biasDeg || 0) + 360) % 360;
  const hit = () => ({ kind: 'downwind', distKm: dist, etaMin: Math.max(1, Math.round(dist / sp * 60)), fromDeg: c.windFromDeg });
  if (dist <= Math.max(10, sp * 3) && alertAngleDiff(alertBearing(c.lat, c.lon, me.lat, me.lon), toDeg) <= alertHalfAngle(dist)) return hit();
  if (c.stack) {
    const ds = getHaversineDistance(c.stack.a, c.stack.o, me.lat, me.lon);
    if (ds <= Math.max(12, sp * 4) && alertAngleDiff(alertBearing(c.stack.a, c.stack.o, me.lat, me.lon), toDeg) <= alertHalfAngle(ds)) return hit();
  }
  return null;
}

// Group the new report with other recent, nearby, non-"Clean Air" reports.
function buildAlertCluster(rep) {
  const now = Date.now();
  const created = new Date(rep.created_at).getTime();
  if (isNaN(created) || now - created > ALERT_MAX_AGE_MIN * 60000 || created - now > 20 * 60000) return null;   // report times are rounded to 15 min and may lie ahead
  if (rep.category === 'Clean Air') return null;
  const pool = (globalActiveData || []).filter(r => r.id !== rep.id).concat([rep]);
  const members = pool.filter(r => {
    if (r.category === 'Clean Air') return false;
    const ts = new Date(r.created_at).getTime();
    if (isNaN(ts) || now - ts > ALERT_MAX_AGE_MIN * 60000) return false;
    return getHaversineDistance(rep.latitude, rep.longitude, r.latitude, r.longitude) <= ALERT_CLUSTER_KM;
  });
  if (members.length < ALERT_MIN_REPORTS) return null;
  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const winds = members.map(r => ({ lat: parseFloat(r.latitude), lon: parseFloat(r.longitude), wind: alertMemberWind(parseFloat(r.manual_wind_direction), parseFloat(r.wind_direction)) }));
  const dirs = winds.map(w => w.wind).filter(isFinite);
  const speeds = members.map(r => parseFloat(r.wind_speed)).filter(isFinite);
  const c = {
    id: rep.id, count: members.length,
    lat: avg(members.map(r => parseFloat(r.latitude))), lon: avg(members.map(r => parseFloat(r.longitude))),
    windFromDeg: alertCircMean(dirs), speedKmh: speeds.length ? avg(speeds) : null, stack: null, biasDeg: 0
  };
  const att = c.windFromDeg != null ? stackSourceFor(c.lat, c.lon, c.windFromDeg) : null;
  if (att) {
    c.stack = { a: att.b.a, o: att.b.o, n: att.b.n };
    // Episode correction: where the reports sit relative to the chimney vs. where the wind says smell goes.
    const res = [];
    winds.forEach(w => {
      if (!isFinite(w.wind)) return;
      const d = getHaversineDistance(att.b.a, att.b.o, w.lat, w.lon);
      if (d < 2.5 || d > 30) return;
      const r = ((alertBearing(att.b.a, att.b.o, w.lat, w.lon) - (w.wind + 180) + 540) % 360 + 360) % 360 - 180;
      if (Math.abs(r) <= 70) res.push(r);
    });
    if (res.length >= 2) {
      res.sort((x, y) => x - y);
      const med = res.length % 2 ? res[(res.length - 1) / 2] : (res[res.length / 2 - 1] + res[res.length / 2]) / 2;
      c.biasDeg = Math.max(-30, Math.min(30, med * res.length / (res.length + 1)));
    }
  }
  return c;
}

/* ---------- Alert prefs + UI ---------- */
function getAlertPrefs() {
  let p = {};
  try { p = JSON.parse(localStorage.getItem(ALERTS_KEY) || '{}') || {}; } catch (e) {}
  return Object.assign({ on: false, radius: 25, synced: 0, lang: null, lastLocalAlert: 0 }, p);
}
function saveAlertPrefs(p) { try { localStorage.setItem(ALERTS_KEY, JSON.stringify(p)); } catch (e) {} }

function setAlertStatus(key) {
  const el = document.getElementById('alertStatus');
  if (el) el.textContent = key ? t(key) : '';
}
function syncAlertUi() {
  try {
    const p = getAlertPrefs();
    const tg = document.getElementById('alertToggle');
    if (tg) tg.checked = !!p.on;
    if (p.on) hideAlertPrompt();
    const opts = document.getElementById('alertOptions');
    if (opts) opts.style.display = p.on ? '' : 'none';
    updateAlertLocInfo();
    document.querySelectorAll('#alertRadiusSegment .theme-segment-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-km') === String(p.radius));
    });
    if (!p.on) { const r = alertsBlockedReason(); setAlertStatus(r === 'alertsDenied' || r === 'alertsNeedInstall' ? r : ''); }
  } catch (e) {}
}

function alertsBlockedReason() {
  const iosBrowserTab = isIOS() && !isStandalone();
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return iosBrowserTab ? 'alertsNeedInstall' : 'alertsUnsupported';
  }
  if (iosBrowserTab) return 'alertsNeedInstall';
  if (Notification.permission === 'denied') return 'alertsDenied';
  return '';
}

// Position used for alerts: the app's own (already fuzzed to ~150 m) location.
function getAlertLocation(fresh) {
  return new Promise((resolve, reject) => {
    if (!fresh && userCoords) return resolve({ lat: userCoords.lat, lon: userCoords.lon });
    if (!navigator.geolocation) return reject(new Error('no geolocation'));
    navigator.geolocation.getCurrentPosition(
      p => { const c = fuzzCoords(p.coords.latitude, p.coords.longitude, GPS_BLUR_METERS); resolve({ lat: c.lat, lon: c.lon }); },
      () => reject(new Error('location denied')),
      { timeout: 10000, maximumAge: fresh ? 0 : 600000 }
    );
  });
}

function urlB64ToUint8Array(b64) {
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, ch => ch.charCodeAt(0));
}

// Creates/refreshes the push subscription and stores it with the approximate
// location + chosen distance. Returns false when background push isn't set up.
async function syncAlertSubscription(allowCreate, freshLocation) {
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub && allowCreate) {
      const key = urlB64ToUint8Array(await getVapidPublicKey());
      try {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      } catch (e) {
        // A subscription made with a different server key blocks re-subscribing: drop it and retry once.
        if (e && e.name === 'InvalidStateError') {
          const old = await reg.pushManager.getSubscription();
          if (old) await old.unsubscribe();
          sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        } else throw e;
      }
    }
    if (!sub) return false;
    const loc = await getAlertLocation(freshLocation);
    const j = sub.toJSON();
    const p = getAlertPrefs();
    const { error } = await sb.rpc('upsert_alert_subscription', {
      p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth,
      p_lat: loc.lat, p_lon: loc.lon, p_radius_km: p.radius, p_lang: lang
    });
    if (error) throw error;
    p.synced = Date.now(); p.lang = lang; saveAlertPrefs(p);
    updateAlertLocInfo();
    return true;
  } catch (e) {
    console.warn('Alert subscription sync failed:', e);
    return false;
  }
}

async function setAlertsEnabled(on) {
  const tg = document.getElementById('alertToggle');
  const p = getAlertPrefs();
  if (!on) {
    p.on = false; saveAlertPrefs(p);
    stopLiveAlerts();
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) { const ep = sub.endpoint; await sub.unsubscribe(); await sb.rpc('delete_alert_subscription', { p_endpoint: ep }); }
    } catch (e) { console.warn('Alert unsubscribe failed:', e); }
    syncAlertUi(); setAlertStatus('');
    return;
  }
  const blocked = alertsBlockedReason();
  if (blocked) { if (tg) tg.checked = false; setAlertStatus(blocked); return; }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { if (tg) tg.checked = false; setAlertStatus('alertsDenied'); return; }
  try { await getAlertLocation(); } catch (e) { if (tg) tg.checked = false; setAlertStatus('alertsNoGps'); return; }
  p.on = true; saveAlertPrefs(p);
  const pushOk = await syncAlertSubscription(true);
  startLiveAlerts();
  syncAlertUi();
  setAlertStatus(pushOk ? 'alertsOn' : 'alertsInAppOnly');
}

function alertAgo(ms) {
  if (!ms) return t('alertLocNever');
  const min = Math.floor((Date.now() - ms) / 60000);
  if (min < 1) return t('alertLocJustNow');
  if (min < 60) return alertFmt(t('alertLocMin'), { n: min });
  if (min < 1440) return alertFmt(t('alertLocHour'), { n: Math.floor(min / 60) });
  return alertFmt(t('alertLocDay'), { n: Math.floor(min / 1440) });
}
function updateAlertLocInfo() {
  const el = document.getElementById('alertLocInfo');
  if (el) el.textContent = alertFmt(t('alertLocLabel'), { when: alertAgo(getAlertPrefs().synced) });
}
async function refreshAlertLocationNow() {
  const btn = document.getElementById('alertLocBtn');
  if (btn) btn.disabled = true;
  const ok = await syncAlertSubscription(Notification.permission === 'granted', true);
  setAlertStatus(ok ? 'alertLocDone' : 'alertLocFail');
  updateAlertLocInfo();
  if (btn) btn.disabled = false;
}

function setAlertRadius(km) {
  const p = getAlertPrefs();
  p.radius = km; saveAlertPrefs(p);
  syncAlertUi();
  if (p.on) syncAlertSubscription(false);
}

// Keep the stored location/language fresh when the app comes back to the front.
function refreshAlertSubscription() {
  const p = getAlertPrefs();
  if (!p.on || alertsBlockedReason()) return;
  if (Date.now() - p.synced > 15 * 60000 || p.lang !== lang) syncAlertSubscription(Notification.permission === 'granted');
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshAlertSubscription(); });

/* ---------- Foreground alerts (realtime feed while the app is open) ---------- */
let liveAlertChannel = null;
function startLiveAlerts() {
  if (liveAlertChannel || !getAlertPrefs().on) return;
  try {
    liveAlertChannel = sb.channel('ttt-live-reports')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'air_reports' }, p => onLiveReport(p.new))
      .subscribe();
  } catch (e) { console.warn('Live alerts unavailable:', e); }
}
function stopLiveAlerts() {
  if (liveAlertChannel) { try { sb.removeChannel(liveAlertChannel); } catch (e) {} liveAlertChannel = null; }
}

async function onLiveReport(rep) {
  const p = getAlertPrefs();
  if (!p.on || !rep) return;
  const c = buildAlertCluster(rep);
  if (!c) return;
  let me; try { me = await getAlertLocation(); } catch (e) { return; }
  if (getHaversineDistance(rep.latitude, rep.longitude, me.lat, me.lon) < 0.4) return;   // that's probably you
  const hit = assessDownwind(c, me, p.radius);
  if (!hit) return;
  if (Date.now() - (p.lastLocalAlert || 0) < ALERT_COOLDOWN_MIN * 60000) return;
  p.lastLocalAlert = Date.now(); saveAlertPrefs(p);
  showWindAlert(c, hit);
}

const ALERT_COMPASS = { en: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], sr: ['S', 'SI', 'I', 'JI', 'J', 'JZ', 'Z', 'SZ'] };
function alertCompass(deg) { return ALERT_COMPASS[lang][Math.round(deg / 45) % 8]; }
function alertFmt(s, v) { return s.replace(/\{(\w+)\}/g, (m, k) => (v[k] ?? m)); }

function alertMessage(hit) {
  const v = { km: hit.distKm.toFixed(1), min: hit.etaMin, dir: hit.fromDeg != null ? alertCompass(hit.fromDeg) : '' };
  return hit.kind === 'near'
    ? { title: t('alertTitleNear'), body: alertFmt(t('alertBodyNear'), v) }
    : { title: t('alertTitleDown'), body: alertFmt(t('alertBodyDown'), v) };
}

let alertToastTimer = null;
function showWindAlert(c, hit) {
  const msg = alertMessage(hit);
  const box = document.getElementById('alertToast');
  if (box) {
    document.getElementById('alertToastTitle').textContent = msg.title;
    document.getElementById('alertToastBody').textContent = msg.body;
    box.dataset.lat = c.lat; box.dataset.lon = c.lon;
    placeBelowHeader(box);
    box.style.display = 'flex';
    clearTimeout(alertToastTimer);
    alertToastTimer = setTimeout(hideAlertToast, 30000);
  }
  try {
    if (swReg && Notification.permission === 'granted') {
      swReg.showNotification(msg.title, {
        body: msg.body, icon: 'image/TraceTheToxin.png', badge: 'image/TraceTheToxin.png',
        tag: 'ttt-wind-alert', renotify: true, vibrate: [200, 100, 200, 100, 400], data: { lat: c.lat, lon: c.lon }
      });
    }
  } catch (e) {}
}
function hideAlertToast() { const b = document.getElementById('alertToast'); if (b) b.style.display = 'none'; }
function alertToastShowOnMap() {
  const b = document.getElementById('alertToast');
  if (b) focusMapOn(b.dataset.lat, b.dataset.lon);
  hideAlertToast();
}

function applyPwaLang() {
  const set = (id, k) => { const el = document.getElementById(id); if (el) el.textContent = t(k); };
  set('installSectionTitle', 'installSectionTitle'); set('installAppBtn', 'installBtn');
  set('installBannerTitle', 'installBannerTitle'); set('installBannerBtn', 'installBannerBtn');
  set('alertToggleLabel', 'alertToggleLabel'); set('alertToggleHint', 'alertToggleHint');
  set('alertRadiusTitle', 'alertRadiusTitle'); set('alertToastBtn', 'alertShowMap'); set('alertLocBtn', 'alertLocBtn');
  renderAlertPromptText();
  const bb = document.getElementById('installBannerBody');
  if (bb && !(document.getElementById('installBannerBtn').style.display === 'none')) bb.textContent = t('installBannerBody');
  refreshInstallUi();
  const st = document.getElementById('alertStatus');
  if (st) st.textContent = '';
  syncAlertUi();
}

window.addEventListener('load', () => {
  const p = getAlertPrefs();
  if (p.on && !alertsBlockedReason()) { startLiveAlerts(); refreshAlertSubscription(); }
  else if (p.on) { p.on = false; saveAlertPrefs(p); }   // permission was revoked since last time
  syncAlertUi();
  scheduleAlertPrompt();
});


/* ═══════════════════════════════════════════════════
   PULL-TO-REFRESH
   Body has overflow:hidden (so map gestures don't scroll the page),
   which also suppresses the browser's native overscroll refresh. This
   reproduces just that gesture, scoped to touches that start on the
   header itself, so it can't be triggered by panning the map.
═══════════════════════════════════════════════════ */
(function setupPullToRefresh() {
  const headerEl = document.querySelector('header');
  const indicator = document.getElementById('pullRefreshIndicator');
  const label = document.getElementById('pullRefreshLabel');
  if (!headerEl || !indicator) return;

  const PULL_THRESHOLD = 70;   // px of pull before release triggers a refresh
  const MAX_PULL = 110;        // px cap so it doesn't drag forever
  let startY = null;
  let pulling = false;
  let armed = false; // past the threshold, will refresh on release

  if (label) label.textContent = t('pullToRefresh');

  // The header itself never moves: only the indicator drops out from under it.
  function setPull(dist, animate) {
    indicator.classList.toggle('animate', !!animate);
    indicator.style.top = Math.round(headerEl.getBoundingClientRect().bottom) + 'px';
    const progress = Math.min(Math.max(dist, 0), MAX_PULL) / MAX_PULL; // 0..1
    const h = indicator.offsetHeight || 30;
    indicator.style.opacity = dist > 0 ? '1' : '0';
    indicator.style.transform = `translate(-50%, ${Math.round(-h + progress * (h + 12))}px)`;
  }

  headerEl.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    startY = e.touches[0].clientY;
    pulling = true;
    armed = false;
  }, { passive: true });

  const DEADZONE = 8; // px of movement ignored before this counts as an intentional pull, not tap jitter

  headerEl.addEventListener('touchmove', (e) => {
    if (!pulling || startY == null) return;
    const dy = e.touches[0].clientY - startY;
    if (dy <= DEADZONE) { return; }
    // Once it's clearly a downward pull (past the deadzone), own the
    // gesture so the page doesn't try to do anything else with it.
    if (e.cancelable) e.preventDefault();
    const wasArmed = armed;
    armed = dy > PULL_THRESHOLD;
    if (armed !== wasArmed) {
      indicator.classList.toggle('ready', armed);
      if (label) label.textContent = t(armed ? 'releaseToRefresh' : 'pullToRefresh');
    }
    setPull(dy - DEADZONE, false);
  }, { passive: false });

  function endPull() {
    if (!pulling) return;
    pulling = false;
    if (armed) {
      indicator.classList.add('refreshing');
      indicator.classList.remove('ready');
      if (label) label.textContent = t('refreshing');
      setPull(MAX_PULL, true); // settle with the spinner fully visible under the header
      setTimeout(() => location.reload(), 300);
    } else {
      setPull(0, true);
    }
    startY = null;
  }

  headerEl.addEventListener('touchend', endPull);
  headerEl.addEventListener('touchcancel', endPull);
})();




/* ═════ Hooks into the shared core ═════ */
ttOn('syncSettings', set => { syncAlertUi(); refreshInstallUi(); set('remindersToggle', remindersEnabled()); refreshForgetLastLocUi(); });
ttOn('applyLang', () => {
  applyPwaLang(); refreshForgetLastLocUi();
  const gm = document.getElementById('gpsModal');
  if (gm && gm.style.display !== 'none') updateGpsModalText();
});
ttOn('noLocation', () => { showGpsModal(); return true; });
ttOn('afterReport', category => offerAlertsAfterReport(category));
