/* ══════════════════════════════════════════════════════════════════════════
   ROTHSCHILD RUMBLE — enemy AI
   Street grunts: approach → flank → telegraph → active → recovery loop, max
   two concurrent attackers (GAME-DESIGN.md). Bosses: 2-3 attack patterns
   cycling with a longer telegraph so they read as fair on a touchscreen.
   ══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  function ensureAI(actor, kind) {
    if (!actor.ai) actor.ai = { kind, phase: 'approach', timer: 0, role: 'flanker' };
    return actor.ai;
  }

  // called once per tick by world.js, before/after actor physics update,
  // for every living grunt — assigns at most `maxAttackers` "attacker" roles
  // by proximity (default 2; world.js raises this to 3 in the final chapter
  // once bigger waves + the FRISBEE ally + hero dash are all in play)
  function assignRoles(grunts, hero, maxAttackers) {
    if (!hero) return;
    const cap = maxAttackers || 2;
    const sorted = grunts
      .filter(g => g.alive)
      .map(g => ({ g, d: Math.abs(g.x - hero.x) }))
      .sort((a, b) => a.d - b.d);
    sorted.forEach((entry, i) => {
      const ai = ensureAI(entry.g, 'grunt');
      ai.role = i < cap ? 'attacker' : 'flanker';
    });
  }

  function tickGrunt(actor, hero) {
    // still walking in from off-screen — Campaign._tickEntrances (world.js)
    // owns `controls`/facing for this actor until it clears the flag; must
    // return BEFORE the control wipe below or we'd fight it every tick.
    if (actor.entering) return;
    const ai = ensureAI(actor, 'grunt');
    actor.targetHint = hero;
    const c = actor.controls;
    c.left = c.right = c.up = c.down = false;
    if (!hero || !hero.alive) return;
    if (actor.state !== 'idle' && actor.state !== 'walk') return; // engine owns attack/hurt/knockdown

    const dx = hero.x - actor.x;
    const dlane = hero.lane - actor.lane;
    const dist = Math.abs(dx);
    const engageRange = 96;
    const standoff = ai.role === 'attacker' ? 34 : 165;

    if (ai.phase === 'cooldown') {
      ai.timer--;
      if (ai.timer <= 0) ai.phase = 'approach';
    } else if (ai.phase === 'telegraph') {
      ai.timer--;
      if (ai.timer <= 0) {
        actor.startAttack(Math.random() < 0.55 ? 'punch' : 'kick');
        ai.phase = 'cooldown'; ai.timer = 50 + Math.floor(Math.random() * 30);
      }
      return;
    } else if (ai.role === 'attacker' && dist <= engageRange && Math.abs(dlane) < 0.22) {
      ai.phase = 'telegraph'; ai.timer = 20 + Math.floor(Math.random() * 10);
      return;
    }

    if (dist > standoff + 12) { c.right = dx > 0; c.left = dx < 0; }
    else if (dist < standoff - 12 && ai.role !== 'attacker') { c.right = dx < 0; c.left = dx > 0; }
    if (Math.abs(dlane) > 0.05) { c.down = dlane > 0; c.up = dlane < 0; }
  }

  // ── boss patterns: id → array of {name, weight, run(actor,hero)} ──
  // Each boss cycles through 2-3 signature patterns with a longer telegraph
  // (readable wind-up) than grunts, per BACKLOG P1 "לתת לכל בוס 2–3 patterns".
  const BOSS_PATTERNS = {
    icon: [
      { move: 'kick', range: 130, telegraph: 26 },
      { move: 'uppercut', range: 96, telegraph: 30 },
      { move: 'special', range: 156, telegraph: 40, cond: a => a.energy >= 55 }
    ],
    frisbee: [
      { move: 'punch', range: 100, telegraph: 18 },
      { move: 'kick', range: 130, telegraph: 24 },
      { move: 'special', range: 156, telegraph: 38, cond: a => a.energy >= 55 }
    ],
    tmr: [
      { move: 'uppercut', range: 100, telegraph: 28 },
      { move: 'kick', range: 132, telegraph: 22 },
      { move: 'special', range: 158, telegraph: 42, cond: a => a.energy >= 55 }
    ],
    referee: [
      { move: 'punch', range: 100, telegraph: 20 },
      { move: 'uppercut', range: 98, telegraph: 30 },
      { move: 'special', range: 158, telegraph: 40, cond: a => a.energy >= 55 }
    ],
    // רוטוויילר רוטשילד — the "in-between" elite (see roster.js
    // buildRottweiler). No special move (never defined one), so the
    // `energy >= 55` gate on a special pattern simply never applies to him —
    // tickBoss()'s energy grant below just accumulates unused, harmless.
    rottweiler: [
      { move: 'bite', range: 92, telegraph: 20 },
      { move: 'claw', range: 104, telegraph: 22 },
      { move: 'charge', range: 140, telegraph: 16 }
    ]
  };

  function tickBoss(actor, hero) {
    const ai = ensureAI(actor, 'boss');
    actor.targetHint = hero;
    const c = actor.controls;
    c.left = c.right = c.up = c.down = false;
    if (!hero || !hero.alive) return;
    if (actor.state !== 'idle' && actor.state !== 'walk') return;

    const patterns = BOSS_PATTERNS[actor.def.id] || BOSS_PATTERNS.icon;
    const dx = hero.x - actor.x, dlane = hero.lane - actor.lane, dist = Math.abs(dx);

    if (ai.phase === 'cooldown') {
      ai.timer--;
      if (ai.timer <= 0) ai.phase = 'approach';
    } else if (ai.phase === 'telegraph') {
      ai.timer--;
      if (ai.timer <= 0) {
        actor.startAttack(ai.pendingMove);
        ai.phase = 'cooldown'; ai.timer = 45 + Math.floor(Math.random() * 25);
      }
      return;
    } else if (Math.abs(dlane) < 0.24) {
      const avail = patterns.filter(p => dist <= p.range && (!p.cond || p.cond(actor)));
      if (avail.length) {
        const pick = avail[Math.floor(Math.random() * avail.length)];
        ai.phase = 'telegraph'; ai.timer = pick.telegraph; ai.pendingMove = pick.move;
        return;
      }
    }

    if (dist > 70) { c.right = dx > 0; c.left = dx < 0; }
    if (Math.abs(dlane) > 0.05) { c.down = dlane > 0; c.up = dlane < 0; }
    actor.grantEnergy(0.35); // bosses slowly build toward their special
  }

  // ── ally AI (FRISBEE, post-crate): same approach→telegraph→attack shape as
  // a grunt, but running on the hero's side — seeks the nearest living enemy
  // instead of the hero, and fights fully independently (no player input). ──
  function nearestAliveEnemy(actor, enemies) {
    let best = null, bestD = Infinity;
    enemies.forEach(e => {
      if (!e.alive) return;
      const d = Math.abs(e.x - actor.x);
      if (d < bestD) { bestD = d; best = e; }
    });
    return best;
  }

  function tickAlly(actor, enemies) {
    const ai = ensureAI(actor, 'ally');
    const target = nearestAliveEnemy(actor, enemies);
    actor.targetHint = target;
    const c = actor.controls;
    c.left = c.right = c.up = c.down = false;
    if (!target) return; // nothing left to fight — hold position
    if (actor.state !== 'idle' && actor.state !== 'walk') return; // engine owns attack/hurt/knockdown

    const dx = target.x - actor.x;
    const dlane = target.lane - actor.lane;
    const dist = Math.abs(dx);
    const engageRange = 100;

    if (ai.phase === 'cooldown') {
      ai.timer--;
      if (ai.timer <= 0) ai.phase = 'approach';
    } else if (ai.phase === 'telegraph') {
      ai.timer--;
      if (ai.timer <= 0) {
        actor.startAttack(ai.pendingMove);
        ai.phase = 'cooldown'; ai.timer = 42 + Math.floor(Math.random() * 25);
      }
      return;
    } else if (dist <= engageRange && Math.abs(dlane) < 0.22) {
      const useSpecial = actor.energy >= 55 && Math.random() < 0.3;
      ai.pendingMove = useSpecial ? 'special' : (Math.random() < 0.55 ? 'punch' : 'kick');
      ai.phase = 'telegraph'; ai.timer = 18 + Math.floor(Math.random() * 10);
      return;
    }

    if (dist > 40) { c.right = dx > 0; c.left = dx < 0; }
    if (Math.abs(dlane) > 0.05) { c.down = dlane > 0; c.up = dlane < 0; }
    actor.grantEnergy(0.4); // allies build toward their own special too
  }

  root.AI = { tickGrunt, tickBoss, tickAlly, assignRoles };
})(typeof window !== 'undefined' ? window : this);
