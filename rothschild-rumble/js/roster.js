/* ══════════════════════════════════════════════════════════════════════════
   ROTHSCHILD RUMBLE — roster data
   6 playable WAR TLV fighters + street grunt + 4 boss configs, wired to the
   Codex-produced pose frames (assets/roster-frames/<id>/<move>/F0N.png).
   Move data (frame count, contact frame, damage, range, timing) follows the
   canonical spec in docs/TECHNICAL-CONTRACT.md and docs/GAME-DESIGN.md.
   Stats (hp/power/speed/specialName) carried over verbatim from the Codex
   prototype's tuned ROSTER table (game-v2.js) — already balanced, reused
   as-is rather than re-derived.
   ══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const A = 'assets/';

  // referee/tmr's original F0N.png frames had baked-in background junk (an
  // opaque decorative box frame on tmr, a faint dark halo on referee) —
  // tools/clean_cutouts.py stripped it via connected-component alpha
  // cleanup, verified with 0% opaque-outer-ring on every output. Point
  // those two fighters at the "-clean" files; everyone else already had
  // clean cutouts and keeps the original F0N.png naming.
  const NEEDS_CLEAN = { referee: true, tmr: true };
  const frameSeq = (fighter, move, count) =>
    Array.from({ length: count }, (_, i) =>
      `${A}roster-frames/${fighter}/${move}/F0${i + 1}${NEEDS_CLEAN[fighter] ? '-clean' : ''}.png`);

  // BIG.COM's punch sequence kept its original delivery filenames (not F0N).
  const BIGCOM_PUNCH = ['01-startup', '02-contact', '03-follow-through', '04-recovery']
    .map(n => `${A}roster-frames/bigcom/punch/${n}.png`);

  // move timing/contact rules — same for every fighter (per TECHNICAL-CONTRACT.md);
  // damage scales per-fighter via `power` below.
  const MOVE_SHAPE = {
    punch:    { frameTicks: 4, mult: 1.00, range: 92,  energyGain: 12 },
    kick:     { frameTicks: 5, mult: 1.28, range: 122, energyGain: 14 },
    uppercut: { frameTicks: 5, mult: 1.64, range: 88,  energyGain: 16, launch: 13 },
    special:  { frameTicks: 5, mult: 2.50, range: 148, energyGain: 0, knockback: 12, energyCost: 55 },
    // v3 LF-style moves (Lior wanted "עוד אופציות תחת הכותרת של ליטל פייטרס"):
    // divekick = punch/kick pressed while airborne (main.js onPunch/onKick),
    // hits harder than a grounded kick and pops the victim down into a
    // knockdown; runattack = punch pressed while Actor.running (the v2
    // dash/run system), a heavier hit rewarding the dash investment.
    // frameTicks is bumped above their donor move's so the contact window
    // (derived from frameTicks × contactIdx in Actor.startAttack) stays live
    // longer — a dive should be punishing to time against, not a one-frame poke.
    divekick:  { frameTicks: 7, mult: 1.45, range: 100, energyGain: 10, launch: 6 },
    runattack: { frameTicks: 6, mult: 1.35, range: 110, energyGain: 10, knockback: 11 },
    // weapon_swing is a normal melee move (goes through the usual hitbox/
    // _resolveAttacks pipeline) with better reach/damage than a bare punch.
    // weapon_throw deliberately does NOT land a real hit itself (mult:0,
    // range:1) — it exists only to lock the hero into a throw pose/timing;
    // the actual damage comes from a world-space projectile spawned by
    // Campaign.throwWeapon() (world.js), which can hit at a distance and
    // travel past the hero's own melee hitbox entirely.
    weapon_swing: { frameTicks: 5, mult: 1.6, range: 118, energyGain: 10, knockback: 8 },
    weapon_throw: { frameTicks: 6, mult: 0, range: 1, energyGain: 6 }
  };

  // v3 art delivery landed (2026-08-20): BIG.COM has real dedicated frames for
  // all four LF-style moves now, under assets/roster-frames/bigcom/<move>/.
  // weapon_swing's F04 was a defective regen at first (flagged in
  // CODEX-ART-BRIEF-v4-scenes.md) so we ran count:3; it was regenerated clean
  // (full-extension pole swing) and re-enabled at count:4 in v6.1.
  // Every other fighter still has no dedicated art for these (they never
  // actually reach these states in practice — only the hero calls
  // startAttack('divekick'/'runattack'/'weapon_swing'/'weapon_throw') — so
  // the kick/punch stand-in stays for them, just so poseSrc() never points
  // at a 404.
  function buildMoves(id, punchFrames) {
    const punchSeq = punchFrames || frameSeq(id, 'punch', 4);
    const isBigcom = id === 'bigcom';
    return {
      punch:    Object.assign({ frames: punchSeq }, MOVE_SHAPE.punch),
      kick:     Object.assign({ frames: frameSeq(id, 'kick', 4) }, MOVE_SHAPE.kick),
      uppercut: Object.assign({ frames: frameSeq(id, 'uppercut', 4) }, MOVE_SHAPE.uppercut),
      special:  Object.assign({ frames: frameSeq(id, 'special', 5) }, MOVE_SHAPE.special),
      divekick:     Object.assign({ frames: isBigcom ? frameSeq(id, 'divekick', 4) : frameSeq(id, 'kick', 4) }, MOVE_SHAPE.divekick),
      runattack:    Object.assign({ frames: isBigcom ? frameSeq(id, 'runattack', 4) : punchSeq }, MOVE_SHAPE.runattack),
      weapon_swing: Object.assign({ frames: isBigcom ? frameSeq(id, 'weapon_swing', 4) : frameSeq(id, 'kick', 4) }, MOVE_SHAPE.weapon_swing),
      weapon_throw: Object.assign({ frames: isBigcom ? frameSeq(id, 'weapon_throw', 3) : punchSeq }, MOVE_SHAPE.weapon_throw)
    };
  }

  // idle/attack stills — referee & tmr's ".webp" files are mislabeled PNGs
  // (confirmed via file signature) so we point at their real ".png" copies;
  // those two also get the box-cleaned "-clean" versions (see NEEDS_CLEAN above).
  // icon-idle.webp lost its legs in an earlier background-removal pass (the
  // black pants got cut along with the background). roster-frames/icon/punch/
  // F01.png is the same character in a full combat stance, clean alpha,
  // boots and all — reuse it as the idle/select pose instead of sourcing a
  // new asset. Feeds walk/guard too via poses() below, which is correct.
  const IDLE = {
    bigcom: `${A}bigcom-idle.webp`, yashar: `${A}yashar-idle.webp`,
    frisbee: `${A}frisbee-idle.webp`, icon: `${A}roster-frames/icon/punch/F01.png`,
    tmr: `${A}tmr-idle-clean.png`, referee: `${A}referee-idle-clean.png`
  };
  const HURT_POSE = {
    bigcom: `${A}bigcom-attack.webp`, yashar: `${A}yashar-attack.webp`,
    frisbee: `${A}frisbee-attack.webp`, icon: `${A}icon-attack.webp`,
    tmr: `${A}tmr-attack-clean.png`, referee: `${A}referee-attack-clean.png`
  };

  const BIGCOM_WALK = {
    frames: [1, 2, 3, 4, 5, 6].map(n => `${A}animations/bigcom/movement/walk-forward/F0${n}.png`),
    ticksPerFrame: 6
  };

  // v5 art delivery landed (2026-08-20): real walk cycles for the rest of the
  // roster (previously every non-bigcom fighter just dragged their static
  // idle image across the screen — see CODEX-ART-BRIEF-v5-movement.md), plus
  // dedicated guard/hurt/ko frames for BIG.COM and dedicated hurt/ko for
  // FRISBEE (highest-visibility roster members first, per the brief's
  // tiering — bosses only got walk, so they still fall back to the old
  // single-"attack"-image stand-in for hurt/ko).
  const WALK_CYCLE_IDS = ['frisbee', 'tmr', 'referee', 'icon'];
  const DEDICATED_HURT_KO = ['bigcom', 'frisbee', 'tmr', 'referee', 'icon'];
  function walkPose(id) {
    if (id === 'bigcom') return BIGCOM_WALK;
    if (WALK_CYCLE_IDS.indexOf(id) >= 0) return { frames: frameSeq(id, 'walk', 4), ticksPerFrame: 6 };
    return IDLE[id];
  }
  function hurtPose(id) {
    return DEDICATED_HURT_KO.indexOf(id) >= 0 ? { frames: frameSeq(id, 'hurt', 2), ticksPerFrame: 10, once: true } : HURT_POSE[id];
  }
  function koPose(id) {
    return DEDICATED_HURT_KO.indexOf(id) >= 0 ? { frames: frameSeq(id, 'ko', 2), ticksPerFrame: 14, once: true } : HURT_POSE[id];
  }

  function poses(id) {
    const idle = IDLE[id];
    return {
      idle, walk: walkPose(id), jump: frameSeq(id, 'jump', 4)[1],
      hurt: hurtPose(id), ko: koPose(id),
      guard: id === 'bigcom' ? frameSeq(id, 'guard', 1)[0] : idle,
      // held-victim pose while hero.grabTarget is set — only BIG.COM ever
      // grabs (hero-only per v3 scope), so this is undefined for everyone
      // else and engine.js's poseSrc() branch simply never fires for them.
      grabHold: id === 'bigcom' ? { frames: frameSeq(id, 'grab-hold', 2), ticksPerFrame: 10 } : undefined,
      // v6.1: the grab combo's missing beats. tryGrab()/grabKnee()/
      // throwGrabbed() (world.js) never touch hero.state — only grabHold
      // reflected anything on screen, so a knee or a throw looked identical
      // to just standing there holding someone. These two feed Actor's new
      // transient grabAnim overlay (engine.js) via playGrabAnim(), NOT the
      // attack-state machine — `once:true` so each plays through and holds
      // its last frame instead of looping like a walk cycle.
      grabKnee: id === 'bigcom' ? { frames: frameSeq(id, 'grab-knee', 3), ticksPerFrame: 5, once: true } : undefined,
      grabThrow: id === 'bigcom' ? { frames: frameSeq(id, 'grab-throw', 4), ticksPerFrame: 5, once: true } : undefined
    };
  }

  // display height (logical px, feet→head) — used by the camera to size the
  // scene consistently regardless of each source photo's own aspect ratio.
  const DRAW_H = 210;
  const AURA = {
    bigcom: '#1f6fd8', yashar: '#00b35a', icon: '#b14de0',
    frisbee: '#ff9440', tmr: '#c19300', referee: '#9aa0aa'
  };

  // ── playable roster (also doubles as boss identities, see resolveBosses) ──
  const FIGHTERS = {
    bigcom:  { id: 'bigcom',  name: 'BIG.COM',   hp: 100, power: 14, speed: 4.8, specialName: 'סנוקרת רוטשילד' },
    yashar:  { id: 'yashar',  name: 'ישר',        hp: 110, power: 18, speed: 4.3, specialName: 'הפתרון' },
    icon:    { id: 'icon',    name: 'האייקון',    hp: 115, power: 17, speed: 4.6, specialName: 'WOOO! ציקלון' },
    frisbee: { id: 'frisbee', name: 'FRISBEE',   hp: 105, power: 15, speed: 4.5, specialName: 'זרם פריזבי' },
    tmr:     { id: 'tmr',     name: 'T.M.R',      hp: 130, power: 19, speed: 4.1, specialName: 'שובר הכתר' },
    referee: { id: 'referee', name: 'השופט',      hp: 120, power: 16, speed: 3.7, specialName: 'הספירה האחרונה' }
  };
  const FIGHTER_ORDER = ['bigcom', 'yashar', 'frisbee', 'tmr', 'referee', 'icon'];
  // v2: player picks only BIG.COM (CEO call — single strong hero identity for
  // the WAR TLV beat-'em-up rather than a 6-way roster). The other 5 fighters
  // stay defined (FIGHTERS/FIGHTER_ORDER) since they're still used as boss
  // identities via buildBoss/BOSS_ORDER below.
  const PLAYABLE_ORDER = ['bigcom'];

  // v3 select-screen stat panel: qualitative bars/labels derived from the
  // REAL FIGHTERS data (min-max normalized across all 6, not just the
  // playable one) rather than hand-typed flavor numbers — so "כוח: נמוך"
  // for BIG.COM is an honest statement about his numbers (14 power / 100 hp
  // is the lowest of the six, 4.8 speed is the highest), not made-up copy.
  // Reads as a real character: fast hustler, not a tank.
  function statLevels(id) {
    const ids = Object.keys(FIGHTERS);
    const norm = (v, pick) => {
      const vals = ids.map(pick);
      const lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
      return hi === lo ? 60 : Math.max(18, Math.round((v - lo) / (hi - lo) * 100));
    };
    const tier = pct => pct >= 90 ? 3 : pct >= 60 ? 2 : pct >= 34 ? 1 : 0;
    const LVL_M = ['נמוך', 'בינוני', 'גבוה', 'גבוה מאוד'];
    const LVL_F = ['נמוכה', 'בינונית', 'גבוהה', 'גבוהה מאוד'];
    const f = FIGHTERS[id];
    const atkPct = norm(f.power, k => FIGHTERS[k].power);
    const defPct = norm(f.hp, k => FIGHTERS[k].hp);
    const spdPct = norm(f.speed, k => FIGHTERS[k].speed);
    return {
      atkPct, defPct, spdPct,
      atkLabel: LVL_M[tier(atkPct)], defLabel: LVL_F[tier(defPct)], spdLabel: LVL_F[tier(spdPct)]
    };
  }

  function buildFighter(id) {
    const base = FIGHTERS[id];
    if (!base) throw new Error('unknown fighter id: ' + id);
    const punchFrames = id === 'bigcom' ? BIGCOM_PUNCH : null;
    return {
      id: base.id, name: base.name, hp: base.hp, power: base.power, speed: base.speed,
      specialName: base.specialName, auraColor: AURA[id], drawH: DRAW_H,
      poses: poses(id), moves: buildMoves(id, punchFrames)
    };
  }

  // ── street grunt — weak, shared basic moves (punch+kick only), per
  // GAME-DESIGN.md: "חלשים מבוסים, HP יעד 24–32, power 3." v3: draw size is
  // fixed (Lior: "הדמויות צריכות להיות באותו גודל") — the "variable size"
  // request was about WAVE COUNT (see waveCount() in world.js), not each
  // grunt's physical scale. hp/speed still jitter per spawn so a wave still
  // reads as a mixed crowd, just not a visually uneven one.
  // v3 art delivery landed (2026-08-20): 4 visual variants beyond the
  // original design, so a wave reads as a mixed crowd instead of clones
  // (CODEX-ART-BRIEF-v3.md section ג). `variant` lets a caller pin a specific
  // look; omitted (the normal wave-spawn path), one is picked at random per
  // grunt.
  const GRUNT_VARIANTS = {
    classic: ['street-enemy-idle.png', 'street-enemy-punch.png'],
    cart:    ['street-enemy-cart-idle.png', 'street-enemy-cart-punch.png'],
    vendor:  ['street-enemy-vendor-idle.png', 'street-enemy-vendor-punch.png'],
    busker:  ['street-enemy-busker-idle.png', 'street-enemy-busker-punch.png'],
    blanket: ['street-enemy-blanket-idle.png', 'street-enemy-blanket-punch.png']
  };
  const GRUNT_VARIANT_IDS = Object.keys(GRUNT_VARIANTS);
  function buildGrunt(variant) {
    const v = GRUNT_VARIANTS[variant] ? variant : GRUNT_VARIANT_IDS[Math.floor(Math.random() * GRUNT_VARIANT_IDS.length)];
    const [idleFile, attackFile] = GRUNT_VARIANTS[v];
    const idle = `${A}street-enemy/${idleFile}`;
    const attack = `${A}street-enemy/${attackFile}`;
    const classicWalk = { frames: [1, 2, 3, 4].map(n => `${A}street-enemy/classic/walk/F0${n}.png`), ticksPerFrame: 6 };
    const classicHurt = { frames: [1, 2].map(n => `${A}street-enemy/classic/hurt/F0${n}.png`), ticksPerFrame: 9, once: true };
    const classicKo = { frames: [1, 2].map(n => `${A}street-enemy/classic/ko/F0${n}.png`), ticksPerFrame: 12, once: true };
    return {
      id: 'grunt', name: 'איש הרחוב', hp: ri(24, 32), power: 3, speed: 1.9 + Math.random() * 0.55,
      drawH: 195, auraColor: '#9E443D',
      poses: {
        idle,
        walk: v === 'classic' ? classicWalk : idle,
        jump: idle,
        hurt: v === 'classic' ? classicHurt : attack,
        ko: v === 'classic' ? classicKo : attack,
        guard: idle
      },
      moves: {
        punch: { frames: [attack, attack, idle], frameTicks: 6, mult: 1, range: 78, energyGain: 0 },
        kick:  { frames: [attack, attack, idle], frameTicks: 7, mult: 1.1, range: 86, energyGain: 0 }
      },
      bubble: () => Math.random() < 0.5 ? 'יש לך שקל?' : 'יש לך סיגריה?'
    };
  }
  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  // ── canonical boss lineup (v3): T.M.R → Referee → Icon. FRISBEE was
  // demoted from "boss #2" to a breakable-crate ALLY who joins BIG.COM after
  // the FIRST boss gate (see world.js Campaign — crate spawn) and fights
  // independently for the rest of the run, per CEO direction: only one
  // playable hero now (bigcom), so FRISBEE reads better as backup than as
  // an obstacle. v3: the Icon moved from boss #1 to the FINAL boss (Lior:
  // "האייקון צריך להיות הבוס האחרון") — he now gets the strongest tuning
  // tier instead of the weakest. Stat progression per gate carried over
  // from the original 4-boss tuning table, just trimmed to 3 entries.
  // resolveBossLineup no longer needs a self-fight swap — bigcom (the only
  // playable hero) was never in BOSS_ORDER to begin with — kept as a
  // function for API stability (world.js calls it) in case the roster
  // grows again later. ──
  const BOSS_ORDER = ['tmr', 'referee', 'icon'];
  const BOSS_TUNING = [
    { hp: 95, power: 8, speed: 2.7 },
    { hp: 140, power: 11, speed: 3.1 },
    { hp: 185, power: 14, speed: 3.4 }
  ];
  function resolveBossLineup() {
    return BOSS_ORDER.slice();
  }
  function buildBoss(id, gateIndex) {
    const f = buildFighter(id);
    const tune = BOSS_TUNING[gateIndex] || BOSS_TUNING[BOSS_TUNING.length - 1];
    f.hp = tune.hp; f.power = tune.power; f.speed = tune.speed;
    f.isBoss = true; f.gateIndex = gateIndex;
    return f;
  }

  // ── רוטוויילר רוטשילד — the wrestler dog (v3 art brief, section ד). Lior's
  // own framing: "לא בוס ולא הומלס, הוא בין לבין" — tougher than any single
  // grunt but well under even the first boss (T.M.R: 95hp/8power), and he
  // gets his own real moveset instead of reusing punch/kick like a grunt.
  // Lives under assets/enemies/wrestler-dog/ (not roster-frames/ — a
  // different asset location, since he isn't part of the WAR TLV FIGHTERS
  // table), so he needs his own frame-path helper rather than frameSeq().
  // Marked isBoss:true purely so he gets the existing boss machinery for
  // free (AI.tickBoss dispatch in world.js, the HUD boss-health-bar finder
  // in main.js) — kept OFF the real BOSS_ORDER/gates 'boss' type so he can
  // never touch bossesCleared/the 3-boss win condition; see the 'elite' gate
  // type in world.js buildGates/_startGate.
  const DOG_A = `${A}enemies/wrestler-dog/`;
  const dogFrames = (move, count) =>
    Array.from({ length: count }, (_, i) => `${DOG_A}${move}/F0${i + 1}.png`);
  // per-chapter tuning — a recurring rival, slightly tougher each rematch
  // (same shape as BOSS_TUNING, independent table so he never shares an
  // index with the real bosses).
  const DOG_TUNING = [
    { hp: 55, power: 6 }, { hp: 70, power: 8 }, { hp: 85, power: 10 }
  ];
  function buildRottweiler(chapter) {
    const tune = DOG_TUNING[chapter] || DOG_TUNING[DOG_TUNING.length - 1];
    return {
      id: 'rottweiler', name: 'רוטוויילר רוטשילד', hp: tune.hp, power: tune.power, speed: 3.3,
      drawH: DRAW_H, auraColor: '#c1401f', isBoss: true,
      poses: {
        idle: { frames: dogFrames('idle', 2), ticksPerFrame: 16 },
        walk: { frames: dogFrames('walk', 4), ticksPerFrame: 6 },
        jump: dogFrames('idle', 1)[0],
        hurt: { frames: dogFrames('hurt', 2), ticksPerFrame: 10 },
        ko: { frames: dogFrames('knockdown', 3), ticksPerFrame: 12 },
        guard: dogFrames('idle', 1)[0]
      },
      moves: {
        bite:   { frames: dogFrames('bite', 4), frameTicks: 5, mult: 1.15, range: 92, energyGain: 0 },
        claw:   { frames: dogFrames('claw', 4), frameTicks: 5, mult: 1.3, range: 104, energyGain: 0 },
        charge: { frames: dogFrames('charge', 4), frameTicks: 6, mult: 1.4, range: 140, energyGain: 0, knockback: 10 }
      }
    };
  }

  root.ROSTER = {
    FIGHTERS, FIGHTER_ORDER, PLAYABLE_ORDER, buildFighter, buildGrunt,
    BOSS_ORDER, resolveBossLineup, buildBoss, statLevels, buildRottweiler
  };
})(typeof window !== 'undefined' ? window : this);
