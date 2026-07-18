/* ══════════════════════════════════════════════════════════════════════════
   TLV WAR — game bridge (v6.0 first slice)
   Wires the new Canvas engine (tlvfight.js + roster.js) into the REAL game's
   existing HUD / audio / effects / round / win-flow systems, WITHOUT touching
   those systems. This file only ever READS globals the game already
   maintains (P1, P2, h1, h2, m1, m2, e1, e2, guard1, gameEnded, mlOpen …) and
   CALLS existing functions (updH, updE, spawnDmg, spawnImpact, spawnRing,
   ann, sfx, vib, log, addC, regenE, hitReact, triggerKODrama, showKO, endG).
   Nothing here re-implements those — see index.html for their definitions.
   ────────────────────────────────────────────────────────────────────────
   CURRENT SCOPE (v6.2):
   • Real physics/movement/hitboxes/energy live for all 6 roster fighters.
   • Screen-level FX + audio wired on every hit (two-layer: whoosh at move
     start, impact on contact — reference-study finding).
   • shake/camPunch/flashH/flashCol stay permanently disabled (Lior's
     standing instruction); body-local hurt-shake on canvas is allowed.
   • CPU AI = the REAL difficulty system (diffP/CPU_PACE/cpuEdge/mercyMode)
     ported from cpuAtk/cpuStep, incl. the once-per-battle cinematic policy.
   • Cinematic ultimates (per-matchup videos) fire on canvas for P1 + CPU
     via fireCineMove → playCine. Charge (D,D,D) is a resolver move with a
     full-body aura. Player combos go through a real input buffer.
   • Still future polish: fighter-body squash/smear/motion-trail.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  let battle = null, resP1 = null, canvasEl = null, cpuTimer = null;
  let inputHooked = false;
  const CANVAS_SAFE_ACS = ['jab', 'kick', 'str', 'hvy', 'c12', 'rsh', 'jsm', 'sw', 'bb', 'dco', 'fin', 'redcard', 'charge'];
  // charge (D,D,D) is a real resolver move since Sprint 8 — startAttack fully
  // supports it (no hitbox, instant energy restore) and it now has its own
  // full-body charging aura, so the player can finally power up like the CPU.

  function canvasBattleActive() { return !!battle && !gameEnded; }
  window.canvasBattleActive = canvasBattleActive;

  function fitCanvas() {
    if (!canvasEl) return;
    const ar = document.getElementById('AR');
    if (!ar) return;
    const w = ar.clientWidth || 380, h = ar.clientHeight || 220;
    canvasEl.width = w; canvasEl.height = h;
    if (battle) {   // keep view + fixed camera scale in sync after a resize/rotate
      battle.view.w = w; battle.view.h = h;
      const C = window.TLVFIGHT.constants;
      battle.cam.scale = (C.FIGHTER_SCREEN_FRAC * h) / C.FIGHTER_H;
    }
  }

  function startCanvasBattle() {
    stopCanvasBattle();
    const ar = document.getElementById('AR_CAM');
    if (ar) ar.classList.add('canvas-mode');
    canvasEl = document.getElementById('CANVAS_STAGE');
    if (!canvasEl || !window.TLVFIGHT || !window.TLV_ROSTER) return;
    fitCanvas();
    const p1cfg = TLV_ROSTER.buildFighter(P1.id);
    const p2cfg = TLV_ROSTER.buildFighter(P2.id);
    p1cfg.hp = m1; p2cfg.hp = m2;
    const T = window.TLVFIGHT;
    // Stage backdrop on the canvas (SF2 layering: background → shadows →
    // fighters). Reuses the SAME bg image initBattle() already picked and set
    // on the DOM layers, so canvas and DOM never disagree about the arena.
    const bgUrl = (() => {
      const el = document.getElementById('BG_MID') || document.getElementById('BG_FAR');
      const m = el && /url\("?([^")]+)"?\)/.exec(el.style.backgroundImage || '');
      return m ? m[1] : null;
    })();
    const bgImg = bgUrl ? T.loadImg(bgUrl) : null;
    function drawStage(ctx, cam, view) {
      if (bgImg && bgImg.complete && bgImg.naturalWidth) {
        // cover the canvas, slide slightly against the camera (parallax ~20%)
        const imgAR = bgImg.naturalWidth / bgImg.naturalHeight;
        const drawH = view.h, drawW = drawH * imgAR;
        const maxShift = Math.max(0, drawW - view.w);
        const stageVis = T.constants.STAGE_W - view.w / cam.scale;
        const t = stageVis > 0 ? cam.x / stageVis : 0.5;
        const off = -clamp01(t) * maxShift * 0.2 - (maxShift * 0.4);
        ctx.drawImage(bgImg, off, 0, drawW, drawH);
        // gentle darkening near the floor so the fighters pop (ref stages do this)
        const g = ctx.createLinearGradient(0, view.h * 0.6, 0, view.h);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)');
        ctx.fillStyle = g; ctx.fillRect(0, view.h * 0.6, view.w, view.h * 0.4);
      }
      // floor line
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(0, view.h * T.constants.FLOOR_SCREEN_FRAC, view.w, 2);
    }
    function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    battle = new T.Battle(canvasEl, {
      p1: 'p1', p2: 'p2',
      fighters: { p1: p1cfg, p2: p2cfg },
      drawStage,
      onHit: onEngineHit,
      onKO: onEngineKO
    });
    battle.f1.energy = e1; battle.f2.energy = e2;
    // comboWindow 1200 = the original game's CTIMEOUT — a ROLLING per-press
    // clock (see MoveResolver). onBufferChange feeds the original's own combo
    // HUD (#CHUD): we mirror the resolver buffer into the global cBuf/ctNow
    // that updChud() already reads, so the player gets the same live hints +
    // countdown bar the DOM game had — zero new UI.
    // cinematic ultimates: initBattle (untouched) already injected the per-
    // matchup cine move (YCINE/ICINE/BCINE/RCINE) into P1.mv/P2.mv — feed the
    // player's one into the resolver so the combo fires it (and the CHUD,
    // which reads P1.mv, hints it automatically). CPU gets its own below.
    const p1Cine = (typeof P1 !== 'undefined' && P1.mv) ? P1.mv.filter(m => m.cine) : [];
    const cpuCine = (typeof P2 !== 'undefined' && P2.mv) ? P2.mv.find(m => m.cine) : null;
    resP1 = new T.MoveResolver(p1cfg.moves.filter(m => CANVAS_SAFE_ACS.indexOf(m.ac) >= 0).concat(p1Cine), {
      comboWindow: 1200, graceMs: 220,
      onBufferChange: function (tokens) {
        try {
          cBuf = tokens.slice();
          ctNow = resP1.comboWindow;
          if (tokens.length) updChud(); else hideChud();
        } catch (e) {}
      }
    });
    const canvasMoves = p2cfg.moves.filter(m => CANVAS_SAFE_ACS.indexOf(m.ac) >= 0);
    const chargeMove = p2cfg.moves.find(m => m.ac === 'charge'); // has no hitbox → safe on canvas even though it's not in CANVAS_SAFE_ACS
    let cpuNextMoveAt = performance.now() + 900;
    const thisMatch = battle; // capture THIS specific instance for the closure below
    const origTick = battle.tick.bind(battle);
    battle.tick = function () {
      // defensive: if a stray rAF/timer from a PRIOR match fires this exact
      // wrapped tick after stopCanvasBattle() already nulled the outer
      // `battle` var (or swapped in a newer match), bail out silently rather
      // than crash — `this` is always the live instance the tick belongs to
      if (battle !== thisMatch || !battle) return;
      const f1 = battle.f1, f2 = battle.f2;
      // (P1 movement/guard/crouch are now set directly by dirDown/dirUp below —
      // no blanket sync here. There used to be one that unconditionally
      // overwrote controls.down/guard from guard1 every tick, which silently
      // clobbered real backward-walk and made holding ▼ never actually guard.)
      if (!canvasBattleActive()) return;
      // input-buffer retry: fire the queued combo the moment recovery ends
      if (queuedMove) {
        if (performance.now() > queuedMove.until) queuedMove = null;
        else if (f1.startAttack(window.TLVFIGHT.ST.SPECIAL, queuedMove.mv)) {
          const qm = queuedMove.mv; queuedMove = null;
          whoosh(qm.ac);
          if (qm.cat === 'basic') { pBasicStreak++; }
          else if (qm.cat === 'medium' || qm.cat === 'special') { pBasicStreak = 0; pVariety = true; }
          cpuEdge = mercyMode ? 0 : Math.min(1, Math.max(0, pBasicStreak - 2) * 0.22);
        }
      }
      try { driveCpu(f1, f2, canvasMoves); } catch (e) { console.error('driveCpu error (recovered):', e); }
      // whiff detection for the combo clock: player's swing ended without
      // touching anyone → shrink the window (original's anti-spam @3152)
      const wasSwinging = isAttackState(f1.state) && !f1.attack?.charge;
      const hadLanded = f1.attackDone;
      origTick();
      if (wasSwinging && !isAttackState(f1.state) && !hadLanded && resP1) resP1.setWindow(900);
      // sync HP/energy back into the game's own globals so the existing HUD/
      // win-flow/tournament/Firebase code (which all read h1/h2/e1/e2) works untouched
      h1 = Math.round(f1.hp); h2 = Math.round(f2.hp);
      e1 = Math.round(f1.energy); e2 = Math.round(f2.energy);
      try { updH(); updE(); } catch (e) {}
    };

    // ── CPU driver: the REAL difficulty system, ported from the original
    // execMove/cpuStep/cpuAtk (index.html) rather than reinvented. Reads the
    // game's own diffP()/CPU_PACE()/mercyMode/diffLvl globals — same numbers
    // Lior already tuned, just applied to canvas hitboxes instead of scripted
    // hits. See the Sprint 3 plan for the exact formula-to-canvas mapping. ──
    function driveCpu(f1, f2, moves) {
      // approach/retreat toward the player when not mid-move
      if (!isAttackState(f2.state)) {
        const gap = f1.x - f2.x;
        f2.controls.right = gap > 90;
        f2.controls.left = gap < -90;
      }
      // ── reactive guard: original formula (busy1?0.40:0.10)*(0.6+0.07L)*(1+1.1*cpuEdge),
      // rolled once per tick while the player is mid-swing; guesses the guard
      // HEIGHT from the player's live attack (h:'high'/'low') the same way a
      // human defender reacts to what they see coming ──
      if (!isAttackState(f2.state)) {
        const dp = diffP();
        const L = Math.min(diffLvl, 6);
        const playerSwinging = isAttackState(f1.state);
        const guardChance = (playerSwinging ? 0.40 : 0.10) * (0.6 + 0.07 * L) * (1 + 1.1 * (typeof cpuEdge !== 'undefined' ? cpuEdge : 0));
        if (playerSwinging && Math.random() < guardChance) {
          f2.controls.guard = true;
          f2.controls.down = f1.attack && f1.attack.h === 'low';
        } else if (!playerSwinging) {
          f2.controls.guard = Math.random() < 0.02;
        }
      }
      const now = performance.now();
      if (now < cpuNextMoveAt || isAttackState(f2.state) || f2.state === T.ST.HURT) return;
      // cinematic ultimate — same policy as the original cpuAtk (@3185):
      // at most once per battle, 30% per decision, never in mercy mode
      if (cpuCine && !cpuCineDone && !mercyMode && f2.energy >= (cpuCine.e || 0) && Math.random() < 0.3) {
        cpuCineDone = true;
        cpuNextMoveAt = now + CPU_PACE();
        fireCineMove(cpuCine, false);
        return;
      }
      const dp = diffP();
      const hpFrac = f2.hp / f2.maxHp;
      const affordable = moves.filter(m => (!m.e || f2.energy >= m.e));
      const specials = affordable.filter(m => m.cat === 'special');
      const mediums = affordable.filter(m => m.cat === 'medium');
      const basics = affordable.filter(m => m.cat === 'basic');
      let mv = null;
      if (f2.energy < 25 && chargeMove) {
        mv = chargeMove;                                                  // low energy → recharge
      } else if (hpFrac < 0.30 && specials.length) {
        mv = specials[Math.floor(Math.random() * specials.length)];       // desperation finisher
      } else if (specials.length && Math.random() < dp.fin) {
        mv = specials[Math.floor(Math.random() * specials.length)];       // scripted finisher chance
      } else if (hpFrac < 0.50 && mediums.length) {
        mv = mediums[Math.floor(Math.random() * mediums.length)];         // pressing advantage — bigger moves
      } else {
        const pool = mediums.concat(basics);
        mv = pool.length ? pool[Math.floor(Math.random() * pool.length)] : (basics[0] || null);
      }
      if (mv) {
        // difficulty damage multiplier layered ON TOP of the character's own
        // tuned dmg (dp.dmg is the SAME multiplier execMove applies at index.html
        // line ~2921) + startup shortened at high difficulty (canvas has real
        // hitbox timing, so "harder to react to" = less startup, translating
        // the original's shrinking diffP().win reactive-guard window)
        const scaled = Object.assign({}, mv, {
          d: mv.d.map(v => Math.max(1, Math.round(v * dp.dmg))),
          startup: Math.max(2, Math.round((mv.startup || 6) * dp.win))
        });
        f2.startAttack(T.ST.SPECIAL, scaled);
      }
      cpuNextMoveAt = now + CPU_PACE();
    }
    battle.start();
    hookInput();
    hookMoveListPause();
    window.__battle = battle; // debug/inspection handle only — not used by game logic
  }
  window.startCanvasBattle = startCanvasBattle;

  function stopCanvasBattle() {
    queuedMove = null;
    if (battle) { battle.stop(); battle = null; }
    const ar = document.getElementById('AR_CAM');
    if (ar) ar.classList.remove('canvas-mode');
  }
  window.stopCanvasBattle = stopCanvasBattle;

  function isAttackState(st) {
    const T = window.TLVFIGHT;
    return [T.ST.LP, T.ST.MP, T.ST.HP, T.ST.LK, T.ST.MK, T.ST.HK, T.ST.SPECIAL].indexOf(st) >= 0;
  }

  // ── hit → existing FX/HUD/audio pipeline ────────────────────────────────
  function onEngineHit(e) {
    const isP1atk = e.attacker === battle.f1;
    const ac = e.ac || e.attacker.lastAc || 'jab'; // projectile hits carry their own ac
    // original combo-clock feel (index.html @3097/@3152): landing a hit
    // stretches the player's next-press window, getting blocked shrinks it
    if (isP1atk && resP1) resP1.setWindow(e.guarded || e.dmg <= 0 ? 900 : 1500);
    // NOTE: ICOL/SFXM are declared `const` at the top level of the main
    // script — that does NOT attach them to `window` in a classic script
    // (only `var`/function declarations do), so `window.ICOL`/`window.SFXM`
    // are always undefined and silently fell through to the fallback color/
    // sound on every hit. Bare identifiers work (same as P1/guard1/diffP
    // elsewhere in this file) since these functions only run after the main
    // script has executed and declared them.
    const col = (typeof ICOL !== 'undefined' && ICOL[ac]) || '#ffcc00';
    try {
      if (e.dmg > 0) {
        window.spawnDmg(e.dmg, !isP1atk, !!e.special && e.weight === 'heavy' && e.dmg > 18, e.weight === 'heavy');
        window.spawnImpact(!isP1atk, ac, false, col, false);
        if (e.weight !== 'light') window.spawnRing(!isP1atk, col, e.special);
      }
      const sfxId = e.guarded ? 'AB' : ((typeof SFXM !== 'undefined' && SFXM[ac]) || 'AP');
      window.sfx(sfxId, e.special ? .9 : .7);
      window.vib(e.special ? [0, 30, 45, 65] : e.weight === 'heavy' ? 28 : 14);
      window.hitReact && window.hitReact(!isP1atk, e.weight);
      if (e.dmg > 0 && !e.guarded) window.addC(isP1atk ? 1 : 2);
      const name = e.moveName || e.attacker.moveName;
      if (name) {
        window.ann(name);
        window.log((isP1atk ? P1.name : P2.name) + ': ' + name + ' [-' + e.dmg + 'HP]', e.special ? 'sp' : (isP1atk ? 'p1' : 'p2'));
      }
    } catch (err) { /* never let an FX hiccup break the match */ }
  }

  // ── cinematic ultimate on canvas: freeze the engine, play the full-screen
  // clip via the game's own playCine (skip/music-duck included), then apply
  // the damage + FX exactly like the original execMove's cine branch
  // (index.html @2878-2906) and hand KO to the engine's normal flow. ──
  let cineActive = false;
  function fireCineMove(mv, isP1) {
    if (cineActive || !battle) return;
    const me = isP1 ? battle.f1 : battle.f2;
    if (mv.e && me.energy < mv.e) {
      if (isP1) { try { window.ann('NOT ENOUGH ENERGY'); } catch (e) {} }
      return;
    }
    cineActive = true;
    me.energy = Math.max(0, me.energy - (mv.e || 0));
    if (isP1) { try { pCineUsed = true; } catch (e) {} } // feeds the 'קולנוען' achievement
    battle.pause();
    window.playCine(mv.vid).then(() => {
      cineActive = false;
      if (!battle) return; // match torn down while the clip played
      const vic = isP1 ? battle.f2 : battle.f1;
      const dmgC = mv.d[0] + Math.floor(Math.random() * (mv.d[1] - mv.d[0] + 1));
      vic.hp = Math.max(0, vic.hp - dmgC);
      h1 = Math.round(battle.f1.hp); h2 = Math.round(battle.f2.hp);
      e1 = Math.round(battle.f1.energy); e2 = Math.round(battle.f2.energy);
      try {
        window.spawnDmg(dmgC, !isP1, true, true);
        window.addC(isP1 ? 1 : 2);
        window.ann(mv.n);
        window.log((isP1 ? P1.name : P2.name) + ': ' + mv.n + ' [-' + dmgC + 'HP] 🎬', 'sp');
        window.updH(); window.updE();
      } catch (e) {}
      battle.resume(); // if the clip KO'd them, the next tick fires onKO → endG
    });
  }

  function onEngineKO(winnerFighter) {
    const playerWon = winnerFighter === battle.f1;
    try {
      document.getElementById(playerWon ? 'F2' : 'F1').classList.add('ko');
      window.triggerKODrama();
      setTimeout(() => {
        window.showKO();
        setTimeout(() => {
          stopCanvasBattle();
          window.endG(playerWon ? P1 : P2, playerWon);
        }, 1300);
      }, 200);
    } catch (err) {}
  }

  // ── input bridge: touch D-pad/face-buttons AND keyboard both already
  // funnel through dirDown()/dirUp()/inp() in index.html — we redirect THOSE
  // (rather than re-binding new listeners) so both input sources stay unified ──
  // Direction semantics on the canvas engine (a REAL physics fighter, unlike
  // the old scripted one, so real backward movement matters — Lior's ask):
  //   R (►): step toward the opponent (unchanged) + combo token.
  //   L (◄): step AWAY from the opponent (retreat) immediately; if held past
  //     GUARD_HOLD_MS without the player attacking, commits to a HIGH guard
  //     (movement stops the instant guard engages — Fighter.update() checks
  //     controls.guard before controls.left/right). Tap-and-release before
  //     the threshold = pure retreat step, no block.
  //   D (▼): crouch immediately + combo token (unchanged); same hold-timer
  //     pattern commits to a LOW guard. This mirrors the original DOM game's
  //     own dHeld/holdT/HOLD_MS tap-vs-hold split (index.html dirDown/dirUp),
  //     just re-targeted at the new Fighter.controls instead of the old
  //     scripted guard1 flag.
  const GUARD_HOLD_MS = 150;
  let realDirDown, realDirUp, realInp;
  let holdTimerL = null, holdTimerD = null;
  function hookInput() {
    if (inputHooked) return;
    inputHooked = true;
    realDirDown = window.dirDown; realDirUp = window.dirUp; realInp = window.inp;
    window.dirDown = function (dir) {
      if (!canvasBattleActive()) return realDirDown(dir);
      if (mlOpen) return; // move list open = game paused, ignore input (original pushBuf behavior)
      const f1 = battle.f1;
      if (dir === 'U') { f1.controls.up = true; return; }
      if (dir === 'L') {
        f1.controls.left = true; guard1 = null; f1.controls.guard = false;
        clearTimeout(holdTimerL);
        holdTimerL = setTimeout(() => { if (f1.controls.left) { guard1 = 'H'; f1.controls.guard = true; f1.controls.left = false; } }, GUARD_HOLD_MS);
        return;
      }
      if (dir === 'R') { f1.controls.right = true; pushTok('R'); return; }
      if (dir === 'D') {
        f1.controls.down = true; pushTok('D');
        clearTimeout(holdTimerD);
        holdTimerD = setTimeout(() => { if (f1.controls.down) { guard1 = 'L'; f1.controls.guard = true; } }, GUARD_HOLD_MS);
        return;
      }
    };
    window.dirUp = function (dir) {
      if (!canvasBattleActive()) return realDirUp(dir);
      const f1 = battle.f1;
      if (dir === 'U') { f1.controls.up = false; return; }
      if (dir === 'L') { clearTimeout(holdTimerL); f1.controls.left = false; if (guard1 === 'H') { guard1 = null; f1.controls.guard = false; } return; }
      if (dir === 'R') { f1.controls.right = false; return; }
      if (dir === 'D') { clearTimeout(holdTimerD); f1.controls.down = false; if (guard1 === 'L') { guard1 = null; f1.controls.guard = false; } return; }
    };
    window.inp = function (btn) {
      if (!canvasBattleActive()) return realInp(btn);
      if (mlOpen) return; // paused behind the move list
      if (btn === 'U' || btn === 'D' || btn === 'L' || btn === 'R') { window.dirDown(btn); return; }
      pushTok(btn);
    };
  }
  function pushTok(tok) {
    if (!resP1) return;
    const mv = resP1.push(tok);
    if (mv) fireP1Move(mv);
  }
  // resolver needs polling too (grace-window pending moves) — piggyback on rAF via battle's own loop
  const _pollPatch = setInterval(() => { if (resP1 && canvasBattleActive()) { const mv = resP1.poll(); if (mv) fireP1Move(mv); } }, 16);

  // ── adaptive toughness (original: index.html "ADAPTIVE TOUGHNESS" block,
  // ~line 2828) — ported verbatim onto the game's own pBasicStreak/pVariety/
  // cpuEdge globals so recordResult()'s scoring bonus keeps working untouched.
  // 3+ basics in a row with no medium/special ramps cpuEdge toward the CPU
  // hitting harder & guarding more (see driveCpu above) — punishes spam. ──
  // ── real fighting-game input buffer (Sprint 8A — THE mobile-specials fix).
  // startAttack silently returns false when the fighter is still inside a
  // previous swing's animation — exactly what happens when you tap a combo
  // quickly after a basic. The old code discarded the resolved move on that
  // false, so the special "swallowed" with zero feedback. Now it queues and
  // retries every tick for up to QUEUE_MS, firing the instant recovery ends.
  const QUEUE_MS = 600;
  let queuedMove = null; // {mv, until}
  function fireP1Move(mv) {
    // energy feedback like the original execMove (index.html @2861): tell the
    // player WHY nothing happened instead of eating the combo silently
    if (mv.e && battle.f1.energy < mv.e) {
      try {
        window.ann('NOT ENOUGH ENERGY');
        window.log(P1.name + ': ⚠ NOT ENOUGH ENERGY for ' + mv.n + ' (need ' + mv.e + '⚡)', 'sy');
      } catch (e) {}
      queuedMove = null;
      return;
    }
    if (mv.cine) { fireCineMove(mv, true); return; }
    if (battle.f1.startAttack(window.TLVFIGHT.ST.SPECIAL, mv)) {
      queuedMove = null;
      if (mv.cat === 'basic') { pBasicStreak++; }
      else if (mv.cat === 'medium' || mv.cat === 'special') { pBasicStreak = 0; pVariety = true; }
      cpuEdge = mercyMode ? 0 : Math.min(1, Math.max(0, pBasicStreak - 2) * 0.22);
      whoosh(mv.ac);
    } else {
      queuedMove = { mv, until: performance.now() + QUEUE_MS };
    }
  }
  // reference finding (SoundHandler research): attacks carry TWO sound layers —
  // a whoosh at move startup + the impact only on contact. We only had the
  // impact layer; the quiet startup whoosh is what gives stills-based hits
  // their anticipation.
  function whoosh(ac) {
    try {
      const id = (typeof SFXM !== 'undefined' && SFXM[ac]) || 'AP';
      window.sfx(id, 0.30);
    } catch (e) {}
  }

  // ── move-list pause: the original tML() (index.html @2477) freezes the DOM
  // systems (round clock, CPU tick, combo buffer) but knows nothing about the
  // canvas loop. Wrap it so opening 📋 MOVES really pauses the engine too.
  // NOTE: this script loads BEFORE the main inline script declares tML, so the
  // wrap must install lazily — hookMoveListPause() is called from
  // startCanvasBattle (by which point tML definitely exists) and no-ops after
  // the first successful install. ──
  let tmlHooked = false;
  function hookMoveListPause() {
    if (tmlHooked) return;
    const realTML = window.tML;
    if (typeof realTML !== 'function') return;
    tmlHooked = true;
    window.tML = function () {
      realTML();
      if (!battle) return;
      if (mlOpen) battle.pause();
      else if (!gameEnded && !cineActive) battle.resume();
    };
  }

  window.addEventListener('resize', fitCanvas);
})();
