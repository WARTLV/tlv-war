/* ══════════════════════════════════════════════════════════════════════════
   ROTHSCHILD RUMBLE — campaign world: scrolling street, wave/boss gates,
   the blue courier hazard, and a procedural Rothschild-Blvd parallax
   background (palette from docs/CHARACTERS-AND-ART-BIBLE.md). Production
   photo tiles don't exist yet (documented gap) — this stands in at launch
   quality and can be swapped for painted tiles later without touching
   gameplay code (drawStage is a single pluggable function).
   ══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const RUMBLE = root.RUMBLE, ROSTER = root.ROSTER, AI = root.AI;

  const CHAPTER_LEN = 1500;
  // v11: 3→6 districts (CODEX-ART-BRIEF-v7.md P0 delivered) — see roster.js
  // BOSS_ORDER, now one array of boss ids per chapter (chapters 4-6 pair up
  // the existing three bosses rather than adding new ones).
  const CHAPTERS = 6;
  const FINISH_X = CHAPTERS * CHAPTER_LEN + 260;
  const WORLD_W = FINISH_X + 500;
  const BIKE_LANE = 0.30;
  const DISTRICTS = ['הבימה', 'השדרה', 'הקיוסק', 'בית העצמאות', 'מגדלי רוטשילד', 'נווה צדק'];
  const CRATE_HP = 34;
  const CRATE_W = 74;
  const PALETTE = {
    ink: '#07151F', navy: '#0B2940', blue: '#1D7196',
    foliageDark: '#17483F', foliageMid: '#2E6A55',
    sandstone: '#D5B77A', stucco: '#E7DDC8', asphalt: '#385769',
    bikeRed: '#9E443D', warnYellow: '#E6B449', cream: '#F4D99D'
  };

  // ── v3: wave grunts walk in from off-screen instead of popping into
  // existence in front of the player (Lior: "הגל של ההומלסים צריך להגיע
  // מהקצה של המסך כאילו הם נכנסו לפריים ולא כאילו הם נופלים מהשמיים").
  // See Campaign._startGate / _tickEntrances below. ──
  const ENTER = {
    MARGIN: 90,       // world units past the screen edge a spawn must clear
    SPEED_MULT: 1.9,  // entrants jog in faster than their normal AI pace
    TIMEOUT: 300       // safety valve — force-clear after 5s even if never "on screen"
  };

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  // ── v3: the courier becomes a real, dodgeable hazard instead of an
  // always-in-BIKE_LANE, always-right-to-left, screen-space sprite that the
  // hero (spawning at lane 0.55, outside the old 0.30±0.22 danger band)
  // could never actually be hit by. Lior: "לגבי השליח צריך לעשות את זה
  // מעניין יותר... שהוא יגיע מהרבה מקומות ולא רק מהשביל וצריך להתחמק ולא
  // להיות בנתיב שלו או לחילופין לקפוץ." Now world-space (so it scrolls with
  // the road paint instead of sliding against it), random+biased lane
  // (frozen at telegraph time — never re-aimed, or dodging would be a lie),
  // either direction, and depth-sorted into World.draw like an actor. ──
  // v3 art delivery (section ה): 3 vehicle variants beyond the original bike,
  // so the courier doesn't read as the exact same sprite every single run —
  // picked once per spawn in _spawnCourier, stored on the run object.
  const COURIER_IMGS = [
    'assets/courier/blue-courier.png',
    'assets/courier/blue-courier-scooter.png',
    'assets/courier/blue-courier-moped.png',
    'assets/courier/blue-courier-ebike.png'
  ];
  const COURIER_IMG = COURIER_IMGS[0];
  const COURIER = {
    H: 118,          // logical draw height, same units as Actor.def.drawH
    HALF_W: 46,       // world-unit hit half-width
    LANE_BAND: 0.16,  // lane tolerance for a hit
    DODGE_Z: 95,      // hero z that clears the handlebars (matches the old contract)
    MARGIN: 130,      // world units past the screen edge a spawn must clear (bike half-width ≈101)
    WARN_BASE: 70,    // minimum telegraph ticks before a bike enters frame
    MIN_REACT: 110,   // telegraph+travel must total at least this many ticks (1.83s @60fps)
    FIRST_WARN: 110,  // the teaching run (courierCount===0) gets a longer read
    SPEEDS: [6.5, 9.0, 12.0], // world units/tick: cruiser / commuter / rush
    DMG: 16
  };
  const COURIER_GAP = [[780, 960], [620, 780], [480, 660]]; // ticks between runs, per chapter (gets busier)

  // ── v3: crate-dropped weapons (LF-style upgrade #2, alongside dash/run and
  // divekick/runattack). Extends the SAME breakable-crate pattern already
  // used for the FRISBEE story crate (drawCrate/_tickCrate) instead of a
  // parallel system — these are just loose, non-blocking props scattered
  // along the street, one per chapter. Breaking one drops a pickup; walking
  // over it arms the hero. Punch becomes a stronger melee swing while armed;
  // kick throws it as a projectile that can hit at range and ends the
  // weapon. See Campaign._tickWeaponCrates/_tickPickups/_tickProjectiles/
  // throwWeapon and main.js's onPunch/onKick routing. ──
  const WEAPON_CRATE_HP = 22;
  const WEAPON_USES = 5;
  const PICKUP_RANGE = 40;
  const PICKUP_LANE_TOL = 0.3;
  const THROW_SPEED = 14;
  const THROW_DMG_MULT = 1.3;

  // ── v3: grab & throw (LF-style upgrade #3). Hero-only (per CEO scope cut —
  // enemies don't grab back this round): hitting a grunt into ST.HURT and
  // then getting close lets the hero grab it — glued to the hero's position
  // every tick (Campaign._tickGrab), immune to normal AI (Actor.update()
  // early-returns on state==='grabbed', and ai.js's tickGrunt already skips
  // any non-idle/walk state for free). Punch knees it (repeatable, capped);
  // kick/uppercut throws it as a flying body that can hit OTHER enemies in
  // its path (_tickThrownVictim) before it lands — same "hits along a path"
  // shape as the weapon projectile above, just riding a real Actor instead
  // of a plank. ──
  const GRAB_RANGE = 70;
  const GRAB_TIMEOUT = 180; // auto-release (into a throw) after 3s so it can't lock forever
  const GRAB_MAX_KNEES = 3;

  // v3 art delivery: real weapon images instead of the procedural "plank"
  // placeholder — one kind is picked per crate at creation time (below),
  // carried through pickup → held → thrown via the `kind` field that was
  // already plumbed end-to-end in v3 (just fed by a hardcoded 'melee' before
  // any of this art existed).
  const WEAPON_IMG = {
    'scooter-handle': 'assets/weapons/scooter-handle.png',
    'beer-bottle': 'assets/weapons/beer-bottle.png',
    'street-sign': 'assets/weapons/street-sign.png',
    'mangal-skewer': 'assets/weapons/mangal-skewer.png',
    'cafe-umbrella': 'assets/weapons/cafe-umbrella.png',
    'protest-placard': 'assets/weapons/protest-placard.png'
  };
  const WEAPON_KINDS = Object.keys(WEAPON_IMG);

  // v6.1: breakable street props (CODEX-ART-BRIEF-v6-gaps.md P2) — an
  // alternative skin for a loose weapon crate, same break-drops-a-weapon
  // logic (_tickWeaponCrates below is completely unchanged). `undefined`
  // (the plain wooden crate, no art needed) stays in the pool so it doesn't
  // fully replace the original — see drawCrate's propKind branch.
  const PROP_IMG = {
    bench: 'assets/props/breakables/bench.png',
    'cafe-table': 'assets/props/breakables/cafe-table.png',
    trashcan: 'assets/props/breakables/trashcan.png'
  };
  const PROP_KINDS = [undefined, undefined, ...Object.keys(PROP_IMG)]; // weight the plain crate 2x so it's still the most common sight

  // v6.1: real district parallax backgrounds (assets/scenes-v6/), delivered
  // against CODEX-ART-BRIEF-v6-gaps.md P0 — one set per DISTRICTS entry
  // (הבימה→habima, השדרה→boulevard, הקיוסק→kiosk), three layers each
  // (sky/mid/near). drawStage below falls back to the original procedural
  // skyline/mid/tree/prop drawing whenever the current district's images
  // haven't finished loading yet, so there's never a blank frame.
  // v11: districts 4-6 (independence/towers/nevetzedek) were delivered into
  // assets/scenes-v7/ — a separate folder from the original three (v6.1's
  // assets/scenes-v6/) — so the path builder now looks up each prefix's own
  // folder instead of assuming scenes-v6 for everything.
  const DISTRICT_BG_PREFIX = ['habima', 'boulevard', 'kiosk', 'independence', 'towers', 'nevetzedek'];
  const DISTRICT_BG_FOLDER = {
    habima: 'scenes-v6', boulevard: 'scenes-v6', kiosk: 'scenes-v6',
    independence: 'scenes-v7', towers: 'scenes-v7', nevetzedek: 'scenes-v7'
  };
  const BG_LAYERS = ['sky', 'mid', 'near'];
  // how much of each layer's own leftover width (past the viewport) the
  // district's progress consumes — low = distant/barely drifts, high =
  // foreground/slides more. Creates parallax depth without needing
  // seamlessly tileable art (these are one-shot panorama plates).
  const BG_DRIFT = { sky: 0.12, mid: 0.4, near: 1 };
  const districtBgPath = (prefix, layer) => `assets/${DISTRICT_BG_FOLDER[prefix] || 'scenes-v6'}/${prefix}-${layer}.png`;

  // draws one background layer with a true "cover" fit (max of width/height
  // scale, like CSS background-size:cover — the plates are already used
  // that way on the title screen, see css/main.css's #title), offset
  // horizontally by driftFrac*progress of its own scale-up width past the
  // viewport. v10: was height-fit only, which left a hard vertical gap on
  // any viewport wider than the plate's own 2.33:1 aspect (ultrawide
  // monitors, a short docked devtools window) — cover never leaves a gap;
  // it just also crops vertically (centered) on those wider views, same
  // trade-off CSS cover always makes. Returns false (draws nothing) if the
  // image hasn't loaded yet.
  function drawDistrictLayer(ctx, view, img, driftFrac, progress) {
    if (!(img && img.complete && img.naturalWidth)) return false;
    const scale = Math.max(view.w / img.naturalWidth, view.h / img.naturalHeight);
    const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
    const maxOffsetX = Math.max(0, dw - view.w);
    const offsetX = maxOffsetX * driftFrac * progress;
    const offsetY = (dh - view.h) / 2;
    ctx.drawImage(img, -offsetX, -offsetY, dw, dh);
    return true;
  }

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // wave size escalates chapter-over-chapter (more homeless further down the
  // boulevard) AND varies gate-to-gate within a chapter (not a flat ramp) —
  // "גלים בגודל משתנה לאורך הזמן". Skewed jitter so waves usually grow
  // rather than shrink, capped so it never floods the screen.
  function waveCount(chapter) {
    const base = 3 + chapter;
    const jitter = [-1, 0, 0, 1, 1, 2][Math.floor(Math.random() * 6)];
    return Math.max(2, Math.min(7, base + jitter));
  }

  function buildGates(bossLineup) {
    const gates = [];
    for (let c = 0; c < CHAPTERS; c++) {
      const base = c * CHAPTER_LEN;
      gates.push({ type: 'wave', x: base + 280, count: waveCount(c), chapter: c });
      gates.push({ type: 'wave', x: base + 640, count: waveCount(c), chapter: c });
      // רוטוויילר רוטשילד — a recurring "elite" 1v1, tougher than any grunt
      // but well under a real boss (Lior: "לא בוס ולא הומלס, הוא בין לבין").
      // A distinct gate type (not 'boss') so he never touches bossesCleared/
      // the 3-boss win condition — see _startGate/_clearGate below.
      gates.push({ type: 'elite', x: base + 820, chapter: c });
      gates.push({ type: 'wave', x: base + 1000, count: waveCount(c), chapter: c });
      gates.push({ type: 'boss', x: base + 1300, bossId: bossLineup[c], gateIndex: c, chapter: c });
      // after the first chapter's boss (T.M.R as of v3 — see roster.js
      // BOSS_ORDER), a breakable crate blocks the street — smashing it
      // frees FRISBEE, who joins as an independent ally for the rest of the
      // run (see Campaign._breakCrate)
      if (c === 0) gates.push({ type: 'crate', x: base + 1300 + 260, chapter: c });
    }
    return gates;
  }

  // ── procedurally generated, DETERMINISTIC city dressing across the whole
  // world length — generated once, culled to viewport every draw. ──────────
  function generateCity() {
    const rnd = mulberry32(20260817);
    const skyline = [], mid = [], trees = [], props = [];
    for (let x = -100; x < WORLD_W + 100; x += 130 + rnd() * 70) {
      skyline.push({ x, w: 70 + rnd() * 90, h: 60 + rnd() * 90 });
    }
    for (let x = -100; x < WORLD_W + 100; x += 190 + rnd() * 90) {
      const tone = rnd();
      mid.push({
        x, w: 120 + rnd() * 110, h: 130 + rnd() * 130,
        color: tone < 0.34 ? PALETTE.stucco : tone < 0.67 ? PALETTE.sandstone : PALETTE.navy,
        windows: 3 + Math.floor(rnd() * 3)
      });
    }
    for (let x = -80; x < WORLD_W + 80; x += 230 + rnd() * 120) {
      trees.push({ x, r: 32 + rnd() * 16, dark: rnd() < 0.5 });
    }
    for (let x = 100; x < WORLD_W; x += 420 + rnd() * 160) {
      props.push({ x, kind: rnd() < 0.5 ? 'lamp' : 'bench' });
    }
    return { skyline, mid, trees, props };
  }

  function drawStage(ctx, cam, view, world, campaign) {
    const sc = cam.scale;
    const sx = (worldX, factor) => (worldX - cam.x * factor) * sc;

    // v6.1: real district backgrounds (see DISTRICT_BG_PREFIX above) replace
    // the procedural sky/skyline/mid/tree/prop drawing once loaded, with a
    // crossfade into the next district over the last 15% of each chapter.
    // heroX (not cam.x) decides the district — matches the existing
    // onDistrictChange trigger below (Campaign.tick), so the HUD label and
    // the actual art switch at the same point.
    const heroX = world.hero ? world.hero.x : cam.x;
    const distFloat = Math.max(0, heroX) / CHAPTER_LEN;
    const distIdx = Math.min(DISTRICTS.length - 1, Math.floor(distFloat));
    const nextIdx = Math.min(DISTRICTS.length - 1, distIdx + 1);
    const localProg = clamp01(distFloat - distIdx);
    const FADE_FROM = 0.85;
    const fadeT = nextIdx !== distIdx ? clamp01((localProg - FADE_FROM) / (1 - FADE_FROM)) : 0;

    // v10: warm the NEXT district's images the moment we enter this one —
    // not just once we're 85% through it. loadImg() is a cached, idempotent
    // kickoff (engine.js), so calling it every frame costs nothing once the
    // fetch is in flight or done; this just moves the fetch's START time
    // from "225 world units before the boundary" to "the whole chapter",
    // which is what actually kills the fade-to-black→procedural-city→
    // snap-back-to-photoreal cycle the images-not-loaded-yet path used to
    // produce at every single district crossing.
    if (nextIdx !== distIdx) {
      BG_LAYERS.forEach(layer => RUMBLE.loadImg(districtBgPath(DISTRICT_BG_PREFIX[nextIdx], layer)));
    }

    let bgReady = true;
    BG_LAYERS.forEach(layer => {
      const im = RUMBLE.loadImg(districtBgPath(DISTRICT_BG_PREFIX[distIdx], layer));
      if (!(im && im.complete && im.naturalWidth)) bgReady = false;
    });

    if (bgReady) {
      BG_LAYERS.forEach(layer => {
        const curImg = RUMBLE.loadImg(districtBgPath(DISTRICT_BG_PREFIX[distIdx], layer));
        // v10: the outgoing plate stays at full alpha 1 for the whole
        // crossfade — only the incoming plate ramps 0→1. Drawing BOTH at
        // fractional alpha (the old `1 - fadeT` here) compounds under
        // canvas's source-over blending, so the combined coverage bottomed
        // out around 75% at fadeT=0.5 — the entire frame visibly washed out
        // toward the ink background mid-transition, on top of a real
        // crossfade look most players wouldn't otherwise have questioned.
        ctx.globalAlpha = 1;
        drawDistrictLayer(ctx, view, curImg, BG_DRIFT[layer], localProg);
        if (fadeT > 0) {
          const nextImg = RUMBLE.loadImg(districtBgPath(DISTRICT_BG_PREFIX[nextIdx], layer));
          if (nextImg && nextImg.complete && nextImg.naturalWidth) {
            ctx.globalAlpha = fadeT;
            drawDistrictLayer(ctx, view, nextImg, BG_DRIFT[layer], 0);
          }
        }
      });
      ctx.globalAlpha = 1;
    } else {
      // fallback: original procedural city (still-loading images, or a
      // future district past what's been generated) — unchanged from v3.
      const skyGrad = ctx.createLinearGradient(0, 0, 0, view.h * 0.7);
      skyGrad.addColorStop(0, PALETTE.ink);
      skyGrad.addColorStop(1, PALETTE.navy);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, view.w, view.h);

      // distant skyline (parallax .16)
      ctx.fillStyle = 'rgba(11,41,64,0.85)';
      campaign.city.skyline.forEach(b => {
        const bx = sx(b.x, 0.16);
        if (bx < -150 || bx > view.w + 150) return;
        const h = b.h * sc * 0.6, w = b.w * sc * 0.6;
        ctx.fillRect(bx, view.h * 0.62 - h, w, h);
      });

      // mid building band (parallax .35) with Bauhaus flat roofs + windows
      campaign.city.mid.forEach(b => {
        const bx = sx(b.x, 0.35);
        if (bx < -220 || bx > view.w + 220) return;
        const h = b.h * sc * 0.72, w = b.w * sc * 0.72;
        const top = view.h * 0.70 - h;
        ctx.fillStyle = b.color;
        ctx.fillRect(bx, top, w, h);
        ctx.fillStyle = 'rgba(7,21,31,0.5)';
        ctx.fillRect(bx, top, w, 5 * sc);
        ctx.fillStyle = 'rgba(7,21,31,0.35)';
        const rows = 2, cols = b.windows;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const wx = bx + w * (0.15 + c * (0.7 / Math.max(1, cols - 1 || 1)));
          const wy = top + h * (0.3 + r * 0.32);
          ctx.fillRect(wx, wy, 6 * sc, 9 * sc);
        }
      });

      // tree canopy (parallax .55)
      campaign.city.trees.forEach(t => {
        const tx = sx(t.x, 0.55);
        if (tx < -80 || tx > view.w + 80) return;
        const r = t.r * sc;
        const groundY = view.h * LANE.min0;
        ctx.fillStyle = t.dark ? PALETTE.foliageDark : PALETTE.foliageMid;
        ctx.beginPath(); ctx.arc(tx, groundY - r * 1.6, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(7,21,31,0.6)';
        ctx.fillRect(tx - 2 * sc, groundY - r * 0.6, 4 * sc, r * 0.9);
      });

      // street props (parallax .72)
      campaign.city.props.forEach(p => {
        const px = sx(p.x, 0.72);
        if (px < -60 || px > view.w + 60) return;
        const groundY = view.h * LANE.min1;
        if (p.kind === 'lamp') {
          ctx.fillStyle = PALETTE.asphalt;
          ctx.fillRect(px - 1.5 * sc, groundY - 60 * sc, 3 * sc, 60 * sc);
          ctx.fillStyle = PALETTE.cream;
          ctx.globalAlpha = 0.7;
          ctx.beginPath(); ctx.arc(px, groundY - 60 * sc, 7 * sc, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = PALETTE.sandstone;
          ctx.fillRect(px - 22 * sc, groundY - 16 * sc, 44 * sc, 6 * sc);
          ctx.fillRect(px - 18 * sc, groundY - 10 * sc, 4 * sc, 10 * sc);
          ctx.fillRect(px + 14 * sc, groundY - 10 * sc, 4 * sc, 10 * sc);
        }
      });
    }

    // sidewalk band — v10: when a real district photo is active, start this
    // lower than the procedural-fallback value (view.h*0.80 vs the original
    // LANE.min1≈0.68) so more of the near-layer's own painted ground
    // (benches/lampposts/trees standing on it) actually shows instead of
    // being sliced off by a flat opaque band ~12% of screen height above
    // where it needs to be. 0.80 isn't a perfect fit for all three current
    // plates (their own ground lines land anywhere from 0.78 to 1.0 of
    // image height — an art-content inconsistency, not fixable here; see
    // docs/CODEX-ART-BRIEF-v7.md's new hard requirement that every future
    // district plate share one locked 0.78 ground line) but it's a
    // meaningfully closer compromise than the old fixed 0.68, which was
    // tuned only for the flat procedural city this replaces.
    const sideY = view.h * (bgReady ? 0.80 : LANE.min1) - 4 * sc;
    ctx.fillStyle = PALETTE.stucco;
    ctx.fillRect(0, sideY, view.w, view.h - sideY);

    // bike lane stripe (scrolls 1:1 with world, dashed)
    const bikeY = view.h * (LANE.min + BIKE_LANE * (LANE.max - LANE.min));
    ctx.fillStyle = PALETTE.bikeRed;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(0, bikeY - 16 * sc, view.w, 30 * sc);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = PALETTE.warnYellow;
    ctx.lineWidth = Math.max(1, 2 * sc);
    ctx.setLineDash([16 * sc, 14 * sc]);
    ctx.lineDashOffset = -cam.x * sc;
    ctx.beginPath(); ctx.moveTo(0, bikeY); ctx.lineTo(view.w, bikeY); ctx.stroke();
    ctx.setLineDash([]);

    // courier telegraph — lane stripe + direction chevrons, road paint under
    // all actors, drawn at the EXACT hit band (COURIER.LANE_BAND) so the
    // warning IS the hitbox, not a rough approximation of it. Pulses while
    // the bike is still incoming (phase 'warn'), then settles to a steady
    // fade-out once it's actually rolling through.
    (campaign.couriers || []).forEach(r => {
      const y = view.h * (LANE.min + r.lane * (LANE.max - LANE.min));
      const half = COURIER.LANE_BAND * (LANE.max - LANE.min) * view.h;
      const pending = r.phase === 'warn';
      const fade = pending ? 1 : Math.max(0, 1 - r.t / 40);
      if (fade <= 0) return;
      const pulse = pending ? 0.45 + 0.35 * Math.sin(r.t * 0.34) : 0.35;
      ctx.save();
      ctx.globalAlpha = pulse * fade;
      ctx.fillStyle = PALETTE.warnYellow;
      ctx.fillRect(0, y - half, view.w, half * 2);
      ctx.globalAlpha = Math.min(1, pulse * 1.6) * fade;
      ctx.fillStyle = PALETTE.bikeRed;
      const edge = r.dir < 0 ? view.w : 0; // chevrons hug the edge the bike will arrive from
      for (let i = 0; i < 3; i++) {
        const cx = edge + r.dir * (18 + i * 26) * sc;
        ctx.beginPath();
        ctx.moveTo(cx, y - 11 * sc);
        ctx.lineTo(cx + r.dir * 14 * sc, y);
        ctx.lineTo(cx, y + 11 * sc);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    });

    // ground/road
    const roadY = view.h * LANE.max - 2 * sc;
    ctx.fillStyle = PALETTE.asphalt;
    ctx.fillRect(0, roadY, view.w, view.h - roadY);

    if (campaign.crate) drawCrate(ctx, cam, view, campaign.crate);
    (campaign.weaponCrates || []).forEach(wc => { if (wc.alive) drawCrate(ctx, cam, view, wc); });
    (campaign.pickups || []).forEach(p => drawPickup(ctx, cam, view, p));
    (campaign.projectiles || []).forEach(pr => drawProjectile(ctx, cam, view, pr));
    if (world.hero && world.hero.weapon) drawHeldWeapon(ctx, cam, view, world.hero);
  }
  const LANE = { min: RUMBLE.constants.LANE_MIN, max: RUMBLE.constants.LANE_MAX, min0: RUMBLE.constants.LANE_MIN, min1: RUMBLE.constants.LANE_MIN + 0.02 };

  // ── the breakable wooden crate that blocks the street after the Icon
  // fight — planks + metal corners + a WAR TLV stencil, cracks as it takes
  // damage, drawn as a background prop (so hero art always reads over it). ──
  function drawCrate(ctx, cam, view, crate) {
    const sc = cam.scale;
    const sx = (crate.x - cam.x) * sc;
    const floorY = view.h * (LANE.min + crate.lane * (LANE.max - LANE.min));
    const shakeX = crate.shakeT > 0 ? (Math.random() - 0.5) * 6 * sc : 0;

    // v6.1: real prop art (bench/cafe-table/trashcan) — same break/hp/pickup
    // mechanism as the wooden crate below, just a different skin. Falls
    // through to the procedural crate if propKind is unset (the story
    // crate never sets it) or its image hasn't loaded yet.
    if (crate.propKind && PROP_IMG[crate.propKind]) {
      const im = RUMBLE.loadImg(PROP_IMG[crate.propKind]);
      if (im && im.complete && im.naturalWidth) {
        drawPropCrate(ctx, sx, floorY, shakeX, sc, im, crate);
        return;
      }
    }

    const w = CRATE_W * sc, h = 68 * sc;
    const x = sx - w / 2 + shakeX, y = floorY - h;

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(sx, floorY, w * 0.42, 8 * sc, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = crate.hitFlashT > 0 ? '#f4d99d' : '#8a5a34';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.lineWidth = Math.max(1, 2 * sc);
    for (let i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(x, y + h * i / 4); ctx.lineTo(x + w, y + h * i / 4); ctx.stroke();
    }
    ctx.fillStyle = '#3a4650';
    const cs = 10 * sc;
    [[x, y], [x + w - cs, y], [x, y + h - cs], [x + w - cs, y + h - cs]].forEach(function (p) {
      ctx.fillRect(p[0], p[1], cs, cs);
    });
    ctx.fillStyle = 'rgba(230,180,73,.9)';
    ctx.font = Math.max(8, 11 * sc) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WAR TLV', sx, y + h * 0.55);
    const dmgFrac = 1 - crate.hp / crate.maxHp;
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.lineWidth = Math.max(1, 1.4 * sc);
    if (dmgFrac > 0.3) { ctx.beginPath(); ctx.moveTo(x + w * 0.3, y); ctx.lineTo(x + w * 0.5, y + h * 0.5); ctx.stroke(); }
    if (dmgFrac > 0.6) { ctx.beginPath(); ctx.moveTo(x + w * 0.7, y + h); ctx.lineTo(x + w * 0.5, y + h * 0.5); ctx.stroke(); }
    ctx.restore();

    const barW = 50 * sc;
    ctx.save();
    ctx.fillStyle = 'rgba(7,21,31,.7)'; ctx.fillRect(sx - barW / 2, y - 10 * sc, barW, 5 * sc);
    ctx.fillStyle = '#e6b449'; ctx.fillRect(sx - barW / 2, y - 10 * sc, barW * Math.max(0, crate.hp / crate.maxHp), 5 * sc);
    ctx.restore();
  }

  // v6.1: real prop art variant of the crate above — same shadow/hp-bar
  // frame, image instead of the procedural planks, a 'lighter' white flash
  // on hit instead of a color swap (can't recolor a photo the way the
  // procedural crate recolors a flat fill).
  function drawPropCrate(ctx, sx, floorY, shakeX, sc, im, crate) {
    const h = 78 * sc;
    const w = h * (im.naturalWidth / im.naturalHeight);
    const x = sx - w / 2 + shakeX, y = floorY - h;

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(sx, floorY, w * 0.4, 8 * sc, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.drawImage(im, x, y, w, h);
    if (crate.hitFlashT > 0) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }

    const barW = 50 * sc;
    ctx.save();
    ctx.fillStyle = 'rgba(7,21,31,.7)'; ctx.fillRect(sx - barW / 2, y - 10 * sc, barW, 5 * sc);
    ctx.fillStyle = '#e6b449'; ctx.fillRect(sx - barW / 2, y - 10 * sc, barW * Math.max(0, crate.hp / crate.maxHp), 5 * sc);
    ctx.restore();
  }

  // ── v3 weapon pickups — no dedicated art yet (see docs/CODEX-ART-BRIEF-v3.md),
  // procedural stand-ins in the same visual language as the crate (planks,
  // same palette) so they read as "part of this world" rather than a
  // placeholder. A bobbing plank on the ground + a pulsing ring says "pick
  // me up"; the same plank glued near the hero's fist says "you're armed";
  // in flight it just spins. ──
  function drawPlank(ctx, sc) {
    ctx.fillStyle = '#c9a15a';
    ctx.fillRect(-3 * sc, -18 * sc, 6 * sc, 36 * sc);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(-3 * sc, 10 * sc, 6 * sc, 5 * sc);
  }

  // v3 art delivery: draws the real weapon PNG (assets/weapons/<kind>.png,
  // see WEAPON_IMG) centered on the current origin — caller translates/
  // rotates first, same contract drawPlank had. Falls back to the plank
  // placeholder while the image is still loading or for an unknown kind, so
  // a weapon is never invisible.
  function drawWeaponImg(ctx, kind, sc) {
    const im = kind && WEAPON_IMG[kind] && RUMBLE.loadImg(WEAPON_IMG[kind]);
    if (!(im && im.complete && im.naturalWidth)) { drawPlank(ctx, sc); return; }
    const h = 46 * sc;
    const w = h * (im.naturalWidth / im.naturalHeight);
    ctx.drawImage(im, -w / 2, -h / 2, w, h);
  }

  function drawPickup(ctx, cam, view, p) {
    if (!p.alive) return;
    const sc = cam.scale * (0.86 + p.lane * 0.28);
    const sx = (p.x - cam.x) * cam.scale;
    const floorY = view.h * (LANE.min + p.lane * (LANE.max - LANE.min));
    const bob = Math.sin(p._t * 0.1) * 3 * sc;
    ctx.save();
    ctx.translate(sx, floorY - 14 * sc + bob);
    ctx.rotate(-0.5);
    drawWeaponImg(ctx, p.kind, sc);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(p._t * 0.09);
    ctx.strokeStyle = PALETTE.warnYellow;
    ctx.lineWidth = Math.max(1, 2 * sc);
    ctx.beginPath(); ctx.ellipse(sx, floorY, 16 * sc, 5 * sc, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function drawProjectile(ctx, cam, view, pr) {
    const sc = cam.scale * (0.86 + pr.lane * 0.28);
    const sx = (pr.x - cam.x) * cam.scale;
    const floorY = view.h * (LANE.min + pr.lane * (LANE.max - LANE.min));
    ctx.save();
    ctx.translate(sx, floorY - 30 * sc);
    ctx.rotate((pr.x * 0.15) % (Math.PI * 2)); // tumbles as it flies, spin tied to distance traveled so it's deterministic
    drawWeaponImg(ctx, pr.kind, sc * 0.8);
    ctx.restore();
  }

  // weapon held in the hero's hand — offset toward whichever way he's
  // facing, drawn by drawStage (not Actor.draw) so no engine.js change was
  // needed to support it.
  function drawHeldWeapon(ctx, cam, view, hero) {
    const sc = cam.scale * (0.86 + hero.lane * 0.28);
    const sx = (hero.x - cam.x) * cam.scale + hero.facing * 26 * sc;
    const floorY = view.h * (LANE.min + hero.lane * (LANE.max - LANE.min));
    ctx.save();
    ctx.translate(sx, floorY - 46 * sc);
    ctx.rotate(hero.facing > 0 ? -0.35 : 0.35);
    drawWeaponImg(ctx, hero.weapon && hero.weapon.kind, sc * 0.9);
    ctx.restore();
  }

  // ── the blue courier — a real actor-like hazard, depth-sorted into
  // World.draw via its `lane` field (see engine.js draw()). x/lane are
  // world-space, mapped exactly like Actor.draw: sx uses cam.scale ONLY
  // (never laneScale — depth never moves things sideways), size uses the
  // same 0.86+lane*0.28 depth curve as every actor so it isn't a flat,
  // always-in-front sticker anymore. `r` is the run object owned by
  // Campaign._tickCourier/_spawnCourier. ──
  function drawCourier(ctx, cam, view, r) {
    const im = RUMBLE.loadImg(r.img || COURIER_IMG);
    const laneScale = 0.86 + r.lane * 0.28;
    const sc = cam.scale * laneScale;
    const sx = (r.x - cam.x) * cam.scale;
    const floorY = view.h * (LANE.min + r.lane * (LANE.max - LANE.min));
    const h = COURIER.H * sc;
    let w = h * 1.5;
    if (im && im.naturalWidth) w = h * (im.naturalWidth / im.naturalHeight);

    ctx.save();
    ctx.globalAlpha = 0.30; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(sx, floorY, w * 0.34, Math.max(4, 7 * sc), 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    if (!(im && im.complete && im.naturalWidth)) return;
    ctx.save();
    ctx.translate(sx, floorY);
    if (r.dir > 0) ctx.scale(-1, 1); // source art rides right→left; flip for left→right runs
    ctx.drawImage(im, -w / 2, -h * 0.96, w, h); // wheels ON the lane line, not floating above it
    ctx.restore();
  }

  // ── Campaign: gate progression, wave/boss spawning, courier hazard ───────
  class Campaign {
    constructor(world, heroId, callbacks) {
      this.world = world;
      this.callbacks = callbacks || {};
      this.bossLineup = ROSTER.resolveBossLineup(heroId);
      this.gates = buildGates(this.bossLineup);
      this.gateIdx = 0;
      this.roomLocked = false;
      this.wallHi = this.gates[0].x + 300;
      this.finishX = FINISH_X;
      this._activeEnemies = [];
      // v10: watchdog against a stuck wave/elite/boss room — see _startGate's
      // reset and tick()'s check below. Nothing in the game guaranteed every
      // spawned enemy stays reachable (AI pathing edge case, an off-screen
      // entrant that never resolves, etc.); without this a stuck room reads
      // to the player as "the boss never showed up."
      this._gateTicks = 0;
      this.currentDistrict = -1;
      this.city = generateCity();
      this.bossesCleared = 0;
      this._won = false;
      // courier hazard (v3 — world-space, see _tickCourier/_spawnCourier).
      // 420 ticks (~7s) before the first bike so it lands AFTER the
      // onboarding "שליח!" toast at 5.4s (main.js runOnboarding) instead of
      // hitting the player before they've been told it's coming.
      this.couriers = [];
      this.world.hazards = this.couriers; // same array reference — engine.js reads world.hazards every draw, Campaign mutates it via push/splice
      this.courierCooldown = 420;
      this.courierCount = 0;
      this._lastCourierLane = -1;
      this.crate = null;
      // loose weapon crates — one per chapter, NOT a progression gate (the
      // hero can walk right past without breaking it, unlike the story crate)
      this.weaponCrates = [];
      for (let c = 0; c < CHAPTERS; c++) {
        const base = c * CHAPTER_LEN;
        const kind = WEAPON_KINDS[Math.floor(Math.random() * WEAPON_KINDS.length)];
        const propKind = PROP_KINDS[Math.floor(Math.random() * PROP_KINDS.length)];
        this.weaponCrates.push({ x: base + 460, lane: 0.42, hp: WEAPON_CRATE_HP, maxHp: WEAPON_CRATE_HP, alive: true, hitFlashT: 0, shakeT: 0, kind, propKind });
      }
      this.pickups = [];
      this.projectiles = [];
      // grab & throw (hero.grabTarget is the source of truth for "is
      // grabbing" — these three just track the grab's progress)
      this.grabTimer = 0;
      this.grabKnees = 0;
      this.thrownVictim = null;
    }

    currentGate() { return this.gates[this.gateIdx] || null; }

    // world units the viewport currently spans (cam.x is world-space, view.w is screen px)
    _viewSpan() { return this.world.view.w / this.world.cam.scale; }

    // where the camera will have settled by the time an entrant arrives: the
    // hero gets pinned at wallHi and the dead-zone holds him there, so a
    // gate-fire-time spawn on the RIGHT must predict past that settled
    // position, not the live (still-lerping) one — see Camera.update in
    // engine.js, whose dead-zone hi edge is `cam.x + view.w * 0.58`.
    _settledCamX() {
      const cam = this.world.cam, view = this.world.view;
      return Math.max(cam.x, Math.max(0, this.wallHi - view.w * 0.58));
    }

    // an x guaranteed off-screen on `side` (+1 = past the right edge, -1 =
    // past the left), `extra` world units of additional clearance (used to
    // space out multiple entrants so they don't stack on the same spot),
    // measured from `camX` (defaults to the live camera).
    _offscreenX(side, extra, camX) {
      const cx = camX != null ? camX : this.world.cam.x;
      const m = ENTER.MARGIN + (extra || 0);
      return side > 0 ? cx + this._viewSpan() + m : cx - m;
    }

    // drives every still-`entering` grunt toward frame center at a jogging
    // pace, independent of AI.tickGrunt (which returns immediately while
    // `entering` is true — see ai.js). Must run BEFORE the AI block in
    // tick() since both write to `actor.controls`.
    _tickEntrances() {
      const hero = this.world.hero, cam = this.world.cam, view = this.world.view;
      const inset = view.w * 0.06;
      for (let i = 0; i < this._activeEnemies.length; i++) {
        const e = this._activeEnemies[i];
        if (!e.entering) continue;
        if (!e.alive) { this._endEntrance(e); continue; }
        const c = e.controls;
        c.up = c.down = c.left = c.right = false;
        if (e.enterDelay > 0) { e.enterDelay--; continue; } // parked off-screen, idle pose
        c.right = e.enterDir > 0;
        c.left = e.enterDir < 0;
        e.enterT--;
        const sx = (e.x - cam.x) * cam.scale;
        const onScreen = sx > inset && sx < view.w - inset;
        // three independent exits so a wave can never soft-lock waiting on
        // an entrant stuck behind a wall/camera-lag edge case
        if (onScreen || e.enterT <= 0 || Math.abs(e.x - hero.x) < 240) this._endEntrance(e);
      }
    }

    _endEntrance(e) {
      e.entering = false;
      if (e._baseSpeed) e.moveSpeed = e._baseSpeed;
      e.controls.left = e.controls.right = e.controls.up = e.controls.down = false;
    }

    tick() {
      const hero = this.world.hero;
      if (!hero) return;
      if (!this.roomLocked) {
        const g = this.currentGate();
        if (g && hero.x >= g.x - 30) this._startGate(g);
      } else if (this.currentGate() && this.currentGate().type === 'crate') {
        this._tickCrate();
        if (!this.crate) this._clearGate();
      } else {
        const remaining = this._activeEnemies.filter(e => e.alive).length;
        if (remaining === 0) this._clearGate();
        // v10: watchdog — 45s (2700 ticks @60fps) is far longer than any
        // real fight (a full boss takes maybe 20-30s), so hitting this means
        // something is actually stuck (unreachable entrant, AI pathing
        // corner case), not just a slow player. Force-clear rather than
        // silently soft-locking a boss the player can see but never fights.
        else if (++this._gateTicks > 2700) { this._activeEnemies.forEach(e => { e.alive = false; }); this._clearGate(); }
      }
      const distIdx = Math.min(DISTRICTS.length - 1, Math.floor(hero.x / CHAPTER_LEN));
      if (distIdx !== this.currentDistrict) {
        this.currentDistrict = distIdx;
        if (this.callbacks.onDistrictChange) this.callbacks.onDistrictChange(DISTRICTS[distIdx], distIdx);
      }
      this._tickCourier();
      // loose weapon crates/pickups/projectiles are independent of gate state
      // (unlike the story crate, which only ticks while it's the active gate)
      this._tickWeaponCrates();
      this._tickPickups();
      this._tickProjectiles();
      this._tickGrab();
      this._tickThrownVictim();
      if (this.gateIdx >= this.gates.length && hero.x >= this.finishX && !this._won) {
        this._won = true;
        if (this.callbacks.onWin) this.callbacks.onWin();
      }
      if (hero.x > this.wallHi) hero.x = this.wallHi;

      // must run before the AI block below — both write actor.controls, and
      // AI.tickGrunt returns immediately for `entering` actors (ai.js)
      this._tickEntrances();

      // AI drive — bigger waves in the final chapter get one more concurrent
      // attacker (2→3) so the extra headcount actually reads as more
      // pressure instead of just a longer queue of passive flankers; the
      // FRISBEE ally + dash/i-frames (added alongside this) keep it fair.
      // `!e.entering` keeps an attacker slot from being reserved by someone
      // who's still off-screen and can't act on it yet.
      const grunts = this.world.enemies.filter(e => e.def.id === 'grunt' && !e.entering);
      AI.assignRoles(grunts, hero, this.currentDistrict >= CHAPTERS - 1 ? 3 : 2);
      this.world.enemies.forEach(e => {
        if (e.def.isBoss) AI.tickBoss(e, hero); else AI.tickGrunt(e, hero);
      });
      this.world.allies.forEach(a => AI.tickAlly(a, this.world.enemies));
      hero.targetHint = this._nearestEnemy(hero);
    }

    _nearestEnemy(hero) {
      let best = null, bestD = Infinity;
      this.world.enemies.forEach(e => {
        if (!e.alive || e.entering) return; // don't turn the hero to face someone still off-screen
        const d = Math.abs(e.x - hero.x);
        if (d < bestD) { bestD = d; best = e; }
      });
      return best;
    }

    _startGate(g) {
      this.roomLocked = true;
      this.wallHi = g.x + 70;
      this._gateTicks = 0; // v10: watchdog restart — see tick()
      if (g.type === 'wave') {
        const lanes = [0.32, 0.56, 0.78, 0.44];
        this._activeEnemies = [];
        // grunts spawn off-screen and walk in (Lior: "כאילו הם נכנסו לפריים
        // ולא כאילו הם נופלים מהשמיים") — ~2/3 from ahead (right, the
        // direction of travel), ~1/3 from behind (left) for a real
        // beat-'em-up pincer. Every actor is constructed and pushed to
        // _activeEnemies IMMEDIATELY (just parked off-screen via
        // enterDelay) — deferring construction would make tick()'s
        // "remaining===0 → gate clear" check fire one tick after gate-open,
        // before anyone existed to count.
        const settled = this._settledCamX(), live = this.world.cam.x;
        let kR = 0, kL = 0;
        for (let i = 0; i < g.count; i++) {
          const side = (i % 3 === 2) ? -1 : 1;
          const k = side > 0 ? kR++ : kL++;
          const def = ROSTER.buildGrunt();
          const lane = clamp01(lanes[i % lanes.length] + (Math.random() - 0.5) * 0.08);
          const x = this._offscreenX(side, k * 95, side > 0 ? settled : live);
          const actor = new RUMBLE.Actor(def, x, lane, side > 0 ? RUMBLE.DIR.LEFT : RUMBLE.DIR.RIGHT, 'grunt');
          actor.entering = true;
          actor.enterDir = -side; // walk toward frame center
          actor.enterDelay = k * (14 + Math.floor(Math.random() * 9));
          actor.enterT = ENTER.TIMEOUT;
          actor._baseSpeed = actor.moveSpeed;
          actor.moveSpeed = actor._baseSpeed * ENTER.SPEED_MULT;
          this.world.addEnemy(actor);
          this._activeEnemies.push(actor);
        }
        if (this.callbacks.onWaveStart) this.callbacks.onWaveStart(g);
      } else if (g.type === 'crate') {
        this.crate = { x: g.x + 60, lane: 0.58, hp: CRATE_HP, maxHp: CRATE_HP, alive: true, hitFlashT: 0, shakeT: 0 };
        this._activeEnemies = [];
        if (this.callbacks.onCrateStart) this.callbacks.onCrateStart();
      } else if (g.type === 'elite') {
        // רוטוויילר רוטשילד — same 1v1 shape as a boss room (isBoss:true
        // gets him AI.tickBoss + the HUD boss-health-bar for free, see
        // ai.js/main.js), but its own callback so the toast doesn't call
        // him "בוס" (Lior: "לא בוס ולא הומלס").
        const def = ROSTER.buildRottweiler(g.chapter);
        const dog = new RUMBLE.Actor(def, g.x + 210, 0.55, RUMBLE.DIR.LEFT, 'boss');
        this.world.addEnemy(dog);
        this._activeEnemies = [dog];
        if (this.callbacks.onEliteStart) this.callbacks.onEliteStart(g, def);
      } else {
        // v11: g.bossId is now always an array (1-3 ids — see roster.js
        // BOSS_ORDER, chapters 4-6 pair up bosses in one gate). Spread
        // multiple bosses across lanes/x so they don't spawn stacked on
        // top of each other.
        const ids = g.bossId;
        const lanes = ids.length > 1 ? [0.40, 0.68, 0.55] : [0.55];
        this._activeEnemies = [];
        const defs = ids.map((bid, i) => {
          const def = ROSTER.buildBoss(bid, g.gateIndex);
          const xOff = ids.length > 1 ? (i - (ids.length - 1) / 2) * 100 : 0;
          const boss = new RUMBLE.Actor(def, g.x + 210 + xOff, lanes[i % lanes.length], RUMBLE.DIR.LEFT, 'boss');
          this.world.addEnemy(boss);
          this._activeEnemies.push(boss);
          return def;
        });
        if (this.callbacks.onBossStart) this.callbacks.onBossStart(g, defs);
      }
    }

    // hero punches/kicks the crate like it would an enemy — reuses the
    // hero's own hitBox()/contacted one-shot-per-swing mechanism so this
    // stays consistent with normal combat feel instead of inventing a
    // separate input.
    _tickCrate() {
      const crate = this.crate;
      if (!crate) return;
      if (crate.hitFlashT > 0) crate.hitFlashT--;
      if (crate.shakeT > 0) crate.shakeT--;
      const hero = this.world.hero;
      const hb = hero && hero.hitBox();
      if (!hb) return;
      const boxLo = crate.x - CRATE_W / 2, boxHi = crate.x + CRATE_W / 2;
      const overlapX = hb.x < boxHi && hb.x + hb.w > boxLo;
      const overlapLane = Math.abs(hero.lane - crate.lane) < 0.3;
      if (!overlapX || !overlapLane) return;
      hero.contacted = true; // one hit per swing, same rule as hitting an enemy
      const dmg = 6 + Math.floor(Math.random() * 5);
      crate.hp = Math.max(0, crate.hp - dmg);
      crate.hitFlashT = 6; crate.shakeT = 10;
      this.world.spawnFx('dust', crate.x, crate.lane, '#c9a15a', 1);
      this.world.hitstop = Math.max(this.world.hitstop, 3);
      if (this.callbacks.onCrateHit) this.callbacks.onCrateHit();
      if (crate.hp <= 0) this._breakCrate();
    }

    _breakCrate() {
      const crate = this.crate;
      for (let i = 0; i < 6; i++) {
        this.world.spawnFx('dust', crate.x + (Math.random() - 0.5) * 50, crate.lane, '#c9a15a', 1.3);
      }
      const allyDef = ROSTER.buildFighter('frisbee');
      // v3: FRISBEE fights at MEDIUM strength as an ally (Lior: "פירסבי צריך
      // לשחק בצורה בינונית ואם הוא נפגע מספיק פעמים הוא נופל וביג.קום ממשיך
      // ללכת") — the raw fighter statline (hp 105/power 15) was actually
      // STRONGER than the hero's own (hp 100/power 14), so he never looked
      // like backup. Tuned down here, same way buildBoss() tunes a boss
      // statline, rather than touching the shared roster entry.
      allyDef.hp = 70; allyDef.power = 9; allyDef.speed = 4.0;
      const ally = new RUMBLE.Actor(allyDef, crate.x, 0.5, RUMBLE.DIR.RIGHT, 'ally');
      this.world.addAlly(ally);
      this.crate = null;
      if (this.callbacks.onAllyJoin) this.callbacks.onAllyJoin(ally);
    }

    // loose weapon crates — same hitBox()/contacted mechanism as the story
    // crate above, just not gate-tied: they tick every frame regardless of
    // roomLocked/currentGate, and the hero can simply walk past one.
    _tickWeaponCrates() {
      const hero = this.world.hero;
      const hb = hero && hero.hitBox();
      if (!hb) return;
      for (const wc of this.weaponCrates) {
        if (!wc.alive) continue;
        if (wc.hitFlashT > 0) wc.hitFlashT--;
        if (wc.shakeT > 0) wc.shakeT--;
        if (hero.contacted) continue; // this swing already landed on something else
        const boxLo = wc.x - CRATE_W / 2, boxHi = wc.x + CRATE_W / 2;
        if (!(hb.x < boxHi && hb.x + hb.w > boxLo)) continue;
        if (Math.abs(hero.lane - wc.lane) >= 0.3) continue;
        hero.contacted = true;
        const dmg = 6 + Math.floor(Math.random() * 5);
        wc.hp = Math.max(0, wc.hp - dmg);
        wc.hitFlashT = 6; wc.shakeT = 10;
        this.world.spawnFx('dust', wc.x, wc.lane, '#c9a15a', 1);
        if (wc.hp <= 0) {
          wc.alive = false;
          for (let i = 0; i < 5; i++) this.world.spawnFx('dust', wc.x + (Math.random() - 0.5) * 40, wc.lane, '#c9a15a', 1.1);
          this.pickups.push({ x: wc.x, lane: wc.lane, kind: wc.kind, alive: true, _t: 0 });
          if (this.callbacks.onWeaponCrateBreak) this.callbacks.onWeaponCrateBreak();
        }
      }
    }

    // stepping within PICKUP_RANGE of a dropped weapon arms the hero — only
    // while empty-handed, so a second weapon just waits on the ground.
    _tickPickups() {
      const hero = this.world.hero;
      if (!hero) return;
      for (let i = this.pickups.length - 1; i >= 0; i--) {
        const p = this.pickups[i];
        p._t++;
        if (hero.weapon) continue;
        if (Math.abs(hero.x - p.x) < PICKUP_RANGE && Math.abs(hero.lane - p.lane) < PICKUP_LANE_TOL) {
          hero.weapon = { kind: p.kind, uses: WEAPON_USES };
          this.pickups.splice(i, 1);
          if (this.callbacks.onWeaponPickup) this.callbacks.onWeaponPickup();
        }
      }
    }

    // in-flight thrown weapons — world-space, travels past the hero's own
    // melee hitbox range and can hit any enemy it sweeps through (not routed
    // through the normal attacker/_resolveAttacks pipeline, since the
    // thrower's own weapon_throw move deliberately does no damage itself —
    // see MOVE_SHAPE.weapon_throw in roster.js).
    _tickProjectiles() {
      const view = this.world.view, cam = this.world.cam;
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const pr = this.projectiles[i];
        pr.x += pr.dir * pr.speed;
        let hit = false;
        for (const e of this.world.enemies) {
          if (!e.alive || e.entering) continue;
          if (Math.abs(e.lane - pr.lane) > 0.26) continue;
          if (Math.abs(e.x - pr.x) < 40) {
            e.takeHit(pr.dmg, { knockback: 9, heavy: true, fall: 20, dirFrom: -pr.dir * e.facing });
            this.world.spawnFx('spark', e.x, e.lane, '#c9a15a', 1.1);
            hit = true;
            break;
          }
        }
        const sx = (pr.x - cam.x) * cam.scale;
        if (hit || sx < -100 || sx > view.w + 100) this.projectiles.splice(i, 1);
      }
    }

    // kick-while-armed throws the held weapon — locks the hero into a throw
    // pose (weapon_throw, a real move so it can't be spammed mid-attack) and
    // spawns the actual damage-dealing projectile alongside it. Always
    // consumes the whole weapon regardless of remaining uses — once it
    // leaves your hand it's not coming back.
    throwWeapon() {
      const hero = this.world.hero;
      if (!hero || !hero.weapon) return false;
      if (!hero.startAttack('weapon_throw')) return false;
      const kind = hero.weapon.kind;
      this.projectiles.push({
        x: hero.x + hero.facing * 40, lane: hero.lane, dir: hero.facing,
        speed: THROW_SPEED, dmg: Math.round((hero.power || 14) * THROW_DMG_MULT), kind, alive: true
      });
      hero.weapon = null;
      if (this.callbacks.onWeaponThrow) this.callbacks.onWeaponThrow();
      return true;
    }

    // uppercut-while-close-to-a-hurt-enemy grabs instead of uppercutting —
    // routed from main.js's onUppercut. Only a grunt currently reeling from
    // a hit (ST.HURT) can be grabbed, so this is a combo extension (soften
    // them first), not a free opener.
    tryGrab() {
      const hero = this.world.hero;
      if (!hero || hero.grabTarget || hero.weapon || !hero.grounded()) return false; // hands full holding a weapon — throw/break it first
      let target = null, bestD = GRAB_RANGE;
      for (const e of this.world.enemies) {
        if (!e.alive || e.entering || e.state !== 'hurt') continue;
        if (Math.abs(e.lane - hero.lane) > 0.26) continue;
        const d = Math.abs(e.x - hero.x);
        if (d < bestD) { bestD = d; target = e; }
      }
      if (!target) return false;
      target.state = 'grabbed'; target.frameT = 0; target.attack = null;
      target.controls.left = target.controls.right = target.controls.up = target.controls.down = false;
      hero.grabTarget = target;
      this.grabTimer = 0; this.grabKnees = 0;
      if (this.callbacks.onGrabStart) this.callbacks.onGrabStart(target);
      return true;
    }

    // glues the grabbed victim to the hero every tick, and auto-releases
    // (into a throw, not a silent drop) after GRAB_TIMEOUT so a stalled
    // input can never lock the fight forever.
    _tickGrab() {
      const hero = this.world.hero, v = hero && hero.grabTarget;
      if (!v) return;
      if (!v.alive || v.state !== 'grabbed') { hero.grabTarget = null; this.grabKnees = 0; return; }
      this.grabTimer++;
      v.x = hero.x + hero.facing * 36;
      v.lane = hero.lane;
      v.vx = 0; v.vz = 0;
      if (this.grabTimer > GRAB_TIMEOUT) this.throwGrabbed();
    }

    // punch-while-grabbing — direct hp damage rather than takeHit(), since
    // takeHit would flip the victim into HURT/KNOCKDOWN and break the
    // grabbed pose on every knee; capped so the combo has to resolve into a
    // throw instead of stunlocking one victim forever.
    grabKnee() {
      const hero = this.world.hero, v = hero && hero.grabTarget;
      if (!v || !v.alive) { if (hero) hero.grabTarget = null; return false; }
      this.grabKnees++;
      // v6.1: knee-strike overlay (grab-knee art) — plays over the hold,
      // reverts to grabHold on its own once it finishes (see poseSrc()).
      if (hero.def.poses.grabKnee) hero.playGrabAnim(hero.def.poses.grabKnee);
      const base = Math.max(1, Math.round((hero.power || 14) * 0.6));
      v.hp = Math.max(0, v.hp - ri(Math.max(1, base - 2), base + 2));
      this.world.spawnFx('spark', v.x, v.lane, '#e0453f', 1);
      this.world.hitstop = Math.max(this.world.hitstop, 3);
      hero.grantEnergy(6);
      if (v.hp <= 0) {
        v.state = 'ko'; v.frameT = 0; v.alive = false;
        hero.grabTarget = null; this.grabKnees = 0;
        return true;
      }
      if (this.grabKnees >= GRAB_MAX_KNEES) this.throwGrabbed();
      return true;
    }

    // kick (or the grab timing out) throws the grabbed victim as a flying
    // knockdown body in the hero's facing direction — _tickThrownVictim then
    // sweeps it against other enemies while it's still moving fast, so a
    // throw can chain into a second victim, same shape as a thrown weapon.
    throwGrabbed() {
      const hero = this.world.hero, v = hero && hero.grabTarget;
      if (!hero || !v) return false;
      hero.grabTarget = null; this.grabKnees = 0; this.grabTimer = 0;
      // v6.1: throw-release overlay — grabTarget is already cleared above, so
      // this is the only thing shown until it plays out (~20 ticks at the
      // default frame timing), then poseSrc() falls through to idle.
      if (hero.def.poses.grabThrow) hero.playGrabAnim(hero.def.poses.grabThrow);
      if (!v.alive) return true;
      v.state = 'knockdown'; v.frameT = 0; v.attack = null;
      v.vx = hero.facing * 13; v.vz = 7; v.knockdownT = 40;
      v._thrownHit = [];
      this.thrownVictim = v;
      this.world.spawnFx('spark', v.x, v.lane, '#e0453f', 1.3);
      this.world.hitstop = Math.max(this.world.hitstop, 4);
      if (this.callbacks.onGrabThrow) this.callbacks.onGrabThrow();
      return true;
    }

    // while the thrown body is still moving fast, it can hit ANOTHER enemy
    // it flies through — each victim only once per throw (_thrownHit).
    _tickThrownVictim() {
      const t = this.thrownVictim;
      if (!t) return;
      if (!t.alive || t.state !== 'knockdown' || Math.abs(t.vx) < 2) { this.thrownVictim = null; return; }
      for (const e of this.world.enemies) {
        if (e === t || !e.alive || e.entering || e.state === 'knockdown') continue;
        if (t._thrownHit.indexOf(e) >= 0) continue;
        if (Math.abs(e.lane - t.lane) > 0.26) continue;
        if (Math.abs(e.x - t.x) < 50) {
          t._thrownHit.push(e);
          e.takeHit(Math.round((t.power || 8) * 0.8), { knockback: 6, heavy: true, fall: 20, dirFrom: -Math.sign(t.vx) * e.facing });
          this.world.spawnFx('spark', e.x, e.lane, '#e0453f', 1);
        }
      }
    }

    _clearGate() {
      const g = this.currentGate();
      this.roomLocked = false;
      this.gateIdx++;
      const next = this.currentGate();
      this.wallHi = next ? next.x + 300 : this.finishX + 260;
      if (g.type === 'boss') {
        this.bossesCleared++;
        if (this.callbacks.onBossClear) this.callbacks.onBossClear(g, this.bossesCleared);
      } else if (g.type === 'crate') {
        // already handled by _breakCrate — nothing extra to announce here
      } else if (this.callbacks.onWaveClear) this.callbacks.onWaveClear(g);
    }

    // picks lane/direction/speed for the next courier run, snapshotted at
    // telegraph time and NEVER re-aimed afterward (a homing lane would make
    // the telegraph a lie — see the drawStage chevron stripe, which shows
    // exactly this frozen lane). `avoidLane`, when given, keeps a second
    // paired courier far enough from the first that both a lane-dodge and a
    // jump-dodge stay genuinely available options.
    _spawnCourier(avoidLane) {
      const hero = this.world.hero, cam = this.world.cam, view = this.world.view;
      const n = this.courierCount;
      const dir = n === 0 ? -1 : (Math.random() < 0.5 ? -1 : 1);

      // lane bias ramps up over the run: run 0 is a guaranteed-free teaching
      // pass in the painted bike lane (hero spawns at lane 0.55, outside it);
      // later runs increasingly aim at the hero's CURRENT lane so standing
      // still stops being a free pass.
      const aimP = n === 0 ? 0 : (n <= 2 ? 0.5 : 0.75);
      let lane;
      if (n === 0) lane = BIKE_LANE;
      else if (Math.random() < aimP) lane = clamp01(hero.lane + (Math.random() - 0.5) * 0.10);
      else lane = 0.08 + Math.random() * 0.86;
      if (Math.abs(lane - this._lastCourierLane) < 0.12) lane = clamp01(1 - lane); // don't repeat the same lane twice running
      if (avoidLane != null && Math.abs(lane - avoidLane) < 0.28) lane = clamp01(avoidLane + (avoidLane < 0.5 ? 0.34 : -0.34));

      const speed = n === 0 ? COURIER.SPEEDS[0] : COURIER.SPEEDS[ri(0, Math.min(2, this.currentDistrict + 1))];

      // fairness budget: a faster bike gets a longer telegraph, estimated
      // from the hero's current SCREEN fraction (bounded by the camera
      // dead-zone) so the reaction window holds regardless of viewport size.
      const span = this._viewSpan();
      const heroFrac = clamp01(((hero.x - cam.x) * cam.scale) / view.w);
      const distFrac = dir < 0 ? (1 - heroFrac) : heroFrac;
      const toHero = (COURIER.MARGIN + distFrac * span) / speed;
      const base = n === 0 ? COURIER.FIRST_WARN : COURIER.WARN_BASE;
      const warnTicks = Math.max(base, Math.ceil(COURIER.MIN_REACT - toHero));

      this._lastCourierLane = lane;
      const img = COURIER_IMGS[Math.floor(Math.random() * COURIER_IMGS.length)];
      const r = { phase: 'warn', t: 0, warnTicks, lane, dir, speed, x: 0, prevX: 0, resolved: false, threatened: false, img };
      r.draw = (c2, cam2, v2) => drawCourier(c2, cam2, v2, r);
      return r;
    }

    _tickCourier() {
      const hero = this.world.hero, cam = this.world.cam, view = this.world.view;
      const g = this.currentGate();
      // no courier during a boss/crate room, while the hero is down, or
      // while a wave is still walking in (that's already a lot to track)
      const blocked = (this.roomLocked && g && (g.type === 'boss' || g.type === 'crate' || g.type === 'elite'))
        || !hero.alive || hero.state === 'knockdown' || hero.state === 'ko'
        || this._activeEnemies.some(e => e.entering);

      if (!this.couriers.length) {
        if (blocked) this.courierCooldown = Math.max(this.courierCooldown, 90);
        else if (--this.courierCooldown <= 0) this.couriers.push(this._spawnCourier());
      }

      for (let i = this.couriers.length - 1; i >= 0; i--) {
        const r = this.couriers[i];
        r.t++;
        if (r.phase === 'warn') {
          if (r.t === 1 && this.callbacks.onCourierWarn) this.callbacks.onCourierWarn(r.dir, r.lane);
          if (r.t >= r.warnTicks) {
            r.phase = 'run'; r.t = 0;
            // spawn x computed HERE, from the LIVE camera — no long-horizon
            // prediction needed (unlike wave entrances): the lane/dir/speed
            // were already committed at telegraph time, only the exact x is
            // decided now.
            r.x = r.prevX = this._offscreenX(-r.dir, COURIER.MARGIN - ENTER.MARGIN);
            r.threatened = Math.abs(hero.lane - r.lane) < COURIER.LANE_BAND;
          }
          continue;
        }
        r.prevX = r.x;
        r.x += r.dir * r.speed;
        // swept test — speed varies now, don't tunnel past the hero in one tick
        const crossed = (r.prevX - hero.x) * (r.x - hero.x) <= 0;
        if (!r.resolved && (crossed || Math.abs(r.x - hero.x) < COURIER.HALF_W)) {
          r.resolved = true;
          this._resolveCourier(r, hero);
        }
        const sx = (r.x - cam.x) * cam.scale;
        if (sx < -240 || sx > view.w + 240) {
          this.couriers.splice(i, 1);
          this.courierCount++;
          const gap = COURIER_GAP[Math.min(COURIER_GAP.length - 1, Math.max(0, this.currentDistrict))];
          this.courierCooldown = ri(gap[0], gap[1]);
          // later chapters: a second bike, opposite direction, offset in
          // time and lane, so a pair never removes either dodge option
          const ch = Math.max(0, this.currentDistrict);
          if (ch >= 1 && Math.random() < (ch >= 2 ? 0.45 : 0.25)) {
            const b = this._spawnCourier(r.lane);
            b.dir = -r.dir; b.warnTicks += 25;
            this.couriers.push(b);
          }
        }
      }
    }

    _resolveCourier(r, hero) {
      const inLane = Math.abs(hero.lane - r.lane) < COURIER.LANE_BAND;
      const airborne = hero.z >= COURIER.DODGE_Z;
      const iframes = hero.invulnT > 0; // a back-dash already dodged this — don't double-report it as a hit
      if (inLane && !airborne && !iframes) {
        // dirFrom follows the bike's own travel direction (not the hero's
        // facing) — takeHit's knockback formula is `-facing * kb * dirFrom`.
        hero.takeHit(COURIER.DMG, { knockback: 8, heavy: true, fall: 24, dirFrom: -r.dir * hero.facing });
        this.world.spawnFx('dust', hero.x, hero.lane, '#1f6fd8', 1.2);
        if (this.callbacks.onCourierHit) this.callbacks.onCourierHit();
      } else if (r.threatened) {
        // a REAL dodge (the bike was actually committed to the hero's lane
        // when it entered frame) is worth a small energy reward — no more
        // "perfect dodge!" for standing somewhere the bike was never headed
        hero.grantEnergy(8);
        if (this.callbacks.onCourierDodge) this.callbacks.onCourierDodge(airborne ? 'jump' : 'lane');
      }
    }

    progressPct() { return Math.min(100, (this.world.hero.x / this.finishX) * 100); }
  }

  root.WORLD = { Campaign, drawStage, DISTRICTS, WORLD_W, BIKE_LANE, CHAPTERS };
})(typeof window !== 'undefined' ? window : this);
