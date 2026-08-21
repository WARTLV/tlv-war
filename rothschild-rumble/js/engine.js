/* ══════════════════════════════════════════════════════════════════════════
   ROTHSCHILD RUMBLE — Canvas beat-em-up engine
   Ported + extended from TLV WAR's proven Canvas fighter engine
   (tlv-war/js/tlvfight.js — state machine, physics, feet-center pose
   rendering, hit/hurt AABB, camera, procedural FX). Same philosophy:
   • Classic (non-module) script exposing window.RUMBLE.
   • Actors are STATIC poses (multi-frame sequences for moves, not full
     spritesheets) — draw ONE pose per state, attacks play a short frame
     sequence with the hitbox live only on the contact frame.
   • Canvas OWNS: actors, stage, camera, physics, hitboxes, FX.
     DOM keeps: HUD, screens, touch controls (see ui.js).
   ────────────────────────────────────────────────────────────────────────
   Extension vs. the 1v1 engine: beat-em-up needs MANY actors on screen
   (hero + several street enemies + a boss), a scrolling world instead of
   a fixed arena, and a shallow depth axis (the sidewalk "lane") on top of
   the horizontal axis + jump height. So: X = position along the street
   (world units), LANE = depth position on the sidewalk (0..1, 0=far/back
   near the buildings, 1=near/front toward the bike lane), Z = jump height.
   Screen Y is derived from LANE (a narrow vertical band) minus Z*scale.
   ══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  // ── World constants (logical units = CSS px at scale 1) ────────────────────
  const GRAVITY      = 0.92;   // matches GAME-DESIGN.md jump spec
  const JUMP_V        = 21;
  const LANE_MIN       = 0.66; // top of the walkable band (screen-height fraction)
  const LANE_MAX       = 0.92; // bottom of the walkable band (feet line)
  const LANE_SPEED_PX  = 130;  // full lane traversal reference speed (px/tick-equivalent, scaled by dt)
  const PUSH_W         = 34;   // half-width of an actor's body push box
  const HITSTOP_TICKS  = 4;    // ~65ms global freeze on a landed hit
  const DIR = { LEFT: -1, RIGHT: 1 };

  // ── LF-style dash/run + combo/juggle tuning ─────────────────────────────
  const DASH_TICKS       = 8;    // burst duration (ticks @60fps)
  const DASH_SPEED_MULT  = 2.6;  // vs. normal moveSpeed, during the burst
  const RUN_SPEED_MULT   = 1.4;  // sustained speed once you hold through a dash
  const DASH_FWD_IFRAMES = 4;    // forward dash: brief safety on the burst itself
  const DASH_BACK_IFRAMES = 14;  // back-dash: real i-frames, it's the defensive option
  const JUGGLE_CAP        = 4;   // max consecutive airborne hits on one victim
  const COMBO_WINDOW_TICKS = 24; // ~400ms to land the next hit and keep the chain

  // ── v3: wave grunts walk in from off-screen instead of popping into
  // existence in front of the player (see Campaign._startGate/_tickEntrances
  // in world.js). While `entering`, an actor is driven by the campaign, not
  // the player/AI, and must be allowed a world x OUTSIDE the normal play
  // bounds ([30, worldW-30]) that World.tick clamps every actor to — that's
  // what FREE_BOUNDS is for. ──
  const FREE_BOUNDS = { lo: -1500, hi: 1e9 };

  const ST = {
    IDLE: 'idle', WALK: 'walk', JUMP: 'jump',
    PUNCH: 'punch', KICK: 'kick', UPPERCUT: 'uppercut', SPECIAL: 'special',
    GUARD: 'guard', HURT: 'hurt', KNOCKDOWN: 'knockdown', KO: 'ko'
  };
  // v3: 'divekick'/'runattack' are just more entries in def.moves — startAttack()
  // is already generic over any move kind — but isAttack()/isLocked() are the
  // ONLY place the state machine decides "this state must hold until its
  // frames finish, don't let movement/AI stomp it, and use attack.frames for
  // the pose" (see poseSrc() below). Forgetting a new move kind here means
  // startAttack() still "succeeds" but the very next update() tick silently
  // overwrites the state back to walk/idle before the hitbox window ever
  // opens — a real bug caught via __debug during v3 verification, not a
  // hypothetical.
  const ATTACK_STATES = [ST.PUNCH, ST.KICK, ST.UPPERCUT, ST.SPECIAL, 'divekick', 'runattack', 'weapon_swing', 'weapon_throw', 'bite', 'claw', 'charge'];
  const isAttack = s => ATTACK_STATES.indexOf(s) >= 0;
  const isLocked = s => isAttack(s) || s === ST.HURT || s === ST.KNOCKDOWN || s === ST.KO;

  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // ── procedural FX (aura / spark / guard-flash / dust) — same drawing
  // language as TLV WAR, kept canvas-local. No screen-shake (house rule). ──
  function hexToRgb(hex) {
    hex = (hex || '#ffaa33').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const FX_LIFE = { spark: 9, guard: 8, dust: 14, nova: 16 };

  // v6.1: real FX sprites (CODEX-ART-BRIEF-v6-gaps.md P1, assets/fx/) —
  // replace the procedural ray-burst/dust-puff drawing below once loaded.
  // 'nova' was already a defined-but-unused FX type/lifespan (no spawnFx
  // call anywhere used it) — repurposed here as the special-move energy-ball
  // hit, wired at its one spawn site in _resolveAttacks (a.kind==='special').
  const FX_SPRITE = {
    spark: { dir: 'assets/fx/hit-spark/', count: 4, size: 46 },
    dust: { dir: 'assets/fx/dust-puff/', count: 4, size: 54 },
    nova: { dir: 'assets/fx/energy-ball/', count: 4, size: 60 }
  };
  function drawFxSprite(ctx, item, age, sx, sy, sc, lifeFrac) {
    const spec = FX_SPRITE[item.type];
    if (!spec) return false;
    const frameIdx = Math.min(spec.count - 1, Math.floor((age / FX_LIFE[item.type]) * spec.count));
    const im = loadImg(`${spec.dir}F0${frameIdx + 1}.png`);
    if (!(im && im.complete && im.naturalWidth)) return false; // not loaded yet — caller falls back to procedural
    const mag = item.mag || 1;
    const h = spec.size * mag * sc;
    const w = h * (im.naturalWidth / im.naturalHeight);
    ctx.save();
    ctx.globalAlpha = lifeFrac;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(im, sx - w / 2, sy - h / 2, w, h);
    ctx.restore();
    return true;
  }
  function drawFxItem(ctx, item, age, sx, sy, sc) {
    const lifeFrac = 1 - age / FX_LIFE[item.type];
    if (lifeFrac <= 0) return;
    if (drawFxSprite(ctx, item, age, sx, sy, sc, lifeFrac)) return;
    const mag = item.mag || 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (item.type === 'nova') {
      const [r, g, b] = hexToRgb(item.color);
      const R = (10 + age * 5.5) * sc;
      ctx.strokeStyle = `rgba(${r},${g},${b},${0.8 * lifeFrac})`;
      ctx.lineWidth = Math.max(2, 7 * sc * lifeFrac);
      ctx.beginPath(); ctx.arc(sx, sy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.restore(); return;
    }
    if (item.type === 'spark' || item.type === 'guard') {
      const [r, g, b] = hexToRgb(item.type === 'guard' ? '#7fb8ff' : item.color);
      const rays = item.type === 'guard' ? 5 : 8;
      const len = (item.type === 'guard' ? 16 : 26) * mag * sc * (0.5 + 0.7 * (1 - lifeFrac));
      ctx.strokeStyle = `rgba(${r},${g},${b},${0.85 * lifeFrac})`;
      ctx.lineWidth = Math.max(1.5, 2.6 * sc * lifeFrac);
      ctx.beginPath();
      for (let i = 0; i < rays; i++) {
        const ang = (i / rays) * Math.PI * 2 + item.seed;
        ctx.moveTo(sx + Math.cos(ang) * len * 0.25, sy + Math.sin(ang) * len * 0.25);
        ctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
      }
      ctx.stroke();
      const core = ctx.createRadialGradient(sx, sy, 0, sx, sy, 14 * sc * lifeFrac);
      core.addColorStop(0, `rgba(255,255,255,${0.9 * lifeFrac})`);
      core.addColorStop(0.5, `rgba(${r},${g},${b},${0.5 * lifeFrac})`);
      core.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = core;
      ctx.beginPath(); ctx.arc(sx, sy, 14 * sc * lifeFrac, 0, Math.PI * 2); ctx.fill();
    } else {
      for (let i = 0; i < 5; i++) {
        const ang = Math.PI + (i / 4) * Math.PI;
        const d = age * 1.6 * sc * (0.6 + (i % 3) * 0.3);
        const px = sx + Math.cos(ang + item.seed) * d;
        const py = sy - age * 0.7 * sc * (0.4 + (i % 2) * 0.4);
        ctx.fillStyle = `rgba(180,170,160,${0.30 * lifeFrac})`;
        ctx.beginPath(); ctx.arc(px, py, (3 + i) * sc * 0.8, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
  function drawAura(ctx, sx, feetY, h, w, colorHex, intensity) {
    if (intensity <= 0) return;
    const [r, g, b] = hexToRgb(colorHex);
    const now = performance.now();
    const n = Math.round(5 + intensity * 9);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const seed = i * 37.13 + 11;
      const speed = 140 + (i % 3) * 55;
      const cycle = h * 1.15;
      const t = (now * 0.001 * speed + seed * 19) % cycle;
      const rise = 1 - t / cycle;
      const wobble = Math.sin(now * 0.0035 + seed) * w * 0.30;
      const px = sx + wobble, py = feetY - t;
      const alpha = Math.max(0, rise) * 0.5 * intensity;
      if (alpha <= 0.01) continue;
      const rad = 4 + intensity * 5 * rise;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, rad);
      grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI * 2); ctx.fill();
    }
    const baseGlow = ctx.createRadialGradient(sx, feetY, 0, sx, feetY, w * 0.55);
    baseGlow.addColorStop(0, `rgba(${r},${g},${b},${0.28 * intensity})`);
    baseGlow.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = baseGlow;
    ctx.beginPath(); ctx.ellipse(sx, feetY, w * 0.55, h * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ── Image cache ──────────────────────────────────────────────────────────
  const IMG = Object.create(null);
  function loadImg(src) {
    if (!src) return null;
    if (IMG[src]) return IMG[src];
    const im = new Image();
    im.src = src;
    IMG[src] = im;
    return im;
  }
  function preload(list) { list.forEach(loadImg); }

  // ── Camera: scrolling dead-zone follow (beat-em-up standard, not the SF2
  // midpoint-follow used for 1v1) — background only advances once the hero
  // leaves the dead-zone band, and can soft-lock to a boss arena. ──────────
  class Camera {
    constructor(view, worldW) {
      this.view = view;
      this.worldW = worldW;
      this.x = 0;
      this.lockLeft = null;  // boss-arena soft lock
      this.lockRight = null;
    }
    maxX() { return Math.max(0, this.worldW - this.view.w); }
    update(heroX) {
      const dzLo = this.x + this.view.w * 0.32;
      const dzHi = this.x + this.view.w * 0.58;
      let target = this.x;
      if (heroX < dzLo) target = this.x - (dzLo - heroX);
      else if (heroX > dzHi) target = this.x + (heroX - dzHi);
      let lo = 0, hi = this.maxX();
      if (this.lockLeft != null) lo = Math.max(lo, this.lockLeft);
      if (this.lockRight != null) hi = Math.min(hi, this.lockRight);
      target = clamp(target, lo, hi);
      this.x += (target - this.x) * 0.14;
      this.x = clamp(this.x, lo, hi);
    }
  }

  // ── Actor: state machine + physics + pose rendering, generalized from
  // TLV WAR's Fighter to support many simultaneous actors and a depth lane. ──
  class Actor {
    constructor(def, x, lane, facing, kind) {
      this.def = def;              // { id, name, poses:{state:src}, moves:{...} }
      this.kind = kind || 'grunt'; // 'hero' | 'ally' | 'grunt' | 'boss'
      this.x = x;
      this.lane = lane != null ? lane : 0.5;
      this.z = 0; this.vx = 0; this.vz = 0;
      this.facing = facing || DIR.RIGHT;
      this.state = ST.IDLE;
      this.frameT = 0;
      this.hp = def.hp || 30; this.maxHp = this.hp;
      this.power = def.power || 10;
      this.moveSpeed = def.speed || 3.4;
      this.attack = null;          // active move def
      this.contacted = false;      // damage applied this swing already
      this.controls = { left: false, right: false, up: false, down: false, jump: false, guard: false };
      this.energy = 0; this.maxEnergy = 100;
      this.hurtT = 0;
      this.knockdownT = 0;
      this.invulnT = 0;
      this.alive = true;
      this.facingLock = false;     // true while an attack owns facing
      this.targetHint = null;      // AI: current target actor
      this.onMove = null;
      this.onHitLanded = null;
      this.weapon = null; // v3: { kind, uses } while holding a crate-dropped weapon — see Campaign in world.js
      this.grabTarget = null; // v3: the Actor currently held (hero-only) — see Campaign.tryGrab in world.js
      // v6.1: transient visual overlay for the grab-knee/grab-throw beats —
      // NOT an attack state (must stay out of ATTACK_STATES, or it would
      // fight tryGrab/grabKnee/throwGrabbed's own state handling). Purely
      // cosmetic: doesn't gate input or movement. See playGrabAnim() below.
      this.grabAnim = null;
      this.grabAnimT = 0;
      // LF-style dash/run
      this.dashT = 0;               // ticks remaining in the current dash burst
      this._dashDir = 1;
      this.running = false;         // sustained speed boost after dashing into a held direction
      // combo/juggle
      this.comboCount = 0;          // consecutive LANDED hits within the combo window (this actor as attacker)
      this.comboWindowT = 0;        // ticks left to land the next chained hit before the combo drops
      this.juggleCount = 0;         // consecutive airborne hits taken (this actor as victim) — caps juggles
      // v3: off-screen wave entrances (Campaign._tickEntrances owns these
      // while `entering` is true — see world.js)
      this.entering = false;
      this.enterDir = 0;
      this.enterDelay = 0;
      this.enterT = 0;
      this._baseSpeed = null;
    }
    grounded() { return this.z <= 0.001; }
    dead() { return this.hp <= 0; }

    changeState(s) {
      if (this.state === s) return;
      if (isLocked(this.state) && this.state !== ST.HURT && this.state !== ST.KNOCKDOWN && s !== ST.KO) {
        // mid-attack: only a KO can interrupt (hurt/knockdown handled via takeHit)
        if (!this.attackFinished()) return;
      }
      this.state = s; this.frameT = 0; this.attack = null; this.contacted = false;
    }
    changeStateForce(s) {
      this.state = s; this.frameT = 0; this.attack = null; this.contacted = false;
    }
    attackFinished() {
      if (!isAttack(this.state) || !this.attack) return true;
      return this.frameT >= this.attack.totalTicks;
    }

    // start a named move (punch/kick/uppercut/special) from def.moves
    startAttack(kind) {
      if (isLocked(this.state) && !this.attackFinished()) return false;
      if (this.state === ST.HURT || this.state === ST.KNOCKDOWN || this.state === ST.KO || this.state === 'grabbed') return false;
      const mv = this.def.moves && this.def.moves[kind];
      if (!mv) return false;
      if (kind === 'special') {
        if (this.energy < (mv.energyCost || 55)) return false;
        this.energy -= (mv.energyCost || 55);
      }
      const frameTicks = mv.frameTicks || 4;
      const frames = mv.frames || [];
      const n = Math.max(1, frames.length);
      const contactIdx = n >= 5 ? 3 : Math.min(2, n - 1);
      this.state = kind; this.frameT = 0; this.contacted = false;
      this.attack = {
        kind, frames, frameTicks, contactIdx,
        totalTicks: n * frameTicks,
        contactStart: contactIdx * frameTicks,
        contactEnd: (contactIdx + 1) * frameTicks,
        dmg: Math.round(this.power * (mv.mult || 1)),
        range: mv.range || 90,
        launch: mv.launch || 0,
        knockback: mv.knockback || 0,
        energyGain: mv.energyGain || 0,
        cleave: !!mv.cleave
      };
      this.facingLock = true;
      if (this.onMove) this.onMove(this, mv);
      return true;
    }

    // hitbox is live only during the contact window, once per swing
    hitBox() {
      if (!this.attack || this.contacted) return null;
      if (this.frameT < this.attack.contactStart || this.frameT >= this.attack.contactEnd) return null;
      const w = this.attack.range;
      const x = this.facing === DIR.RIGHT ? this.x : this.x - w;
      return { x, y: 0, w, h: 999, lane: this.lane, actor: this };
    }
    hurtBox() {
      return { x: this.x - PUSH_W, y: 0, w: PUSH_W * 2, h: 999, lane: this.lane, actor: this };
    }
    pushBox() { return { x: this.x - PUSH_W, y: 0, w: PUSH_W * 2, h: 999 }; }

    takeHit(dmg, opts) {
      opts = opts || {};
      if (this.invulnT > 0 || this.state === ST.KO) return;
      this.hp = Math.max(0, this.hp - dmg);
      if (this.hp <= 0) {
        this.state = ST.KO; this.frameT = 0; this.attack = null; this.alive = false;
        this.vz = 6; return;
      }
      if (opts.launch) {
        this.state = ST.KNOCKDOWN; this.frameT = 0; this.attack = null;
        this.vz = opts.launch; this.knockdownT = 46;
      } else {
        this.state = ST.HURT; this.frameT = 0; this.attack = null;
        this.hurtT = opts.heavy ? 20 : 11;
      }
      if (opts.knockback) this.vx += -this.facing * opts.knockback * 0.01 * (opts.dirFrom || 1);
      const kb = opts.knockback || (opts.heavy ? 5.5 : 3.2);
      this.vx += this.facing * -kb * (opts.dirFrom != null ? opts.dirFrom : 1);
      this.facingLock = false;
    }

    grantEnergy(amt) { this.energy = Math.min(this.maxEnergy, this.energy + amt); }

    // Immediate jump trigger — called directly by input handlers (not queued
    // through `controls.jump`, which was a one-shot flag that could be wiped
    // by the global pointerup/resetAllInputs reset before a tick consumed it,
    // silently swallowing fast taps). Integrates z right away so grounded()
    // is already false on THIS tick — previously vz was set but z stayed 0
    // until the next tick's grounded-branch check, which re-entered the
    // grounded control branch and the jump never left the ground.
    tryJump() {
      if (!this.grounded()) return false;
      if (isLocked(this.state) && !this.attackFinished()) return false;
      if (this.state === ST.HURT || this.state === ST.KNOCKDOWN || this.state === ST.KO) return false;
      if (this.grabTarget) return false; // can't jump while dragging a grabbed enemy — throw or knee first
      this.vz = JUMP_V;
      this.z = Math.max(0.01, this.z + this.vz);
      this.changeStateForce(ST.JUMP);
      return true;
    }

    // LF-style dash — double-tap-forward detected upstream (ui.js/main.js)
    // calls this directly, like tryJump(). `dirSign` is DIR.LEFT/DIR.RIGHT in
    // WORLD space (not relative to facing). Dashing the same way you're
    // already facing = forward burst (short i-frames, just enough to beat a
    // telegraphed swing); dashing the opposite way = a back-dash retreat
    // with real i-frames (the defensive option) that does NOT turn you
    // around, since you're backing off from a fight you're still facing.
    tryDash(dirSign) {
      if (!this.grounded()) return false;
      if (isLocked(this.state) && !this.attackFinished()) return false;
      if (this.state === ST.HURT || this.state === ST.KNOCKDOWN || this.state === ST.KO) return false;
      if (this.grabTarget) return false; // can't dash while dragging a grabbed enemy — throw or knee first
      const isBack = dirSign !== this.facing;
      this.dashT = DASH_TICKS;
      this._dashDir = dirSign;
      if (!isBack) this.facing = dirSign;
      this.invulnT = Math.max(this.invulnT, isBack ? DASH_BACK_IFRAMES : DASH_FWD_IFRAMES);
      this.changeStateForce(ST.WALK);
      return true;
    }

    // v6.1: fires the grab-knee/grab-throw visual overlay. Called directly by
    // Campaign.grabKnee()/throwGrabbed() (world.js) — deliberately NOT a
    // state change, so it can't collide with the grab flow's own state
    // handling (grabKnee fires mid-hold, throwGrabbed fires the instant the
    // hold ends) and never blocks movement/input like a real attack would.
    playGrabAnim(pose) {
      if (!pose || !pose.frames || !pose.frames.length) return;
      this.grabAnim = pose;
      this.grabAnimT = pose.frames.length * (pose.ticksPerFrame || 8);
      this.frameT = 0;
    }

    update(bounds) {
      this.frameT++;
      this.controls.jump = false; // legacy flag, no longer drives jumping (see tryJump)
      if (this.grounded()) this.juggleCount = 0; // landing resets how many more airborne hits you can take
      if (this.hurtT > 0) this.hurtT--;
      if (this.invulnT > 0) this.invulnT--;
      if (this.comboWindowT > 0) { this.comboWindowT--; if (this.comboWindowT === 0) this.comboCount = 0; }
      if (this.grabAnimT > 0) { this.grabAnimT--; if (this.grabAnimT === 0) this.grabAnim = null; }

      // v3 grab/throw (Lior's Little Fighter ask): a grabbed victim's x/lane
      // is pinned externally, every tick, by Campaign._tickGrab (world.js) —
      // it's "glued" to the hero, not driven by its own controls/physics, so
      // update() does nothing here. This single early-return is also what
      // keeps AI off it: ai.js's tickGrunt already refuses to drive any
      // grunt whose state isn't idle/walk, so 'grabbed' falls out of AI
      // control for free, no ai.js change needed.
      if (this.state === 'grabbed') return;

      if (this.state === ST.KO) {
        this.vz -= GRAVITY; this.z = Math.max(0, this.z + this.vz);
        this.x += this.vx; this.vx *= 0.9;
        return;
      }
      if (this.state === ST.KNOCKDOWN) {
        this.vz -= GRAVITY; this.z = Math.max(0, this.z + this.vz);
        this.x += this.vx; this.vx *= 0.92;
        if (this.grounded() && this.vz <= 0) {
          this.knockdownT--;
          this.vz = 0;
          if (this.knockdownT <= 0) { this.changeStateForce(ST.IDLE); this.invulnT = 20; }
        }
        return;
      }
      if (this.state === ST.HURT) {
        this.x += this.vx; this.vx *= 0.8;
        if (bounds) this.x = clamp(this.x, bounds.lo, bounds.hi);
        if (this.hurtT <= 0) this.changeStateForce(ST.IDLE);
        return;
      }

      if (isAttack(this.state)) {
        // an attack started while airborne (e.g. a dive-kick) must not
        // freeze the actor mid-air until the move's frames run out — only
        // the POSE/hitbox is locked by isAttack, gravity still applies.
        // Pre-v3 this branch returned unconditionally, so any attack input
        // taken during a jump silently cancelled the jump's own physics.
        if (!this.grounded()) {
          this.vz -= GRAVITY; this.z = Math.max(0, this.z + this.vz);
          this.x += this.vx;
          if (bounds) this.x = clamp(this.x, bounds.lo, bounds.hi);
          if (this.grounded()) { this.vz = 0; this.vx = 0; } // landed mid-swing — let the attack's own frame timer finish the pose, don't force IDLE early
        }
        if (this.attackFinished()) this.changeStateForce(ST.IDLE);
        return;
      }

      // jump physics (airborne, not attacking)
      if (!this.grounded()) {
        this.vz -= GRAVITY; this.z = Math.max(0, this.z + this.vz);
        this.x += this.vx;
        if (bounds) this.x = clamp(this.x, bounds.lo, bounds.hi);
        if (this.grounded()) { this.vz = 0; this.vx = 0; this.changeStateForce(ST.IDLE); }
        return;
      }

      // grounded free control (jump itself is triggered immediately by
      // tryJump(), not polled here — see tryJump for why)
      const c = this.controls;
      this.facingLock = false;

      // dash burst in progress — overrides normal movement for a few ticks,
      // then either settles into a run (if the direction is still held) or
      // falls back to normal walking on the next tick.
      if (this.dashT > 0) {
        this.dashT--;
        this.x += this._dashDir * this.moveSpeed * DASH_SPEED_MULT;
        if (bounds) this.x = clamp(this.x, bounds.lo, bounds.hi);
        this.state = ST.WALK;
        if (this.dashT === 0) {
          const heldSameWay = (this._dashDir > 0 && c.right) || (this._dashDir < 0 && c.left);
          this.running = heldSameWay && this._dashDir === this.facing;
        }
        return;
      }

      if (c.guard) { this.changeState(ST.GUARD); return; }

      let dx = (c.right ? 1 : 0) - (c.left ? 1 : 0);
      let dy = (c.down ? 1 : 0) - (c.up ? 1 : 0);
      if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
      if (dx) this.facing = dx > 0 ? DIR.RIGHT : DIR.LEFT;
      else if (this.targetHint && this.targetHint.alive) this.facing = this.targetHint.x >= this.x ? DIR.RIGHT : DIR.LEFT;
      if (dx) {
        const fwd = dx > 0 ? DIR.RIGHT : DIR.LEFT;
        let spd = this.moveSpeed * (fwd === this.facing || this.kind !== 'hero' ? 1 : 0.82);
        if (this.running && fwd === this.facing) spd *= RUN_SPEED_MULT; else this.running = false;
        this.x += Math.sign(dx) * spd * Math.abs(dx);
        if (bounds) this.x = clamp(this.x, bounds.lo, bounds.hi);
      } else {
        this.running = false;
      }
      if (dy) {
        this.lane = clamp(this.lane + Math.sign(dy) * (LANE_SPEED_PX / 1000) * Math.abs(dy), 0, 1);
      }
      if (dx || dy) this.changeState(ST.WALK); else this.changeState(ST.IDLE);
    }

    // A pose may be a src string or {frames,ticksPerFrame,once}. `once` lets
    // reactions hold their final frame instead of looping like a walk cycle.
    _cycle(val) {
      if (!val) return null;
      if (typeof val === 'string') return val;
      const tpf = val.ticksPerFrame || 8;
      const raw = Math.floor(this.frameT / tpf);
      const idx = val.once ? Math.min(raw, val.frames.length - 1) : raw % val.frames.length;
      return val.frames[idx];
    }
    poseSrc() {
      const p = this.def.poses;
      if (isAttack(this.state) && this.attack && this.attack.frames.length) {
        const seq = this.attack.frames;
        const idx = clamp(Math.floor(this.frameT / this.attack.frameTicks), 0, seq.length - 1);
        return seq[idx] || this._cycle(p[this.state]) || this._cycle(p.idle);
      }
      // v6.1: grab-knee/grab-throw overlay — takes priority over grabHold
      // below (a knee/throw beat should show even mid-hold or the instant
      // the hold ends, not the generic hold pose). See playGrabAnim().
      if (this.grabAnim && this.grabAnimT > 0) return this._cycle(this.grabAnim);
      // held-victim pose (BIG.COM only — see roster.js poses().grabHold):
      // overrides idle/walk for as long as hero.grabTarget is set, regardless
      // of what state the hero is otherwise in, since tryGrab()/_tickGrab()
      // never touch hero.state at all (only the victim's state changes).
      if (this.grabTarget && p.grabHold) return this._cycle(p.grabHold);
      if (this.state === ST.JUMP && p.jump) return this._cycle(p.jump);
      if (this.state === ST.WALK && p.walk) return this._cycle(p.walk);
      if ((this.state === ST.HURT || this.state === ST.KNOCKDOWN || this.state === 'grabbed') && p.hurt) return this._cycle(p.hurt);
      if (this.state === ST.KO && (p.ko || p.hurt)) return this._cycle(p.ko || p.hurt);
      if (this.state === ST.GUARD && p.guard) return this._cycle(p.guard);
      return this._cycle(p.idle);
    }

    laneScreenY(view) { return view.h * (LANE_MIN + this.lane * (LANE_MAX - LANE_MIN)); }
    laneScale() { return 0.86 + this.lane * 0.28; } // nearer lane reads slightly bigger

    draw(ctx, cam, view) {
      const src = this.poseSrc();
      const im = loadImg(src);
      const baseScale = cam.scale * this.laneScale();
      let sx = (this.x - cam.x) * cam.scale;
      if (this.state === ST.HURT) {
        const mag = (this.hurtT > 6 ? 2.2 : 1.1) * cam.scale;
        sx += (this.frameT % 2 ? 1 : -1) * mag;
      }
      const floorScreenY = this.laneScreenY(view);
      const feetY = floorScreenY - this.z * baseScale;
      const h = (this.def.drawH || 210) * baseScale;
      let w = h * 0.62;
      if (im && im.complete && im.naturalWidth) w = h * (im.naturalWidth / im.naturalHeight);

      // shadow
      const shScale = clamp(1 - this.z / 300, 0.5, 1);
      ctx.save();
      ctx.globalAlpha = 0.30 * clamp(1 - this.z / 220, 0.18, 1);
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(sx, floorScreenY, w * 0.4 * shScale, Math.max(5, 9 * baseScale) * shScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (this.attack && this.attack.kind === 'special' && this.frameT < this.attack.contactStart) {
        const intensity = clamp((this.frameT + 1) / Math.max(1, this.attack.contactStart), 0.15, 1);
        drawAura(ctx, sx, feetY, h, w, this.def.auraColor || '#ffaa33', intensity);
      }

      if (im && im.complete && im.naturalWidth) {
        ctx.save();
        ctx.translate(sx, feetY);
        if (this.facing === DIR.LEFT) ctx.scale(-1, 1);
        if (this.invulnT > 0 && (Math.floor(this.frameT / 3) % 2)) ctx.globalAlpha = 0.45;
        ctx.drawImage(im, -w / 2, -h, w, h);
        ctx.restore();
      } else {
        // fallback silhouette while art loads, so nothing is ever invisible
        ctx.save();
        ctx.fillStyle = 'rgba(20,30,40,.5)';
        ctx.fillRect(sx - w * 0.28, feetY - h, w * 0.56, h);
        ctx.restore();
      }
    }
  }

  // ── World: owns hero + enemies[] + hazards, camera, loop, hit resolution ──
  class World {
    constructor(canvas, config) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.config = config || {};
      this.worldW = config.worldW || 6000;
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.view = { w: 0, h: 0 };
      this.resize();
      this.cam = new Camera(this.view, this.worldW);
      this.cam.scale = 1;
      this.hero = null;
      this.enemies = [];
      this.allies = [];    // e.g. FRISBEE after the crate breaks — fights independently, kind:'ally'
      this.hazards = [];   // e.g. courier
      this.fx = [];
      this.tickN = 0;
      this.running = false;
      this._raf = null; this._last = 0; this._acc = 0;
      this.onHit = config.onHit || function () {};
      this.onEnemyDown = config.onEnemyDown || function () {};
      this.onAllyDown = config.onAllyDown || function () {};
      this.onHeroDown = config.onHeroDown || function () {};
      this.hitstop = 0;
      this.drawStage = config.drawStage || null;
      this.tickHook = config.tickHook || null;
    }
    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.view.w = Math.max(1, Math.round(rect.width));
      this.view.h = Math.max(1, Math.round(rect.height));
      this.canvas.width = Math.round(this.view.w * this.dpr);
      this.canvas.height = Math.round(this.view.h * this.dpr);
      if (this.cam) this.cam.view = this.view;
      // fighters ~46% of screen height reads well on mobile landscape
      this._camScaleTarget = this.view.h * 0.46 / (this.hero ? (this.hero.def.drawH || 210) : 210);
      if (this.cam) this.cam.scale = this._camScaleTarget;
    }
    setHero(actor) { this.hero = actor; this.cam.scale = this.view.h * 0.46 / (actor.def.drawH || 210); }
    addEnemy(actor) { this.enemies.push(actor); return actor; }
    removeEnemy(actor) { const i = this.enemies.indexOf(actor); if (i >= 0) this.enemies.splice(i, 1); }
    addAlly(actor) { this.allies.push(actor); return actor; }
    removeAlly(actor) { const i = this.allies.indexOf(actor); if (i >= 0) this.allies.splice(i, 1); }

    spawnFx(type, x, lane, color, mag) {
      const jx = (Math.random() - 0.5) * 8;
      this.fx.push({ type, x: x + jx, lane, color: color || '#ffcc55', mag: mag || 1, seed: Math.random() * Math.PI * 2, born: this.tickN });
      if (this.fx.length > 40) this.fx.shift();
    }

    start() { this.running = true; this._last = performance.now(); this._loop(this._last); }
    stop() { this.running = false; if (this._raf) cancelAnimationFrame(this._raf); }
    pause() { this.running = false; if (this._raf) cancelAnimationFrame(this._raf); }
    resume() { if (this.running) return; this.running = true; this._last = performance.now(); this._acc = 0; this._loop(this._last); }

    _loop(now) {
      if (!this.running) return;
      try {
        const dt = Math.min(50, now - this._last); this._last = now;
        this._acc += dt;
        const step = 1000 / 60;
        let guard = 0;
        while (this._acc >= step && guard++ < 5) { this.tick(); this._acc -= step; }
        this.draw();
      } catch (e) {
        this._acc = 0;
        if (typeof console !== 'undefined' && console.error) console.error('World tick error (recovered):', e);
      }
      this._raf = requestAnimationFrame(this._loop.bind(this));
    }

    allActors() {
      const list = this.hero ? [this.hero] : [];
      return list.concat(this.allies, this.enemies);
    }

    tick() {
      this.tickN++;
      if (this.hitstop > 0) { this.hitstop--; return; }
      const bounds = { lo: 30, hi: this.worldW - 30 };
      // always update (even KO'd actors) so their fall physics settle and
      // frameT keeps advancing — onHeroDown/enemy-cleanup key off that timer
      if (this.hero) this.hero.update(bounds);
      this.allies.forEach(a => a.update(bounds));
      this.enemies.forEach(e => e.update(e.entering ? FREE_BOUNDS : bounds));
      this._separateAll();
      this._resolveAttacks();
      if (this.tickHook) this.tickHook(this);
      this.fx = this.fx.filter(i => this.tickN - i.born <= FX_LIFE[i.type]);
      if (this.hero) this.cam.update(this.hero.x);
      // clear dead enemies/allies after their KO pose has had a beat on screen
      // (an ally falling doesn't end the run — it just leaves the fight)
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (!e.alive && e.frameT > 40) { this.enemies.splice(i, 1); this.onEnemyDown(e); }
      }
      for (let i = this.allies.length - 1; i >= 0; i--) {
        const a = this.allies[i];
        if (!a.alive && a.frameT > 40) { this.allies.splice(i, 1); this.onAllyDown(a); }
      }
      if (this.hero && !this.hero.alive && this.hero.frameT > 60) this.onHeroDown(this.hero);
    }

    _separateAll() {
      const all = this.allActors().filter(a => a.alive);
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const a = all[i], b = all[j];
          if (Math.abs(a.lane - b.lane) > 0.22) continue; // different depth, no push
          const gap = PUSH_W * 2 - Math.abs(a.x - b.x);
          if (gap > 0 && a.grounded() && b.grounded()) {
            const push = gap / 2;
            if (a.x < b.x) { a.x -= push; b.x += push; } else { a.x += push; b.x -= push; }
          }
        }
      }
    }

    _resolveAttacks() {
      const all = this.allActors();
      for (const att of all) {
        if (!att.alive || att.contacted) continue;
        const hb = att.hitBox();
        if (!hb) continue;
        // hero/ally swing at enemies; grunt/boss swing at the hero or any ally
        // standing in the way (whichever they actually overlap, checked below)
        const targets = (att.kind === 'hero' || att.kind === 'ally')
          ? this.enemies
          : (this.hero ? [this.hero].concat(this.allies) : this.allies);
        let hitAny = false;
        for (const vic of targets) {
          if (!vic || !vic.alive || vic === att) continue;
          if (vic.entering) continue; // still off-screen/walking in — not a valid target yet
          if (vic.z > 70) {
            // the hero always stays safe from grounded attacks while jumping
            // (that's the whole point of jumping to dodge — see tryJump);
            // enemies/allies CAN keep getting hit while airborne so uppercut
            // → follow-up juggles actually work, capped so one launch can't
            // lock a victim forever.
            if (vic.kind === 'hero') continue;
            if (vic.juggleCount >= JUGGLE_CAP) continue;
          }
          if (Math.abs(vic.lane - hb.lane) > 0.26) continue; // must roughly share a lane
          const vb = vic.hurtBox();
          if (!aabb(hb, vb)) continue;
          hitAny = true;
          this._applyHit(att, vic, hb);
          if (!att.attack.cleave) break; // most moves hit one target; cleave moves hit all in range
        }
        if (hitAny) att.contacted = true;
      }
    }

    _applyHit(att, vic, hb) {
      const a = att.attack;
      const dmg = ri(Math.max(1, a.dmg - 3), a.dmg + 3);
      const guarding = vic.state === ST.GUARD;
      let finalDmg = guarding ? Math.max(1, Math.round(dmg * 0.25)) : dmg;

      // combo string (hero only): consecutive LANDED hits within
      // COMBO_WINDOW_TICKS of each other chain into rising damage, capped at
      // a 5-hit string (+32%) so it rewards keeping pressure up without
      // spiraling. A whiff or a pause longer than the window drops it.
      if (att.kind === 'hero') {
        att.comboCount = att.comboWindowT > 0 ? att.comboCount + 1 : 1;
        att.comboWindowT = COMBO_WINDOW_TICKS;
        if (!guarding) {
          const comboMult = 1 + Math.min(att.comboCount - 1, 4) * 0.08;
          finalDmg = Math.max(1, Math.round(finalDmg * comboMult));
        }
      }
      // airborne follow-up (juggle) — counts toward JUGGLE_CAP, checked in _resolveAttacks
      if (vic.z > 0) vic.juggleCount++;

      const dirFrom = att.facing === DIR.RIGHT ? 1 : -1;
      if (!guarding) {
        vic.takeHit(finalDmg, { launch: a.launch, knockback: a.knockback || 6, heavy: a.launch > 0 || a.kind === 'special', dirFrom });
      } else {
        // guard chips 25% through as damage but doesn't break the stance
        // (no state change, no hurtstun lock) — holding guard stays safe-ish, not free
        vic.hp = Math.max(0, vic.hp - finalDmg);
        vic.vx += -att.facing * 1.5;
        if (vic.hp <= 0) { vic.state = ST.KO; vic.frameT = 0; vic.attack = null; vic.alive = false; vic.vz = 6; }
      }
      if (a.energyGain && att.kind === 'hero') att.grantEnergy(a.energyGain);
      else if (att.kind === 'hero') att.grantEnergy(10);
      const col = att.def.auraColor || '#ffcc55';
      // v6.1: a landed special swaps in the energy-ball sprite ('nova' —
      // same FX_LIFE-tracked type as everything else, just a distinct art
      // asset) instead of the plain hit-spark, per CODEX-ART-BRIEF-v6-gaps.md P1.
      const fxType = guarding ? 'guard' : (a.kind === 'special' ? 'nova' : 'spark');
      this.spawnFx(fxType, vic.x, vic.lane, col, a.launch ? 1.3 : (att.comboCount > 1 ? 1.1 : 0.85));
      // hitstop grows slightly with the combo count for juicier feedback on longer strings
      this.hitstop = HITSTOP_TICKS + (att.kind === 'hero' ? Math.min(att.comboCount - 1, 3) : 0);
      if (att.onHitLanded) att.onHitLanded(vic, finalDmg);
      this.onHit({ attacker: att, victim: vic, dmg: finalDmg, guarded: guarding, launch: !!a.launch, special: a.kind === 'special', combo: att.comboCount, juggle: vic.juggleCount });
    }

    draw() {
      const ctx = this.ctx, view = this.view;
      ctx.save();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, view.w, view.h);
      if (this.drawStage) this.drawStage(ctx, this.cam, view, this);
      const list = this.allActors().filter(a => a.alive || a.frameT < 60);
      const overlay = [];
      // hazards that carry a numeric `lane` (e.g. the courier) join the same
      // depth sort as actors — so a bike in the far lane draws behind a hero
      // standing in front of it, instead of always painting on top. Lane-less
      // hazards keep the old "always on top" behaviour.
      if (this.hazards) for (const hz of this.hazards) {
        if (!hz.draw) continue;
        if (typeof hz.lane === 'number') list.push(hz); else overlay.push(hz);
      }
      list.sort((a, b) => a.lane - b.lane);
      list.forEach(d => d.draw(ctx, this.cam, view));
      overlay.forEach(h => h.draw(ctx, this.cam, view));
      const floorY = view.h * LANE_MIN;
      for (const item of this.fx) {
        const age = this.tickN - item.born;
        const sx = (item.x - this.cam.x) * this.cam.scale;
        const sy = view.h * (LANE_MIN + (item.lane || 0.5) * (LANE_MAX - LANE_MIN));
        drawFxItem(ctx, item, age, sx, sy, this.cam.scale);
      }
      ctx.restore();
    }
  }

  root.RUMBLE = {
    ST, DIR, Actor, World, Camera, loadImg, preload,
    constants: { GRAVITY, JUMP_V, LANE_MIN, LANE_MAX, PUSH_W }
  };
})(typeof window !== 'undefined' ? window : this);
