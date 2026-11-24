/* TraceTheToxin login.
   Same Supabase project and the same accounts/profiles as TraceTheBreak: anyone already registered there signs in here
   with the same Google / GitHub / OpenStreetMap login. Reporting needs an account; viewing the map does not.

   Loads after app-core.js and mobile-shell.js (uses their globals: sb, T, t, lang, ttOn) and changes nothing in them:
   it wraps reportFabTap() / openReportWizard() so a signed-out visitor gets the login dialog instead of the wizard.
   Needed in the app folder: icons/google.png, icons/github.png, icons/osm.png (copy them from TraceTheBreak). */
(function () {
  'use strict';
  if (typeof sb === 'undefined') { console.error('[auth] Supabase client (sb) is missing - load auth.js after app-core.js'); return; }

  var PROFILES_TABLE = 'profiles';
  var A = window.ttAuth = { session: null, profile: null, ready: false };
  var profileUid = null, usernamePrompted = false, readyResolve;
  var readyP = new Promise(function (r) { readyResolve = r; });

  /* ── strings (the app's own T / t(), en + sr) ── */
  Object.assign(T, {
    authLoginTitle:   { en: 'Sign in to report',        sr: 'Prijavi se da bi prijavio' },
    authLoginMsg:     { en: 'Reporting bad air needs an account. Use the same login as TraceTheBreak.', sr: 'Za prijavu lošeg vazduha potreban je nalog. Koristi isti nalog kao u TraceTheBreak.' },
    authGoogle:       { en: 'Continue with Google',       sr: 'Nastavi sa Google' },
    authGithub:       { en: 'Continue with GitHub',       sr: 'Nastavi sa GitHub' },
    authOsm:          { en: 'Continue with OpenStreetMap', sr: 'Nastavi sa OpenStreetMap' },
    authClose:        { en: 'Close',                      sr: 'Zatvori' },
    authAccountTitle: { en: 'Account',                    sr: 'Nalog' },
    authSignedOutHint:{ en: 'Sign in to submit reports. Your TraceTheBreak account works here too.', sr: 'Prijavi se da bi mogao da šalješ prijave. Nalog iz TraceTheBreak radi i ovde.' },
    authSignedInAs:   { en: 'Signed in as {name}',        sr: 'Prijavljen kao {name}' },
    authSignOut:      { en: 'Sign out',                   sr: 'Odjavi se' },
    authSignOutConfirm:{ en: 'Sign out?',                 sr: 'Odjaviti se?' },
    authUsernameTitle:{ en: 'Choose a username',          sr: 'Izaberi korisničko ime' },
    authUsernameMsg:  { en: 'Choose a public username to finish setting up your account.', sr: 'Izaberi javno korisničko ime da završiš podešavanje naloga.' },
    authUsernamePH:   { en: 'Username',                   sr: 'Korisničko ime' },
    authUsernameSave: { en: 'Save username',              sr: 'Sačuvaj korisničko ime' },
    authUsernameShort:{ en: 'Username must be at least 3 characters.', sr: 'Korisničko ime mora imati bar 3 karaktera.' },
    authUsernameTaken:{ en: 'That username is taken.',    sr: 'To korisničko ime je zauzeto.' },
    authProfanity:    { en: 'That username is not allowed.', sr: 'To korisničko ime nije dozvoljeno.' },
    authSignInFailed: { en: 'Sign-in failed: ',           sr: 'Prijava nije uspela: ' },
    authError:        { en: 'Error: ',                    sr: 'Greška: ' },
    authProfileFailed:{ en: 'Could not load your profile. Check your connection and try again.', sr: 'Profil nije mogao da se učita. Proveri vezu i pokušaj ponovo.' },
    authBanned:       { en: 'This account cannot submit reports.', sr: 'Ovaj nalog ne može da šalje prijave.' }
  });

  /* ── helpers ── */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function describeAuthError(err) {
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    var msg = err.message || err.error_description || err.msg || err.hint || err.details;
    if (msg) return msg + (err.status ? ' (status ' + err.status + ')' : '') + (err.code ? ' [' + err.code + ']' : '');
    return 'Unknown error (check Supabase Dashboard > Logs > Auth Logs)';
  }

  var CYR = {
    'А':'A','Б':'B','В':'V','Г':'G','Д':'D','Ђ':'Đ','Е':'E','Ж':'Ž','З':'Z','И':'I','Ј':'J','К':'K','Л':'L','Љ':'Lj','М':'M','Н':'N','Њ':'Nj','О':'O','П':'P','Р':'R','С':'S','Т':'T','Ћ':'Ć','У':'U','Ф':'F','Х':'H','Ц':'C','Ч':'Č','Џ':'Dž','Ш':'Š',
    'а':'a','б':'b','в':'v','г':'g','д':'d','ђ':'đ','е':'e','ж':'ž','з':'z','и':'i','ј':'j','к':'k','л':'l','љ':'lj','м':'m','н':'n','њ':'nj','о':'o','п':'p','р':'r','с':'s','т':'t','ћ':'ć','у':'u','ф':'f','х':'h','ц':'c','ч':'č','џ':'dž','ш':'š'
  };
  function cyrillicToLatin(str) { return String(str || '').replace(/[А-Яа-яЂђЈјЉљЊњЋћЏџ]/g, function (ch) { return CYR[ch] != null ? CYR[ch] : ch; }); }
  var BLOCKED = ['fuck','shit','bitch','asshole','bastard','cunt','dick','pussy','faggot','nigger','whore','slut',
    'jebem','jebo','jebote','picka','pizda','kurac','kurca','govno','djubre','dzukela','peder','kurvo','kurva','seronja','budalo','idiote','glupane','majmune','svinjo'];
  function isProfane(str) {
    var n = cyrillicToLatin(str).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
      .replace(/[^a-z]/g, ' ').replace(/(.)\1{2,}/g, '$1$1');
    return BLOCKED.some(function (w) { return n.indexOf(w) !== -1; });
  }

  /* ── sign in / out (same flow as TraceTheBreak) ── */
  // The address Supabase must send the user back to. It has to be in Supabase > Authentication > URL Configuration > Redirect URLs,
  // otherwise Supabase silently falls back to the project's Site URL (TraceTheBreak). "index.html" is cut off so that opening
  // .../index.html and .../ give the same address; query and hash are never part of it.
  function appUrl() { return window.location.origin + window.location.pathname.replace(/index\.html$/, ''); }
  async function signInWithProvider(provider) {
    try {
      var inWrappedApp = navigator.userAgent.indexOf('TraceTheStuffApp') !== -1;
      var redirectTo = inWrappedApp ? 'tracehub://auth-callback' : appUrl();
      console.info('[auth] signing in with', provider, '- redirectTo =', redirectTo);
      var r = await sb.auth.signInWithOAuth({ provider: provider, options: { redirectTo: redirectTo } });
      if (r.error) throw r.error;
    } catch (err) {
      console.error('OAuth sign-in error:', err);
      alert(t('authSignInFailed') + describeAuthError(err));
    }
  }
  function signInWithOsm() {
    var cleanUrl = appUrl();
    console.info('[auth] signing in with OpenStreetMap - redirectTo =', cleanUrl);
    window.location.href = SUPABASE_URL + '/functions/v1/osm-login?redirect_to=' + encodeURIComponent(cleanUrl);
  }
  async function signOutUser() {
    if (!confirm(t('authSignOutConfirm'))) return;
    try {
      var r = await sb.auth.signOut();
      if (r.error) throw r.error;
    } catch (err) {
      console.error('Sign out failed:', err);
      alert(t('authError') + describeAuthError(err));
      return;
    }
    A.session = null; A.profile = null; profileUid = null; usernamePrompted = false;
    hideUsername(); render();
  }

  /* ── profile (same RPC and table as TraceTheBreak) ── */
  async function loadProfile() {
    if (!A.session) return null;
    try {
      var r = await sb.rpc('get_my_profile').maybeSingle();
      if (r.error) throw r.error;
      if (r.data) {
        A.profile = r.data;
      } else {
        var meta = A.session.user.user_metadata || {};
        var ins = await sb.from(PROFILES_TABLE).insert({
          id: A.session.user.id,
          username: null,
          avatar_url: meta.avatar_url || null,
          provider: (A.session.user.app_metadata && A.session.user.app_metadata.provider) || 'unknown'
        });
        if (ins.error) throw ins.error;
        var again = await sb.rpc('get_my_profile').maybeSingle();
        if (again.error) throw again.error;
        A.profile = again.data;
      }
      profileUid = A.session.user.id;
      // heartbeat for the dormancy job; also reactivates a dormant account on login. Fire-and-forget.
      sb.rpc('touch_last_active').then(function (x) {
        if (x && x.data && x.data.reactivated && A.profile) A.profile.account_status = 'active';
      }, function () {});
    } catch (err) {
      console.error('Failed to load profile:', err && err.message || err);
      A.profile = null;
    }
    return A.profile;
  }

  async function submitUsername() {
    var input = $('ttUsernameInput');
    var username = cyrillicToLatin((input.value || '').trim());
    if (username.length < 3) { alert(t('authUsernameShort')); return; }
    if (isProfane(username)) { alert(t('authProfanity')); return; }
    if (!A.session) return;
    var btn = $('ttUsernameSave'); btn.disabled = true;
    try {
      var r = await sb.from(PROFILES_TABLE).update({ username: username }).eq('id', A.session.user.id);
      if (r.error) throw r.error;
      input.value = '';
      await loadProfile();
      hideUsername(); render();
    } catch (err) {
      console.error('Username save error:', err);
      alert(err && err.code === '23505' ? t('authUsernameTaken') : t('authError') + describeAuthError(err));
    } finally { btn.disabled = false; }
  }

  /* ── UI: login dialog, username dialog, Settings > Account ── */
  var CSS = '.tt-oauth-stack{display:flex;flex-direction:column;gap:8px;margin:12px 0 4px}' +
    '.tt-oauth-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:42px;border-radius:var(--radius-sm,8px);' +
    'border:1px solid var(--border-color-strong);background:var(--bg-surface);color:var(--text-primary);font-size:var(--fs-13,13px);' +
    'font-weight:var(--fw-semibold,600);cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}' +
    '.tt-oauth-btn:active{background:var(--border-color-strong)}' +
    '.tt-oauth-btn img{width:18px;height:18px;flex-shrink:0}' +
    '.tt-oauth-google img,.tt-oauth-osm img{filter:var(--icon-tint-filter)}' +
    '.tt-oauth-github{background:#171515;color:#fff;border-color:#171515}' +
    'html[data-theme="dark"] .tt-oauth-github{background:var(--bg-surface-alt);border-color:var(--border-color-strong)}' +
    '.tt-oauth-github img{filter:brightness(0) invert(1)}' +
    '.tt-acc-line{font-size:var(--fs-13,13px);color:var(--text-secondary);margin:0 0 10px;line-height:1.4}' +
    '#ttUsernameInput{width:100%;box-sizing:border-box;height:42px;margin:12px 0 10px;padding:0 12px;border-radius:var(--radius-sm,8px);' +
    'border:1px solid var(--border-color-strong);background:var(--bg-surface-alt);color:var(--text-primary);font-size:16px}';

  function oauthButtonsHtml() {
    function b(p, cls, icon, key) {
      return '<button type="button" class="tt-oauth-btn ' + cls + '" data-tt-auth="' + p + '">' +
        '<img src="icons/' + icon + '" alt="" onerror="this.style.display=\'none\'"><span>' + esc(t(key)) + '</span></button>';
    }
    return b('google', 'tt-oauth-google', 'google.png', 'authGoogle') +
           b('github', 'tt-oauth-github', 'github.png', 'authGithub') +
           b('osm', 'tt-oauth-osm', 'osm.png', 'authOsm');
  }

  function ensureDom() {
    if ($('ttLoginModal')) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

    var login = document.createElement('div');
    login.id = 'ttLoginModal'; login.className = 'generic-modal-overlay'; login.style.display = 'none';
    login.innerHTML = '<div class="generic-modal" style="max-width:380px">' +
      '<h2 id="ttLoginTitle" style="margin-top:6px"></h2><p id="ttLoginMsg"></p>' +
      '<div class="tt-oauth-stack" id="ttLoginButtons"></div>' +
      '<button type="button" class="generic-modal-close" id="ttLoginClose" style="margin-top:10px"></button></div>';
    document.body.appendChild(login);

    var un = document.createElement('div');
    un.id = 'ttUsernameModal'; un.className = 'generic-modal-overlay'; un.style.display = 'none';
    un.innerHTML = '<div class="generic-modal" style="max-width:380px">' +
      '<h2 id="ttUsernameTitle" style="margin-top:6px"></h2><p id="ttUsernameMsg"></p>' +
      '<input type="text" id="ttUsernameInput" autocomplete="off" autocapitalize="off" maxlength="30">' +
      '<button type="button" class="settings-btn" id="ttUsernameSave" style="width:100%;justify-content:center"></button>' +
      '<button type="button" class="generic-modal-close" id="ttUsernameClose" style="margin-top:10px"></button></div>';
    document.body.appendChild(un);

    var body = document.querySelector('#settingsModal .fullscreen-modal-body');
    if (body) {
      var sec = document.createElement('div');
      sec.className = 'detail-section'; sec.id = 'ttAccountSection';
      sec.innerHTML = '<div class="detail-section-title" id="ttAccountTitle"></div><div id="ttAccountBody"></div>';
      body.insertBefore(sec, body.firstChild);
    }

    $('ttLoginClose').onclick = hideLogin;
    $('ttUsernameClose').onclick = hideUsername;
    $('ttUsernameSave').onclick = submitUsername;
    $('ttUsernameInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submitUsername(); } });
    [login, un].forEach(function (o) { o.addEventListener('click', function (e) { if (e.target === o) o.style.display = 'none'; }); });

    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-tt-auth]');
      if (a) { var p = a.getAttribute('data-tt-auth'); if (p === 'osm') signInWithOsm(); else signInWithProvider(p); return; }
      if (e.target.closest && e.target.closest('[data-tt-signout]')) { signOutUser(); return; }
      if (e.target.closest && e.target.closest('[data-tt-username]')) { showUsername(); }
    });
  }

  function showLogin()    { ensureDom(); render(); $('ttLoginModal').style.display = 'flex'; }
  function hideLogin()    { var m = $('ttLoginModal'); if (m) m.style.display = 'none'; }
  function showUsername() { ensureDom(); render(); $('ttUsernameModal').style.display = 'flex'; setTimeout(function () { $('ttUsernameInput').focus(); }, 50); }
  function hideUsername() { var m = $('ttUsernameModal'); if (m) m.style.display = 'none'; }

  function render() {
    ensureDom();
    $('ttLoginTitle').textContent = t('authLoginTitle');
    $('ttLoginMsg').textContent = t('authLoginMsg');
    $('ttLoginButtons').innerHTML = oauthButtonsHtml();
    $('ttLoginClose').textContent = t('authClose');
    $('ttUsernameTitle').textContent = t('authUsernameTitle');
    $('ttUsernameMsg').textContent = t('authUsernameMsg');
    $('ttUsernameInput').placeholder = t('authUsernamePH');
    $('ttUsernameSave').textContent = t('authUsernameSave');
    $('ttUsernameClose').textContent = t('authClose');
    if (A.session) hideLogin();
    refreshFab();

    var title = $('ttAccountTitle'), body = $('ttAccountBody');
    if (title) title.textContent = t('authAccountTitle');
    if (!body) return;
    if (A.session && A.profile && A.profile.username) {
      body.innerHTML = '<p class="tt-acc-line">' + esc(t('authSignedInAs').replace('{name}', A.profile.username)) + '</p>' +
        '<button type="button" class="settings-btn" data-tt-signout style="width:100%;justify-content:center">' + esc(t('authSignOut')) + '</button>';
    } else if (A.session) {
      body.innerHTML = '<p class="tt-acc-line">' + esc(t('authUsernameMsg')) + '</p>' +
        '<button type="button" class="settings-btn" data-tt-username style="width:100%;justify-content:center">' + esc(t('authUsernameTitle')) + '</button>';
    } else {
      body.innerHTML = '<p class="tt-acc-line">' + esc(t('authSignedOutHint')) + '</p><div class="tt-oauth-stack">' + oauthButtonsHtml() + '</div>';
    }
  }

  // The report button is disabled until a location exists; for a visitor who is not signed in it must stay tappable, because
  // tapping it is what opens the login dialog.
  function keepFabTappable() {
    var fab = $('reportFabBtn'); if (!fab) return;
    if (!A.session || !A.profile || !A.profile.username) { fab.disabled = false; fab.title = t(A.session ? 'authUsernameTitle' : 'authLoginTitle'); }
  }
  var origCheckFormReady = window.checkFormReady;
  if (typeof origCheckFormReady === 'function') {
    window.checkFormReady = function () { var out = origCheckFormReady.apply(this, arguments); keepFabTappable(); return out; };
  }
  function refreshFab() { try { if (typeof window.checkFormReady === 'function') window.checkFormReady(); } catch (e) {} }

  // A brand-new account has no username yet: ask for it once right after sign-in.
  function maybePromptUsername() {
    if (A.session && A.profile && !A.profile.username && !usernamePrompted) { usernamePrompted = true; showUsername(); }
  }

  /* ── gate: reporting needs a signed-in account with a username ── */
  async function gate() {
    if (!A.ready) await readyP;
    if (!A.session) { showLogin(); return false; }
    if (!A.profile) await loadProfile();
    if (!A.profile) { alert(t('authProfileFailed')); return false; }
    if (A.profile.is_banned === true) { alert(t('authBanned')); return false; }
    if (!A.profile.username) { showUsername(); return false; }
    return true;
  }
  var origFabTap = window.reportFabTap, origOpenWizard = window.openReportWizard;
  if (typeof origFabTap === 'function') {
    window.reportFabTap = async function () { if (await gate()) return origFabTap.apply(this, arguments); };
  }
  if (typeof origOpenWizard === 'function') {
    window.openReportWizard = function () {
      var self = this, args = arguments;
      if (A.ready && A.session && A.profile && A.profile.username && A.profile.is_banned !== true) return origOpenWizard.apply(self, args);
      gate().then(function (ok) { if (ok) origOpenWizard.apply(self, args); });
    };
  }

  /* ── init ── */
  function stripAuthHash() {
    if (!window.location.hash || !/access_token=|refresh_token=/.test(window.location.hash)) return;
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  async function init() {
    try {
      var r = await sb.auth.getSession();
      if (r.error) throw r.error;
      A.session = r.data.session;
      if (A.session) await loadProfile();
    } catch (err) {
      console.error('Failed to restore session:', err && err.message || err);
      A.session = null; A.profile = null;
    }
    A.ready = true; readyResolve();
    stripAuthHash(); render(); maybePromptUsername();

    sb.auth.onAuthStateChange(function (event, session) {
      A.session = session;
      if (!session) { A.profile = null; profileUid = null; hideUsername(); render(); return; }
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') return;
      // never await Supabase calls inside this callback (supabase-js can deadlock): defer them
      setTimeout(async function () {
        if (profileUid !== session.user.id || event === 'USER_UPDATED') await loadProfile();
        stripAuthHash(); render(); maybePromptUsername();
      }, 0);
    });
  }

  // keep the Account section in step with the language switch
  if (typeof ttOn === 'function') ttOn('applyLang', function () { if ($('ttLoginModal')) render(); });

  A.redirectUrl = appUrl;   // ttAuth.redirectUrl() in the console shows the exact address that must be in the Redirect URLs list
  window.ttAuthShowLogin = showLogin;
  ensureDom();
  render();
  init();
})();
