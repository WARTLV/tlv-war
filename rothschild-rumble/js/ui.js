/* ══════════════════════════════════════════════════════════════════════════
   ROTHSCHILD RUMBLE — DOM shell: screens, touch controls, HUD, pause/
   defeat/results overlays. The canvas (engine.js/world.js) owns combat;
   everything here is presentation + input, wired to callbacks main.js
   supplies. Per TECHNICAL-CONTRACT.md: all inputs reset on pointerup/
   pointercancel/blur/visibilitychange; every hit target ≥56×56px.
   ══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  const state = {
    handlers: {},
    stickPointerId: null,
    stick: { x: 0, y: 0 },
    reduceMotion: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    leftHanded: localStorage.getItem('rr_lefty') === '1'
  };

  function setPressed(btn, pressed) {
    btn.classList.toggle('is-pressed', pressed);
    btn.setAttribute('aria-pressed', String(pressed));
  }

  function vibrate(ms) {
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
  }

  // ── screens ────────────────────────────────────────────────────────────
  function showScreen(id) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    const el = $('#' + id);
    if (el) el.classList.add('active');
  }

  // ── toast / announce ──────────────────────────────────────────────────
  let toastTimer = null;
  function toast(text, cls) {
    const m = $('#message');
    if (!m) return;
    m.textContent = text;
    m.className = 'show' + (cls ? ' ' + cls : '');
    void m.offsetWidth;
    m.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => m.classList.remove('show'), 1800);
  }
  // dir: -1 = bike travels right→left (i.e. enters from the RIGHT edge),
  // +1 = left→right (enters from the LEFT edge) — the lane itself now
  // varies too (see world.js Campaign._spawnCourier), so the arrow +
  // position are the only fixed cues; the in-canvas lane stripe carries
  // the rest (see drawStage's courier telegraph block).
  function courierWarn(dir) {
    const w = $('#courierWarning');
    w.textContent = dir < 0 ? 'שליח! ←' : '→ !שליח';
    w.classList.remove('show', 'from-left', 'from-right');
    void w.offsetWidth;
    w.classList.add('show', dir < 0 ? 'from-right' : 'from-left');
    setTimeout(() => w.classList.remove('show'), 1000);
  }

  // ── HUD ────────────────────────────────────────────────────────────────
  let _lastComboCount = 0; // v10: only replay the pop animation on an actual increment, not every setHUD tick
  function setHUD(d) {
    if (d.heroName != null) $('#heroName').textContent = d.heroName;
    if (d.heroHpPct != null) {
      $('#heroHpBar').style.width = clamp01(d.heroHpPct) + '%';
      $('#heroHpBar').parentElement.setAttribute('aria-valuenow', Math.round(d.heroHpPct));
    }
    if (d.heroEnergyPct != null) {
      $('#heroEnergyBar').style.width = clamp01(d.heroEnergyPct) + '%';
      $('#btnSpecial').classList.toggle('ready', d.heroEnergyPct >= 55);
      $('#btnSpecial').setAttribute('aria-disabled', String(d.heroEnergyPct < 55));
    }
    if (d.districtName != null) $('#areaName').textContent = d.districtName;
    if (d.routePct != null) {
      $('#routeBar').style.width = clamp01(d.routePct) + '%';
      $('#routeBar').parentElement.setAttribute('aria-valuenow', Math.round(d.routePct));
    }
    if (d.gateLabel != null) $('#gateLabel').textContent = d.gateLabel;
    if (d.bossName !== undefined) {
      const wrap = $('#bossHealth');
      if (d.bossName) {
        wrap.classList.add('show');
        $('#bossName').textContent = d.bossName;
      } else wrap.classList.remove('show');
    }
    if (d.bossHpPct != null) {
      $('#bossHpBar').style.width = clamp01(d.bossHpPct) + '%';
      $('#bossHpBar').parentElement.setAttribute('aria-valuenow', Math.round(d.bossHpPct));
    }
    if (d.allyName !== undefined) {
      const wrap = $('#allyHealth');
      if (d.allyName) {
        wrap.classList.add('show');
        $('#allyName').textContent = d.allyName;
      } else wrap.classList.remove('show');
    }
    if (d.allyHpPct != null) {
      $('#allyHpBar').style.width = clamp01(d.allyHpPct) + '%';
      $('#allyHpBar').parentElement.setAttribute('aria-valuenow', Math.round(d.allyHpPct));
    }
    // v10: combo counter — see css/main.css's #comboPop comment for why this
    // exists at all. `comboCount` is Actor.comboCount, already reset to 0 by
    // the engine itself once the combo window lapses (engine.js update()),
    // so this function never needs its own timeout logic.
    if (d.comboCount != null) {
      const el = $('#comboPop');
      if (d.comboCount >= 2) {
        el.textContent = 'קומבו ×' + d.comboCount;
        el.classList.add('show');
        if (d.comboCount !== _lastComboCount) {
          el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
        }
      } else {
        el.classList.remove('show');
      }
      _lastComboCount = d.comboCount;
    }
  }
  function clamp01(v) { return Math.max(0, Math.min(100, v)); }

  // ── overlays ───────────────────────────────────────────────────────────
  function showPause() { $('#pauseOverlay').classList.add('show'); }
  function hidePause() { $('#pauseOverlay').classList.remove('show'); }
  function showDefeat() { $('#defeatOverlay').classList.add('show'); }
  function hideDefeat() { $('#defeatOverlay').classList.remove('show'); }
  function showResults(heroName) {
    $('#resultsText').textContent = `${heroName} כבש/ה את שדרת רוטשילד מקצה לקצה — כל הבריונים והבוסים הובסו!`;
    $('#resultsOverlay').classList.add('show');
  }
  function hideResults() { $('#resultsOverlay').classList.remove('show'); }

  // ── virtual movement stick ────────────────────────────────────────────
  function initStick() {
    const zone = $('#stickZone'), knob = $('#stickKnob');
    const R = 42;
    function move(clientX, clientY) {
      const rect = zone.getBoundingClientRect();
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      let dx = clientX - cx, dy = clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      state.stick.x = dx / R; state.stick.y = dy / R;
      if (state.handlers.onStick) state.handlers.onStick(state.stick.x, state.stick.y);
    }
    function reset() {
      knob.style.transform = 'translate(0,0)';
      state.stick.x = 0; state.stick.y = 0;
      if (state.handlers.onStick) state.handlers.onStick(0, 0);
    }
    zone.addEventListener('pointerdown', e => {
      e.preventDefault(); zone.setPointerCapture(e.pointerId);
      state.stickPointerId = e.pointerId; move(e.clientX, e.clientY);
    });
    zone.addEventListener('pointermove', e => {
      if (e.pointerId !== state.stickPointerId) return;
      move(e.clientX, e.clientY);
    });
    const end = e => { if (e.pointerId !== state.stickPointerId) return; state.stickPointerId = null; reset(); };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    zone.addEventListener('pointerleave', end);
  }

  function bindTap(id, fn) {
    const b = $(id);
    if (!b) return;
    b.addEventListener('pointerdown', e => { e.preventDefault(); setPressed(b, true); fn(); vibrate(12); });
    const off = e => setPressed(b, false);
    b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  }
  function bindHold(id, onDown, onUp) {
    const b = $(id);
    if (!b) return;
    b.addEventListener('pointerdown', e => { e.preventDefault(); setPressed(b, true); onDown(); });
    const off = e => { setPressed(b, false); onUp(); };
    b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  }

  function resetAllInputs() {
    state.stickPointerId = null; state.stick.x = 0; state.stick.y = 0;
    const knob = $('#stickKnob'); if (knob) knob.style.transform = 'translate(0,0)';
    $$('.controls .is-pressed').forEach(b => setPressed(b, false));
    if (state.handlers.onStick) state.handlers.onStick(0, 0);
    if (state.handlers.onGuard) state.handlers.onGuard(false);
    if (state.handlers.onResetInputs) state.handlers.onResetInputs();
  }

  function initKeyboard() {
    const down = {};
    addEventListener('keydown', e => {
      if (down[e.code]) return;
      down[e.code] = true;
      const h = state.handlers;
      if (e.code === 'ArrowLeft') h.onStick && h.onStick(-1, state.stick.y);
      if (e.code === 'ArrowRight') h.onStick && h.onStick(1, state.stick.y);
      if (e.code === 'ArrowUp') h.onStick && h.onStick(state.stick.x, -1);
      if (e.code === 'ArrowDown') h.onStick && h.onStick(state.stick.x, 1);
      if (e.code === 'KeyZ' || e.code === 'Space') h.onPunch && h.onPunch();
      if (e.code === 'KeyX') h.onKick && h.onKick();
      if (e.code === 'KeyC') h.onUppercut && h.onUppercut();
      if (e.code === 'KeyV') h.onSpecial && h.onSpecial();
      if (e.code === 'KeyJ') h.onJump && h.onJump();
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') h.onGuard && h.onGuard(true);
      if (e.code === 'Escape') h.onPauseToggle && h.onPauseToggle();
    });
    addEventListener('keyup', e => {
      down[e.code] = false;
      const h = state.handlers;
      let x = (down.ArrowRight ? 1 : 0) - (down.ArrowLeft ? 1 : 0);
      let y = (down.ArrowDown ? 1 : 0) - (down.ArrowUp ? 1 : 0);
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.code) >= 0) h.onStick && h.onStick(x, y);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') h.onGuard && h.onGuard(false);
    });
  }

  // ── orientation fallback ───────────────────────────────────────────────
  // The CSS `@media (orientation: portrait)` gate normally handles this, but
  // some mobile browsers misreport orientation while the URL bar is
  // showing/hiding and resizing the viewport mid-transition. Mirror the same
  // check in JS on resize so the gate is reliable everywhere.
  function initOrientationGuard() {
    function sync() {
      const portrait = window.innerHeight > window.innerWidth;
      document.body.classList.toggle('is-portrait', portrait);
    }
    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
  }

  function init(handlers) {
    state.handlers = handlers || {};
    initStick();
    initKeyboard();
    initOrientationGuard();
    bindTap('#btnPunch', () => state.handlers.onPunch && state.handlers.onPunch());
    bindTap('#btnKick', () => state.handlers.onKick && state.handlers.onKick());
    bindTap('#btnUppercut', () => state.handlers.onUppercut && state.handlers.onUppercut());
    bindTap('#btnJump', () => state.handlers.onJump && state.handlers.onJump());
    bindTap('#btnSpecial', () => state.handlers.onSpecial && state.handlers.onSpecial());
    bindHold('#btnGuard', () => state.handlers.onGuard && state.handlers.onGuard(true), () => state.handlers.onGuard && state.handlers.onGuard(false));
    $('#btnPause').addEventListener('click', () => state.handlers.onPauseToggle && state.handlers.onPauseToggle());
    $('#pauseResume').addEventListener('click', () => state.handlers.onResume && state.handlers.onResume());
    $('#pauseQuit').addEventListener('click', () => state.handlers.onQuitToSelect && state.handlers.onQuitToSelect());
    $('#pauseLefty').addEventListener('click', toggleLefty);
    $('#defeatRetry').addEventListener('click', () => state.handlers.onRetry && state.handlers.onRetry());
    $('#defeatQuit').addEventListener('click', () => state.handlers.onQuitToSelect && state.handlers.onQuitToSelect());
    $('#resultsAgain').addEventListener('click', () => state.handlers.onQuitToSelect && state.handlers.onQuitToSelect());
    $('#start').addEventListener('click', () => {
      // first real user gesture in the session — required before any Audio
      // element may legally .play() under mobile autoplay policy
      if (root.RRAUDIO) { root.RRAUDIO.unlock(); root.RRAUDIO.playMenuMusic(); }
      showScreen('select');
    });
    $('#fightBtn').addEventListener('click', () => state.handlers.onFightStart && state.handlers.onFightStart());

    addEventListener('pointerup', resetAllInputs);
    addEventListener('blur', resetAllInputs);
    document.addEventListener('visibilitychange', () => document.hidden && (resetAllInputs(), state.handlers.onAutoPause && state.handlers.onAutoPause()));

    applyLefty();
  }

  function toggleLefty() {
    state.leftHanded = !state.leftHanded;
    localStorage.setItem('rr_lefty', state.leftHanded ? '1' : '0');
    applyLefty();
  }
  function applyLefty() {
    document.body.classList.toggle('lefty', state.leftHanded);
    const btn = $('#pauseLefty');
    if (btn) btn.textContent = state.leftHanded ? 'החלף לימני' : 'החלף לשמאלי';
  }

  // v3: the select screen is a single-hero showcase, not a picker (only
  // BIG.COM is playable — see ROSTER.PLAYABLE_ORDER) — so this just
  // populates the static markup in index.html (#select) with real data,
  // the same "static shell + JS fills values" pattern as setHUD above,
  // rather than building interactive card DOM from scratch.
  function renderSelect(d) {
    $('#panelName').textContent = d.name;
    $('#heroStageName').textContent = d.name;
    if (d.role) $('#panelRole').textContent = d.role;
    $('#statAtk').style.width = d.atkPct + '%';
    $('#statAtkV').textContent = d.atkLabel;
    $('#statDef').style.width = d.defPct + '%';
    $('#statDefV').textContent = d.defLabel;
    $('#statSpd').style.width = d.spdPct + '%';
    $('#statSpdV').textContent = d.spdLabel;
    if (d.specialName) $('#panelTrait').innerHTML = '⚡ <b>מהלך מיוחד:</b> ' + d.specialName;
  }

  // v11: boss-intro card (CODEX-ART-BRIEF-v7.md P2 boss-card portraits) —
  // same toast idiom as toast() above (show class + auto-hide timer, forced
  // reflow so a second boss-start while one is still fading restarts the
  // animation instead of no-opping). `portraits` is an array of {src, name}
  // so a paired-boss gate (chapters 4-6 — see world.js/roster.js BOSS_ORDER)
  // shows every portrait, not just the first.
  let bossCardTimer = null;
  function bossCard(portraits) {
    const card = $('#bossCard'), wrap = $('#bossCardPortraits'), nameEl = $('#bossCardName');
    if (!card || !portraits || !portraits.length) return;
    wrap.innerHTML = '';
    portraits.forEach(p => {
      const img = document.createElement('img');
      img.src = p.src; img.alt = p.name;
      wrap.appendChild(img);
    });
    nameEl.textContent = portraits.map(p => p.name).join(' + ');
    card.classList.remove('show');
    void card.offsetWidth;
    card.classList.add('show');
    clearTimeout(bossCardTimer);
    bossCardTimer = setTimeout(() => card.classList.remove('show'), 2400);
  }

  root.UI = {
    showScreen, toast, courierWarn, setHUD, bossCard,
    showPause, hidePause, showDefeat, hideDefeat, showResults, hideResults,
    init, resetAllInputs, renderSelect, state
  };
})(typeof window !== 'undefined' ? window : this);
