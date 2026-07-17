/* ══════════════════════════════════════════════════════════════════════════
   TLV WAR — Canvas combat engine (v6.0 rewrite)
   Street-Fighter-style feel driven by our EXISTING static pose images.
   ────────────────────────────────────────────────────────────────────────
   Design:
   • Classic (non-module) script → shares global scope with index.html so it
     can read IM / CH / pose-maps directly once integrated. Until then it runs
     from an injected TLVFIGHT.config (see buildConfigFromGlobals / test harness).
   • The canvas OWNS: fighters, stage floor, shadows, camera, physics, hitboxes.
     The DOM keeps: HUD bars, controller, full-screen overlays (KO/win/cine).
   • Each fighter STATE maps to ONE pose image (we have stills, not spritesheets);
     attacks play a short 2–3 pose micro-sequence (windup→active→recovery) with
     the hitbox live only on the active window. Positioning is by a LOGICAL origin
     at feet-center, so varying image widths never shift the character ("no jump").
   ══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  // ── World constants (logical units; camera maps them to canvas px) ──────────
  // Scene proportions follow the SF2 reference (Mayank-Jain-1/StreetFighter):
  // scene 382×224 with STAGE_FLOOR=218 (feet at ~97% of screen height) and
  // fighters ~110px ≈ half the screen height, FIXED scale, side-scroll camera.
  const FLOOR_Y      = 200;   // logical ground line (feet sit here)
  const STAGE_W      = 720;   // logical stage width (ref: 768 vs a 382 viewport)
  const FIGHTER_H    = 175;   // logical draw height of a fighter (feet→head)
  const FIGHTER_SCREEN_FRAC = 0.52; // fighter height as fraction of canvas height (ref ≈ 110/224)
  const FLOOR_SCREEN_FRAC   = 0.94; // feet line as fraction of canvas height (ref 218/224≈0.97; ours leaves HUD room)
  const GRAVITY      = 0.9;
  const JUMP_V       = 15;
  const WALK_SPEED   = 2.6;
  const START_GAP    = 210;   // logical distance between the two fighters at start
  const PUSH_W       = 40;    // half-width of the body push box (min center gap = 2×)
  const DIR = { LEFT: -1, RIGHT: 1 };

  // ── Fighter states ──────────────────────────────────────────────────────────
  const ST = {
    IDLE: 'idle', WALK_F: 'walkF', WALK_B: 'walkB',
    JUMP: 'jump', CROUCH: 'crouch',
    LP: 'lp', MP: 'mp', HP: 'hp', LK: 'lk', MK: 'mk', HK: 'hk',
    SPECIAL: 'special',
    GUARD_HI: 'guardHi', GUARD_LO: 'guardLo',
    HURT: 'hurt', KO: 'ko', WIN: 'win'
  };
  // Which pose-key (config.poses[state]) each state draws; attacks also carry a frame list.
  const ATTACK_STATES = [ST.LP, ST.MP, ST.HP, ST.LK, ST.MK, ST.HK, ST.SPECIAL];
  const isAttack = s => ATTACK_STATES.indexOf(s) >= 0;

  // ── Attack frame-data table (logical) ──────────────────────────────────────
  // startup/active/recovery in frames @60fps; box = hit region relative to facing.
  const ATK = {
    [ST.LP]: { startup: 3, active: 3, recovery: 6,  dmg: [4, 7],   reach: 70, boxY: [120, 160], h: 'high', energy: 0 },
    [ST.MP]: { startup: 5, active: 4, recovery: 10, dmg: [5, 9],   reach: 78, boxY: [110, 155], h: 'high', energy: 0 },
    [ST.HP]: { startup: 7, active: 4, recovery: 14, dmg: [6, 12],  reach: 86, boxY: [100, 150], h: 'high', energy: 0 },
    [ST.LK]: { startup: 4, active: 4, recovery: 8,  dmg: [5, 8],   reach: 78, boxY: [40, 90],   h: 'low',  energy: 0 },
    [ST.MK]: { startup: 6, active: 4, recovery: 12, dmg: [8, 12],  reach: 82, boxY: [30, 80],   h: 'low',  energy: 8 },
    [ST.HK]: { startup: 8, active: 5, recovery: 16, dmg: [10, 16], reach: 90, boxY: [60, 140],  h: 'high', energy: 12 },
    [ST.SPECIAL]: { startup: 8, active: 8, recovery: 20, dmg: [16, 26], reach: 96, boxY: [40, 160], h: 'high', energy: 45, special: true }
  };

  // ── Tiny helpers ────────────────────────────────────────────────────────────
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // ── Energy aura — a sustained "power flowing off the character" effect for
  // special-move windup (Lior's ask, genre-inspired — no reference assets used,
  // just an original procedural particle draw). Renders as thin light streaks
  // rising from the feet toward the head, intensifying as the strike nears,
  // using the fighter's own theme color (roster.js auraColor). Stateless/
  // procedural (driven by performance.now() + a per-streak seed) so there's
  // no particle array to allocate or garbage-collect every frame. ──────────
  function hexToRgb(hex) {
    hex = (hex || '#ffaa33').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
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
      const rise = 1 - t / cycle;               // 1 near feet, 0 near top
      const wobble = Math.sin(now * 0.0035 + seed) * w * 0.30;
      const px = sx + wobble;
      const py = feetY - t;
      const alpha = Math.max(0, rise) * 0.5 * intensity;
      if (alpha <= 0.01) continue;
      const rad = 4 + intensity * 5 * rise;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, rad);
      grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    // soft ground-level glow under the charging fighter
    const baseGlow = ctx.createRadialGradient(sx, feetY, 0, sx, feetY, w * 0.55);
    baseGlow.addColorStop(0, `rgba(${r},${g},${b},${0.28 * intensity})`);
    baseGlow.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = baseGlow;
    ctx.beginPath();
    ctx.ellipse(sx, feetY, w * 0.55, h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Image cache ─────────────────────────────────────────────────────────────
  const IMG = Object.create(null);
  function loadImg(src) {
    if (!src) return null;
    if (IMG[src]) return IMG[src];
    const im = new Image();
    im.src = src;
    IMG[src] = im;
    return im;
  }

  // ── MoveResolver: direction+button combo buffer, matches the original
  // game's cBuf semantics. The buffer holds the raw token sequence typed
  // since the last fire/reset (tokens like 'O','T','X','S' face buttons and
  // 'R','U','D' direction TAPS, never holds). Every push checks the WHOLE
  // buffer (not a sliding tail) against each move's seq:
  //   • exact match AND no longer move could still grow from this buffer
  //       → fires immediately (e.g. a lone 'X' can't start anything longer)
  //   • exact match BUT a longer move's seq still starts with this buffer
  //       → holds as a pending candidate for `graceMs`, giving the player a
  //         moment to keep pressing into the bigger combo (e.g. 'R' alone
  //         matches nothing, but 'R','S','T' is a valid prefix of EAR CUP
  //         KO, so it waits instead of never firing)
  //   • no match at all → keeps buffering; if the buffer stops being a
  //       prefix of anything, it restarts from just the newest token
  // Call poll(now) once per tick (e.g. from the battle loop) to fire a
  // pending candidate once its grace period elapses, and to expire stale
  // buffers after comboWindowMs of inactivity.
  class MoveResolver {
    constructor(moves, opts) {
      opts = opts || {};
      this.moves = moves;
      this.comboWindow = opts.comboWindow || 900;
      this.graceMs = opts.graceMs != null ? opts.graceMs : 220;
      this.buf = [];       // [{tok,t}]
      this.pending = null; // {move, t} best exact match seen, awaiting grace
    }
    _now(now) { return now || (typeof performance !== 'undefined' ? performance.now() : Date.now()); }
    _toks() { return this.buf.map(b => b.tok); }
    _isPrefixOf(seq) {
      const toks = this._toks();
      if (toks.length > seq.length) return false;
      for (let i = 0; i < toks.length; i++) if (toks[i] !== seq[i]) return false;
      return true;
    }
    _bestExact() {
      const toks = this._toks();
      let best = null;
      for (const mv of this.moves) {
        if (mv.seq.length !== toks.length) continue;
        let ok = true;
        for (let i = 0; i < toks.length; i++) if (mv.seq[i] !== toks[i]) { ok = false; break; }
        if (ok && (!best || mv.seq.length > best.seq.length)) best = mv;
      }
      return best;
    }
    _canExtend() {
      return this.moves.some(mv => mv.seq.length > this.buf.length && this._isPrefixOf(mv.seq));
    }
    push(tok, now) {
      now = this._now(now);
      if (this.buf.length && now - this.buf[0].t > this.comboWindow) { this.buf = []; this.pending = null; }
      this.buf.push({ tok, t: now });
      // dead-end buffer (matches nothing, extends nothing) → restart fresh from this token
      if (!this._canExtend() && !this._bestExact()) this.buf = [{ tok, t: now }];
      const exact = this._bestExact();
      if (exact) {
        if (this._canExtend()) { this.pending = { move: exact, t: now }; return null; } // could still grow
        this.buf = []; this.pending = null; return exact; // nothing longer possible — fire now
      }
      this.pending = null;
      return null;
    }
    // call every tick; returns a move if a pending/timed-out buffer resolves this frame
    poll(now) {
      now = this._now(now);
      if (this.pending && now - this.pending.t >= this.graceMs) {
        const mv = this.pending.move; this.buf = []; this.pending = null; return mv;
      }
      if (this.buf.length && now - this.buf[0].t > this.comboWindow) {
        // timed out with no exact match ever recorded — fall back to a plain
        // basic matching just the last token, if one exists, else drop it
        const last = this.buf[this.buf.length - 1].tok;
        this.buf = []; this.pending = null;
        return this.moves.find(mv => mv.seq.length === 1 && mv.seq[0] === last) || null;
      }
      return null;
    }
    clear() { this.buf = []; this.pending = null; }
  }

  // ── Camera: SF2-style — FIXED scale (no zoom pumping), side-scrolls to keep
  // both fighters framed, clamped to the stage edges. Scale is derived once
  // from the canvas HEIGHT so a fighter always stands ~52% of the screen tall,
  // exactly like the reference (fighters ~110px on a 224px scene). ──────────
  class Camera {
    constructor(view) {
      this.view = view;
      this.scale = (FIGHTER_SCREEN_FRAC * view.h) / FIGHTER_H;
      this.x = 0;
      this._init = false;
    }
    update(f1, f2) {
      const visW = this.view.w / this.scale;      // logical width visible on screen
      let target;
      if (visW >= STAGE_W) {
        target = (STAGE_W - visW) / 2;            // stage narrower than view → center it
      } else {
        const mid = (f1.x + f2.x) / 2;
        target = clamp(mid - visW / 2, 0, STAGE_W - visW);
      }
      if (!this._init) { this.x = target; this._init = true; }
      else this.x += (target - this.x) * 0.12;    // smooth scroll, no snapping
    }
  }

  // ── Fighter: state machine + physics + pose rendering ───────────────────────
  class Fighter {
    constructor(def, x, facing, isP1) {
      this.def = def;              // { id, name, poses:{state:src}, frames:{state:[src,...]} }
      this.x = x; this.y = 0;      // y = height above floor
      this.vx = 0; this.vy = 0;
      this.facing = facing;
      this.isP1 = isP1;
      this.state = ST.IDLE;
      this.frameT = 0;             // frames elapsed in current state
      this.attack = null;          // active ATK entry
      this.attackDone = false;     // already applied damage this swing
      this.hp = def.hp || 100;
      this.maxHp = this.hp;
      this.energy = 100;
      this.maxEnergy = 100;
      this.opponent = null;
      this.hurtT = 0;
      this.controls = { left: false, right: false, up: false, down: false, guard: false };
      this.pressed = {};           // edge-triggered attack requests
      this.customFrames = null;    // per-move pose sequence (named specials)
      this.moveName = null;        // display name of the move in flight
      this.moveCine = null;        // cinematic video src, if this move is a cutscene
      this.onMove = null;          // callback(fighter) fired when a move starts
    }

    grounded() { return this.y <= 0.001; }

    changeState(s) {
      if (this.state === s) return;
      // block interrupts while attacking or hurt, unless it's a KO/hurt override
      if ((isAttack(this.state) && !this.attackDone && s !== ST.KO && s !== ST.HURT)) return;
      this.state = s;
      this.frameT = 0;
      this.attackDone = false;
      this.attack = ATK[s] || null;
    }

    // startAttack(state) for stock moves, or startAttack('special', def) for a
    // named move. def accepts EITHER the engine's own shape (name/energy/dmg)
    // OR the original game's move-table shape verbatim (n/e/d/seq/ac/fin/air/
    // cine/charge/chargeAmt) so the real MVB/MVR/MVI/MVY/MVS/MVF arrays from
    // index.html can be passed straight through with zero translation:
    //   { n, e, d:[min,max], frames:[src...], reach, boxY, h:'high'|'low',
    //     startup, active, recovery, fin, cine, charge, chargeAmt }
    // Returns true if the move actually fired (false if busy/dead/insufficient energy).
    startAttack(s, def) {
      if (isAttack(this.state) && !this.attackDone) return false; // busy
      if (this.state === ST.HURT || this.state === ST.KO) return false;
      if (def) {
        const name = def.name || def.n || null;
        const cost = def.energy != null ? def.energy : (def.e || 0);
        const dmg = def.dmg || def.d || [0, 0];
        const charge = !!def.charge;
        if (cost && this.energy < cost) return false; // can't afford it
        this.state = s; this.frameT = 0; this.attackDone = false;
        if (cost) this.energy = Math.max(0, this.energy - cost);
        this.attack = {
          startup: def.startup || 8, active: def.active || 8, recovery: def.recovery || 20,
          dmg, reach: def.reach || 96, boxY: def.boxY || [40, 160],
          h: def.h || 'high', energy: cost,
          special: !!(def.special || def.fin || def.cat === 'special'),
          charge
        };
        this.customFrames = def.frames || null;
        this.moveName = name;
        this.moveCine = def.cine || null;
        this.lastAc = def.ac || null;
        if (charge) {
          this.energy = Math.min(this.maxEnergy, this.energy + (def.chargeAmt || 30));
          this.attackDone = true; // no hitbox window — charge never lands on anyone
        }
      } else {
        this.state = s; this.frameT = 0; this.attackDone = false;
        this.attack = ATK[s];
        this.customFrames = null; this.moveName = null; this.moveCine = null;
      }
      if (this.onMove) this.onMove(this);
      return true;
    }

    // small energy refund for landing a free (0-cost) move — mirrors the
    // original game's basics-recharge-a-little feel
    grantEnergy(amt) { this.energy = Math.min(this.maxEnergy, this.energy + amt); }

    takeHit(dmg, weight) {
      this.hp = Math.max(0, this.hp - dmg);
      if (this.hp <= 0) { this.state = ST.KO; this.frameT = 0; this.attack = null; return; }
      this.state = ST.HURT; this.frameT = 0; this.attack = null;
      this.hurtT = weight === 'heavy' ? 22 : 12;
      // small knockback
      this.vx += -this.facing * (weight === 'heavy' ? 4 : 2);
    }

    // logical boxes ------------------------------------------------------------
    pushBox() { return { x: this.x - PUSH_W, y: 0, w: PUSH_W * 2, h: FIGHTER_H }; }
    hurtBox() {
      const crouch = this.state === ST.CROUCH || this.state === ST.GUARD_LO;
      const top = crouch ? FIGHTER_H * 0.55 : FIGHTER_H;
      return { x: this.x - 34, y: this.y, w: 68, h: top };
    }
    hitBox() {
      if (!this.attack) return null;
      const a = this.attack;
      const activeStart = a.startup, activeEnd = a.startup + a.active;
      if (this.frameT < activeStart || this.frameT >= activeEnd) return null;
      const w = a.reach - 30;
      const x = this.facing === DIR.RIGHT ? this.x + 20 : this.x - 20 - w;
      return { x, y: this.y + a.boxY[0], w, h: a.boxY[1] - a.boxY[0], h_level: a.h };
    }

    update() {
      const c = this.controls;
      this.frameT++;

      if (this.state === ST.KO) { // fall in place
        this.vy -= GRAVITY; this.y = Math.max(0, this.y + this.vy);
        return;
      }
      if (this.state === ST.HURT) {
        this.hurtT--;
        this.x += this.vx; this.vx *= 0.8;
        if (this.hurtT <= 0) this.changeStateForce(ST.IDLE);
        this._applyGravity();
        return;
      }

      // face the opponent when grounded & idle-ish
      if (this.opponent && this.grounded() && !isAttack(this.state)) {
        this.facing = this.opponent.x >= this.x ? DIR.RIGHT : DIR.LEFT;
      }

      // resolve attacks in flight
      if (isAttack(this.state)) {
        const a = this.attack;
        const total = a.startup + a.active + a.recovery;
        if (this.frameT >= total) { this.changeStateForce(ST.IDLE); }
        this._applyGravity();
        return;
      }

      // jump physics
      if (!this.grounded()) {
        this._applyGravity();
        if (this.grounded()) this.changeStateForce(ST.IDLE);
        return;
      }

      // grounded movement / stance
      if (c.up) { this.vy = JUMP_V; this.changeStateForce(ST.JUMP); this._applyGravity(); return; }
      if (c.guard) { this.changeStateForce(c.down ? ST.GUARD_LO : ST.GUARD_HI); return; }
      if (c.down) { this.changeStateForce(ST.CROUCH); return; }

      const fwd = this.opponent && this.opponent.x >= this.x ? DIR.RIGHT : DIR.LEFT;
      if (c.right || c.left) {
        const dir = c.right ? DIR.RIGHT : DIR.LEFT;
        this.x = clamp(this.x + dir * WALK_SPEED, PUSH_W, STAGE_W - PUSH_W);
        this.changeStateForce(dir === fwd ? ST.WALK_F : ST.WALK_B);
      } else {
        this.changeStateForce(ST.IDLE);
      }
    }

    _applyGravity() {
      if (!this.grounded() || this.vy > 0) {
        this.vy -= GRAVITY;
        this.y = Math.max(0, this.y + this.vy);
        this.x += this.vx; this.vx *= 0.96;
      }
    }

    // force a state change that bypasses the interrupt guard (internal transitions)
    changeStateForce(s) {
      if (this.state === s) return;
      this.state = s; this.frameT = 0; this.attack = ATK[s] || null; this.attackDone = false;
    }

    poseSrc() {
      const p = this.def.poses;
      // attacks: pick frame from micro-sequence by active window
      const seqSrc = isAttack(this.state)
        ? (this.customFrames || (this.def.frames && this.def.frames[this.state]))
        : null;
      if (seqSrc) {
        const seq = seqSrc;
        const a = this.attack;
        const idx = this.frameT < a.startup ? 0
                  : this.frameT < a.startup + a.active ? Math.min(1, seq.length - 1)
                  : Math.min(seq.length - 1, 2);
        return seq[Math.min(idx, seq.length - 1)] || p[this.state] || p[ST.IDLE];
      }
      return p[this.state] || p[ST.IDLE];
    }

    draw(ctx, cam, view) {
      const src = this.poseSrc();
      const im = loadImg(src);
      const sc = cam.scale;
      // world→screen: x maps around camera; feet anchored to the SF2-style low floor line
      const sx = (this.x - cam.x) * sc;
      const floorScreenY = view.h * FLOOR_SCREEN_FRAC;
      const feetY = floorScreenY - (this.y * sc);
      const h = FIGHTER_H * sc;
      let w = h * 0.62; // fallback aspect
      if (im && im.complete && im.naturalWidth) w = h * (im.naturalWidth / im.naturalHeight);

      // shadow
      ctx.save();
      ctx.globalAlpha = 0.32 * clamp(1 - this.y / 220, 0.2, 1);
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(sx, floorScreenY, w * 0.42, Math.max(6, 10 * sc), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // energy aura — only during a special/finisher's startup (windup) window,
      // ramping up as the strike approaches so it reads as "charging"
      if (this.attack && this.attack.special && this.frameT < this.attack.startup) {
        const intensity = clamp((this.frameT + 1) / Math.max(1, this.attack.startup), 0.15, 1);
        drawAura(ctx, sx, feetY, h, w, (this.def && this.def.auraColor) || '#ffaa33', intensity);
      }

      if (im && im.complete && im.naturalWidth) {
        ctx.save();
        ctx.translate(sx, feetY);
        if (this.facing === DIR.LEFT) ctx.scale(-1, 1);
        if (this.state === ST.KO) ctx.rotate(0);
        ctx.drawImage(im, -w / 2, -h, w, h);
        ctx.restore();
      }
    }
  }

  // ── Battle scene: owns fighters, camera, loop, hit resolution ────────────────
  class Battle {
    constructor(canvas, config) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.config = config;
      this.view = { w: canvas.width, h: canvas.height };
      this.cam = new Camera(this.view);
      const p1def = config.fighters[config.p1];
      const p2def = config.fighters[config.p2];
      this.f1 = new Fighter(p1def, STAGE_W / 2 - START_GAP / 2, DIR.RIGHT, true);
      this.f2 = new Fighter(p2def, STAGE_W / 2 + START_GAP / 2, DIR.LEFT, false);
      this.f1.opponent = this.f2; this.f2.opponent = this.f1;
      this.running = false;
      this.onHit = config.onHit || function () {};
      this.onKO = config.onKO || function () {};
      this.koFired = false;
      this._raf = null;
      this._last = 0;
      this._acc = 0;
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
        this.running = false;
        if (typeof window !== 'undefined' && window.onerror) {
          window.onerror('Battle loop threw: ' + e.message, 'tlvfight.js', 0, 0, e);
        }
        throw e;
      }
      this._raf = requestAnimationFrame(this._loop.bind(this));
    }

    tick() {
      this.f1.update();
      this.f2.update();
      this._separate();
      this._resolveHits(this.f1, this.f2);
      this._resolveHits(this.f2, this.f1);
      this.cam.update(this.f1, this.f2);
      if (!this.koFired && (this.f1.hp <= 0 || this.f2.hp <= 0)) {
        this.koFired = true;
        this.onKO(this.f1.hp <= 0 ? this.f2 : this.f1);
      }
    }

    _separate() {
      const a = this.f1.pushBox(), b = this.f2.pushBox();
      if (aabb(a, b)) {
        const overlap = (a.x + a.w) - b.x < b.x + b.w - a.x
          ? (a.x + a.w) - b.x : 0;
        const push = (PUSH_W * 2 - Math.abs(this.f1.x - this.f2.x)) / 2;
        if (push > 0) {
          if (this.f1.x < this.f2.x) { this.f1.x -= push; this.f2.x += push; }
          else { this.f1.x += push; this.f2.x -= push; }
          this.f1.x = clamp(this.f1.x, PUSH_W, STAGE_W - PUSH_W);
          this.f2.x = clamp(this.f2.x, PUSH_W, STAGE_W - PUSH_W);
        }
      }
    }

    _resolveHits(att, vic) {
      if (att.attackDone) return;
      const hb = att.hitBox(); if (!hb) return;
      const vb = vic.hurtBox();
      if (!aabb(hb, vb)) return;
      att.attackDone = true;
      const a = att.attack;
      // guard check
      const guarding = (vic.state === ST.GUARD_HI || vic.state === ST.GUARD_LO);
      const correct = guarding && ((hb.h_level === 'high' && vic.state === ST.GUARD_HI) ||
                                   (hb.h_level === 'low' && vic.state === ST.GUARD_LO));
      let dmg = ri(a.dmg[0], a.dmg[1]);
      let weight = a.special ? 'heavy' : (dmg >= 10 ? 'heavy' : 'light');
      if (guarding) { dmg = Math.max(1, Math.round(dmg * (correct ? 0.22 : 0.55))); }
      vic.takeHit(dmg, weight);
      if (!a.energy) att.grantEnergy(4); // free basics trickle energy back, like the original
      this.onHit({ attacker: att, victim: vic, dmg, guarded: guarding && correct, weight, special: !!a.special });
    }

    draw() {
      const ctx = this.ctx, view = this.view;
      ctx.clearRect(0, 0, view.w, view.h);
      // stage backdrop (config may draw its own; default gradient floor)
      if (this.config.drawStage) this.config.drawStage(ctx, this.cam, view);
      else {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(0, view.h * FLOOR_SCREEN_FRAC, view.w, 2);
      }
      // draw far fighter first (depth by y)
      const order = [this.f1, this.f2];
      order.forEach(f => f.draw(ctx, this.cam, view));
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────
  root.TLVFIGHT = {
    ST, DIR, Fighter, Battle, Camera, MoveResolver, loadImg,
    constants: { FLOOR_Y, STAGE_W, FIGHTER_H, FIGHTER_SCREEN_FRAC, FLOOR_SCREEN_FRAC, GRAVITY, JUMP_V, WALK_SPEED, START_GAP }
  };
})(typeof window !== 'undefined' ? window : this);
