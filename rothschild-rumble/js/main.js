/* ══════════════════════════════════════════════════════════════════════════
   ROTHSCHILD RUMBLE — boot & wiring. Connects UI (screens/controls/HUD) to
   the World/Campaign (canvas combat). One World instance lives for the
   whole page; each run rebuilds the hero + campaign onto it.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const RUMBLE = window.RUMBLE, ROSTER = window.ROSTER, WORLDNS = window.WORLD, UI = window.UI, AUDIO = window.RRAUDIO;

  let campaign = null;
  let selectedFighterId = ROSTER.PLAYABLE_ORDER[0];
  let lastHeroId = selectedFighterId;
  let isPaused = false;
  let hudTick = 0;

  const canvas = document.getElementById('stage');
  const world = new RUMBLE.World(canvas, {
    worldW: WORLDNS.WORLD_W,
    onHit: function (e) {
      if (e.attacker === world.hero) {
        if (AUDIO) AUDIO.sfxAttack(e.attacker.state, e.guarded);
        // weapon durability: each LANDED swing costs one use (not each
        // attempt) — matches how a real crowbar wears down from actually
        // hitting something, not from swinging at air.
        if (e.attacker.weapon && e.attacker.state === 'weapon_swing') {
          e.attacker.weapon.uses--;
          if (e.attacker.weapon.uses <= 0) {
            e.attacker.weapon = null;
            if (campaign && campaign.callbacks.onWeaponBreak) campaign.callbacks.onWeaponBreak();
          }
        }
      } else if (e.victim === world.hero) {
        if (AUDIO) AUDIO.sfxHurt();
      }
    },
    onEnemyDown: function () {},
    // FRISBEE falling doesn't end the run — BIG.COM keeps going alone (Lior:
    // "אם הוא נפגע מספיק פעמים הוא נופל וביג.קום ממשיך ללכת") — but pre-v3
    // this was completely silent (onAllyDown existed in engine.js as a
    // no-op default and was never overridden here), so a player could lose
    // their ally without any feedback at all.
    onAllyDown: function (a) { UI.toast(a.def.name + ' נפל/ה — ביג.קום ממשיך לבד!'); if (AUDIO) AUDIO.sfxHurt(); },
    onHeroDown: handleHeroDown,
    drawStage: function (ctx, cam, view, w) { if (campaign) WORLDNS.drawStage(ctx, cam, view, w, campaign); },
    tickHook: function () {
      if (!campaign) return;
      campaign.tick();
      hudTick++;
      if (hudTick % 3 === 0) syncHud();
    }
  });

  function collectSrcs(def) {
    const out = [];
    Object.keys(def.poses).forEach(k => {
      const p = def.poses[k];
      if (typeof p === 'string') out.push(p);
      else if (p && p.frames) out.push.apply(out, p.frames);
    });
    Object.keys(def.moves).forEach(k => { if (def.moves[k].frames) out.push.apply(out, def.moves[k].frames); });
    return out;
  }
  function preloadForRun(heroId) {
    let list = collectSrcs(ROSTER.buildFighter(heroId)).concat(collectSrcs(ROSTER.buildGrunt()));
    // v11: resolveBossLineup now returns one ARRAY of ids per chapter (some
    // chapters pair 2-3 bosses in one gate) — flatten before preloading.
    ROSTER.resolveBossLineup(heroId).flat().forEach(bid => { list = list.concat(collectSrcs(ROSTER.buildFighter(bid))); });
    // FRISBEE is no longer a boss (v2: crate-ally) so resolveBossLineup won't
    // pull its frames in — preload them explicitly so the crate-break moment
    // never has to lazy-load the ally's art mid-fight.
    list = list.concat(collectSrcs(ROSTER.buildFighter('frisbee')));
    list.push('assets/courier/blue-courier.png', 'assets/street-enemy/street-enemy-idle.png', 'assets/street-enemy/street-enemy-punch.png');
    RUMBLE.preload(list);
  }

  function startRun(heroId) {
    lastHeroId = heroId;
    preloadForRun(heroId);
    const heroDef = ROSTER.buildFighter(heroId);
    const hero = new RUMBLE.Actor(heroDef, 200, 0.55, RUMBLE.DIR.RIGHT, 'hero');
    world.enemies = []; world.allies = []; world.fx = []; world.cam.x = 0; world.cam._init = false; world.hitstop = 0;
    dashEdge.left.releasedAt = -9999; dashEdge.right.releasedAt = -9999;
    world.setHero(hero);
    // courier draw is now depth-sorted into World.draw via world.hazards ===
    // campaign.couriers (same array reference, mutated in place) — Campaign's
    // constructor wires that up; no separate hazard object needed here.
    campaign = new WORLDNS.Campaign(world, heroId, {
      onWaveStart: function () { UI.toast('גל בריונים!'); },
      onWaveClear: function () { UI.toast('נוקה!'); },
      // v11: onBossStart now always receives an ARRAY of defs (length 1 for
      // a solo boss gate, 2-3 for the paired chapters 4-6) — see world.js
      // _startGate's boss branch. Portrait files are named boss-card-<id>.png
      // (CODEX-ART-BRIEF-v7.md P2) for the three real bosses only — the elite
      // dog room uses the 'elite' gate type, never reaches this callback.
      onBossStart: function (g, defs) {
        UI.toast('בוס: ' + defs.map(function (d) { return d.name; }).join(' + '));
        UI.bossCard(defs.map(function (d) { return { src: 'assets/presentation/boss-card-' + d.id + '.png', name: d.name }; }));
      },
      onBossClear: function () { UI.toast('הדרך נפתחה!'); },
      onEliteStart: function (g, def) { UI.toast('יריב מיוחד: ' + def.name + '!'); },
      onDistrictChange: function (name, idx) { if (idx > 0) UI.toast(name); },
      onCourierWarn: function (dir) { UI.courierWarn(dir); if (AUDIO) AUDIO.sfxWhoosh(); },
      onCourierHit: function () { UI.toast('השליח פגע בכם!'); if (AUDIO) AUDIO.sfxHurt(); },
      onCourierDodge: function () { UI.toast('התחמקות מושלמת!'); if (AUDIO) AUDIO.sfxWhoosh(); },
      onCrateStart: function () { UI.toast('ארגז חוסם — שברו אותו!'); },
      onCrateHit: function () { if (AUDIO) AUDIO.sfxAttack('punch', false); },
      onAllyJoin: function (ally) { UI.toast(ally.def.name + ' מצטרף/ת לקרב!'); if (AUDIO) AUDIO.sfxAttack('special', false); },
      onWeaponCrateBreak: function () { UI.toast('נשק! תרימו אותו'); if (AUDIO) AUDIO.sfxAttack('kick', false); },
      onWeaponPickup: function () { UI.toast('חמושים! אגרוף=מכה · בעיטה=זריקה'); if (AUDIO) AUDIO.sfxAttack('special', false); },
      onWeaponThrow: function () { if (AUDIO) AUDIO.sfxWhoosh(); },
      onWeaponBreak: function () { UI.toast('הנשק נשבר'); },
      onGrabStart: function () { UI.toast('תפיסה! אגרוף=ברך · בעיטה=זריקה'); if (AUDIO) AUDIO.sfxAttack('uppercut', false); },
      onGrabThrow: function () { if (AUDIO) AUDIO.sfxAttack('special', false); },
      onWin: function () { world.pause(); if (AUDIO) AUDIO.playMenuMusic(); UI.showResults(hero.def.name); }
    });
    hudTick = 0; isPaused = false;
    UI.showScreen('game');
    UI.hideDefeat(); UI.hideResults(); UI.hidePause();
    world.resize();
    world.start();
    if (AUDIO) AUDIO.playBattleMusic();
    runOnboarding();
    syncHud();
  }

  function runOnboarding() {
    UI.toast('זוזו עם הג׳ויסטיק');
    setTimeout(function () { if (world.running) UI.toast('אגרוף · בעיטה · אפרקאט'); }, 2600);
    setTimeout(function () { if (world.running) UI.toast('שליח! צאו מהנתיב או קפצו'); }, 5400);
    setTimeout(function () { if (world.running) UI.toast('75%: הגנה+אגרוף=מכה טעונה'); }, 8200);
    setTimeout(function () { if (world.running) UI.toast('100%: ספיישל=Finisher · הגנה+ספיישל=אנרגיה'); }, 10800);
  }

  function syncHud() {
    const h = world.hero;
    if (!h || !campaign) return;
    const boss = world.enemies.filter(function (e) { return e.def.isBoss && e.alive; })[0];
    const ally = world.allies[0];
    UI.setHUD({
      heroName: h.def.name,
      heroHpPct: h.hp / h.maxHp * 100,
      heroEnergyPct: h.energy,
      districtName: WORLDNS.DISTRICTS[Math.max(0, campaign.currentDistrict)],
      routePct: campaign.progressPct(),
      gateLabel: campaign.bossesCleared + '/' + WORLDNS.CHAPTERS,
      bossName: boss ? boss.def.name : '',
      bossHpPct: boss ? (boss.hp / boss.maxHp * 100) : 0,
      allyName: ally ? ally.def.name : '',
      allyHpPct: ally ? (ally.hp / ally.maxHp * 100) : 0,
      comboCount: h.comboCount
    });
  }

  function handleHeroDown() { if (AUDIO) AUDIO.playMenuMusic(); UI.showDefeat(); }

  function pauseGame() { world.pause(); if (AUDIO) AUDIO.pauseMusic(); UI.showPause(); isPaused = true; }
  function resumeGame() { world.resume(); if (AUDIO) AUDIO.resumeMusic(); UI.hidePause(); isPaused = false; }
  function quitToSelect() {
    world.stop(); campaign = null; if (AUDIO) AUDIO.playMenuMusic();
    UI.hidePause(); UI.hideDefeat(); UI.hideResults();
    UI.showScreen('select');
  }
  function retryRun() { UI.hideDefeat(); startRun(lastHeroId); }

  // ── input handlers wired to the LIVE hero (world.hero changes each run) ──
  // Dash/run: double-tap left or right within DASH_WINDOW_MS triggers
  // hero.tryDash() (see engine.js — forward = short burst, backward = a real
  // i-framed retreat). Detected here as a press→release→press edge pattern
  // on the already-thresholded stick/keyboard direction, so it works
  // identically for the virtual joystick and arrow keys (both funnel
  // through this same onStick call).
  const DASH_WINDOW_MS = 280;
  const dashEdge = { left: { releasedAt: -9999 }, right: { releasedAt: -9999 } };
  function checkDashEdge(key, isDown, wasDown, hero, dirSign) {
    const st = dashEdge[key];
    const now = performance.now();
    if (isDown && !wasDown) {
      if (now - st.releasedAt <= DASH_WINDOW_MS) {
        hero.tryDash(dirSign);
        st.releasedAt = -9999; // consume so a 3rd tap doesn't chain another dash instantly
      }
    } else if (!isDown && wasDown) {
      st.releasedAt = now;
    }
  }
  function onStick(x, y) {
    const h = world.hero; if (!h) return;
    const newLeft = x < -0.35, newRight = x > 0.35;
    checkDashEdge('right', newRight, h.controls.right, h, RUMBLE.DIR.RIGHT);
    checkDashEdge('left', newLeft, h.controls.left, h, RUMBLE.DIR.LEFT);
    h.controls.left = newLeft; h.controls.right = newRight;
    h.controls.up = y < -0.35; h.controls.down = y > 0.35;
  }
  // LF-style routing: the SAME punch/kick buttons become different moves
  // depending on hero state (jumping → divekick, running → runattack for
  // punch, holding a weapon → swing/throw) rather than adding new dedicated
  // buttons — keeps the control surface unchanged while adding depth
  // underneath it. Airborne/running take priority over a held weapon (a
  // weapon-specific aerial/run variant is out of scope for this pass — see
  // plan §7b) so those two special moves always still work.
  function onPunch() {
    const h = world.hero; if (!h) return;
    if (h.controls.guard && h.energy >= 75 && h.def.moves.charged_strike) {
      if (h.startAttack('charged_strike')) {
        UI.toast(h.def.chargedStrikeName + '!');
        if (AUDIO) AUDIO.sfxAttack('uppercut', false);
      }
      return;
    }
    if (h.grabTarget) { campaign && campaign.grabKnee(); return; }
    if (!h.grounded()) { h.startAttack('divekick'); return; }
    if (h.running) { h.startAttack('runattack'); return; }
    if (h.weapon) { h.startAttack('weapon_swing'); return; }
    h.startAttack('punch');
  }
  function onKick() {
    const h = world.hero; if (!h) return;
    if (h.controls.guard && h.energy >= 85 && h.def.moves.tekken_special) {
      if (h.startAttack('tekken_special')) {
        UI.toast(h.def.tekkenSpecialName + '!');
        if (AUDIO) AUDIO.sfxAttack('special', false);
      }
      return;
    }
    if (h.grabTarget) { campaign && campaign.throwGrabbed(); return; }
    if (!h.grounded()) { h.startAttack('divekick'); return; }
    if (h.weapon) { campaign && campaign.throwWeapon(); return; }
    h.startAttack('kick');
  }
  // uppercut doubles as the grab button when a nearby enemy is reeling
  // (ST.HURT) — Campaign.tryGrab() itself checks range/state/hands-free, so
  // this just tries it first and falls back to a normal uppercut.
  function onUppercut() {
    const h = world.hero; if (!h) return;
    if (h.grabTarget) return; // already grabbing — punch=knee, kick=throw
    if (campaign && campaign.tryGrab()) return;
    h.startAttack('uppercut');
  }
  function onSpecial() {
    const h = world.hero; if (!h) return;
    if (h.controls.guard && h.energy >= 100 && h.def.moves.energy_super) {
      if (h.startAttack('energy_super')) {
        UI.toast(h.def.energySuperName + '!');
        if (AUDIO) AUDIO.sfxAttack('special', false);
      }
      return;
    }
    if (h.energy >= 100 && h.def.moves.finisher) {
      if (h.startAttack('finisher')) {
        UI.toast(h.def.finisherName + '!');
        if (AUDIO) AUDIO.sfxAttack('special', false);
      }
      return;
    }
    if (h.energy < 55) { UI.toast('ספיישל ב-' + Math.round(h.energy) + '%'); return; }
    if (h.startAttack('special')) UI.toast(h.def.specialName + '!');
  }
  function onJump() { const h = world.hero; if (h) h.tryJump(); }
  function onGuard(pressed) { const h = world.hero; if (h) h.controls.guard = pressed; }
  function onResetInputs() {
    const h = world.hero; if (!h) return;
    h.controls.left = h.controls.right = h.controls.up = h.controls.down = h.controls.jump = h.controls.guard = false;
  }
  function onPauseToggle() {
    if (!document.getElementById('game').classList.contains('active')) return;
    if (isPaused) resumeGame(); else pauseGame();
  }
  function onAutoPause() {
    if (document.getElementById('game').classList.contains('active') && !isPaused) pauseGame();
  }

  UI.renderSelect(Object.assign(
    { name: ROSTER.FIGHTERS[selectedFighterId].name, specialName: ROSTER.FIGHTERS[selectedFighterId].specialName },
    ROSTER.statLevels(selectedFighterId)
  ));
  preloadForRun(selectedFighterId);

  UI.init({
    onStick: onStick, onPunch: onPunch, onKick: onKick, onUppercut: onUppercut,
    onSpecial: onSpecial, onJump: onJump, onGuard: onGuard, onResetInputs: onResetInputs,
    onPauseToggle: onPauseToggle, onAutoPause: onAutoPause,
    onResume: resumeGame, onQuitToSelect: quitToSelect, onRetry: retryRun,
    onFightStart: function () { startRun(selectedFighterId); }
  });

  window.addEventListener('resize', function () { world.resize(); });

  // debug/QA hook only — not used by gameplay code
  window.__debug = { world: world, getCampaign: function () { return campaign; } };
})();
