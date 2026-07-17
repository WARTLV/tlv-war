/* ══════════════════════════════════════════════════════════════════════════
   TLV WAR — full 6-fighter roster for the Canvas engine (v6.0 rewrite).
   Every name, seq, base damage/energy, tuning multiplier, pose key and frame
   sequence below is copied VERBATIM from the live game (index.html — CH
   @1651, MVB/MVR/MVI/MVY/MVS/MVF @1538-1591, BSP/RSP/ISP/YSP/SSP/FSP @1560-
   1591, FRB/FRR/FRI/FRY/FRS/FRF @1562-1598, GUARD_HI/GUARD_LOW @2590-2591,
   HURT @1601). This file is the single source of truth both the isolated
   test harness AND the real index.html integration read from — no duplicate
   copies, no re-guessing.
   ────────────────────────────────────────────────────────────────────────
   BIG.COM ('b') is the one exception: its move list mixes in the new hi-res
   studio batch (see BSP_B/FRB_B below) per the precision pass — every swap
   is commented inline. All 5 other fighters use 100% original legacy art;
   no new photos exist for them yet.
   ══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const A = (root.TLV_IMG_BASE || 'assets/img/') ;
  const F = x => A + x + '.webp';

  // ── shared 12-slot move SHAPE (ac/seq/base d/e) — every fighter's move
  // list is this exact same shape (index.html clones MVB for MVR/MVI/MVY/
  // MVS/MVF via `.map(m=>({...m}))`, only names + tuned d/e differ) ──
  // cat mirrors the original MVB categories (index.html comment: "4 basics =
  // single face button, 5 mediums = movement+button, 2 specials = 4-input
  // combos, 1 charge") — the CPU AI's move-priority and the player's
  // cpuEdge/pBasicStreak adaptive-difficulty tracker both key off this.
  const BASE_MOVES = [
    { seq: ['O'],             e: 0,  d: [4, 7],   ac: 'jab',  cat: 'basic' },
    { seq: ['T'],             e: 0,  d: [5, 8],   ac: 'kick', cat: 'basic' },
    { seq: ['X'],             e: 0,  d: [5, 9],   ac: 'str',  cat: 'basic' },
    { seq: ['S'],             e: 0,  d: [6, 10],  ac: 'hvy',  cat: 'basic' },
    { seq: ['R', 'X'],        e: 12, d: [10, 15], ac: 'c12',  cat: 'medium' },
    { seq: ['R', 'T'],        e: 10, d: [9, 14],  ac: 'rsh',  cat: 'medium' },
    { seq: ['U', 'X'],        e: 12, d: [10, 16], ac: 'jsm',  cat: 'medium' },
    { seq: ['D', 'T'],        e: 8,  d: [8, 12],  ac: 'sw',   cat: 'medium' },
    { seq: ['D', 'O'],        e: 8,  d: [8, 12],  ac: 'bb',   cat: 'medium' },
    { seq: ['R', 'O', 'X', 'S'], e: 45, d: [16, 24], ac: 'dco', cat: 'special', special: true },
    { seq: ['R', 'S', 'T', 'X'], e: 55, d: [22, 32], ac: 'fin', cat: 'special', special: true, fin: true },
    { seq: ['D', 'D', 'D'],   e: 0,  d: [0, 0],   ac: 'charge', cat: 'charge', charge: true, chargeAmt: 30 }
  ];
  // index.html's tuneMV(mv,dm,em) reproduced exactly: skips charge/redcard,
  // scales damage by dm and energy cost by em, rounds, floors at 1.
  function tuneMoves(dm, em, names) {
    return BASE_MOVES.map((m, i) => {
      const clone = Object.assign({}, m, { n: names[i] });
      if (clone.charge) return clone;
      if (clone.d && clone.d[1] > 0) clone.d = [Math.max(1, Math.round(clone.d[0] * dm)), Math.max(1, Math.round(clone.d[1] * dm))];
      if (clone.e > 0) clone.e = Math.min(100, Math.max(1, Math.round(clone.e * em)));
      return clone;
    });
  }
  // per-move hit geometry/timing — the original game had none of this (it
  // used guaranteed scripted hits); these are the new engine's own tuned
  // values, shared by every fighter since it's about the ACTION, not the art.
  const TUNE = {
    jab:    { reach: 70, boxY: [120, 160], h: 'high', startup: 3, active: 3,  recovery: 8 },
    kick:   { reach: 78, boxY: [40, 90],   h: 'low',  startup: 4, active: 4,  recovery: 9 },
    str:    { reach: 78, boxY: [110, 155], h: 'high', startup: 5, active: 4,  recovery: 11 },
    hvy:    { reach: 86, boxY: [100, 150], h: 'high', startup: 7, active: 5,  recovery: 14 },
    c12:    { reach: 90, boxY: [80, 150],  h: 'high', startup: 6, active: 5,  recovery: 14 },
    rsh:    { reach: 84, boxY: [40, 110],  h: 'low',  startup: 6, active: 5,  recovery: 13 },
    jsm:    { reach: 96, boxY: [60, 180],  h: 'high', startup: 5, active: 6,  recovery: 14 },
    sw:     { reach: 78, boxY: [30, 80],   h: 'low',  startup: 5, active: 4,  recovery: 11 },
    bb:     { reach: 74, boxY: [90, 150],  h: 'high', startup: 5, active: 5,  recovery: 12 },
    dco:    { reach: 96, boxY: [40, 165],  h: 'high', startup: 6, active: 12, recovery: 18 },
    fin:    { reach: 98, boxY: [40, 175],  h: 'high', startup: 8, active: 10, recovery: 24 },
    redcard:{ reach: 98, boxY: [40, 175],  h: 'high', startup: 8, active: 10, recovery: 24 },
    charge: { reach: 0,  boxY: [0, 0],     h: 'high', startup: 0, active: 0,  recovery: 24 }
  };

  // ── BIG.COM ('b') — precision-mapped in the v6.0 pass, mixes new art in ──
  const BSP_B = {
    jab: 'b_jab3', kick: 'b_kk', str: 'b_punch2', hvy: 'b_up',
    c12: 'b_lunge', rsh: 'b_run', jsm: 'b_jumpk', sw: 'b_low', bb: 'b_punch',
    dco: 'b_jab3', fin: 'b_chair', charge: 'b_taunt'
  };
  const FRB_B = {
    jab: ['b_jab3', 'b_jab2', 'b_cross'],
    kick: ['b_kk', 'b_hikick2'],
    str: ['b_punch2', 'b_cross'],
    hvy: ['b_up', 'b_smash2'],
    c12: ['b_run', 'b_lunge'],
    rsh: ['b_run', 'b_hikick2'],
    jsm: ['b_jumpk', 'b_flykick'],
    bb: ['b_punch', 'b_smash2'],
    dco: ['b_jab3', 'b_cross', 'b_smash2'],
    fin: ['b_chair', 'b_flykick', 'b_smash2']
  };

  // ── השופט ('r') — upgraded with the new hi-res studio batch (r2_*, sliced
  // from Lior's 4×3 sheet, Sprint 7C). Crisp cells (rows 1-2 of the sheet)
  // became primary poses; legacy r_* art stays for low kicks / run / the
  // iconic RED CARD & spray. r2_11 (edge-cut fist) and the two most motion-
  // blurred cells were rejected in visual QA. ──
  const RSP = { jab: 'r2_jab', str: 'r2_punch', hvy: 'r2_upper', bb: 'r2_cross', kick: 'r2_kick', sw: 'r_kick', c12: 'r_run', rsh: 'r_run', jsm: 'r2_jumpk', dco: 'r_spray', redcard: 'r_redcard', fin: 'r_redcard', charge: 'r_ready2' };
  const FRR = { jab: ['r2_jab', 'r2_punch'], str: ['r2_jab', 'r2_punch'], hvy: ['r2_stance', 'r2_upper'], bb: ['r2_cross', 'r2_punch'], kick: ['r2_kick', 'r_kick2'], jsm: ['r2_jumpj', 'r2_jumpk'], fin: ['r2_punch', 'r_redcard'] };

  const ISP = { jab: 'i_punch', str: 'i_punch', hvy: 'i_punch', bb: 'i_punch', kick: 'i_kick', sw: 'i_lowk', c12: 'i_run', rsh: 'i_run', jsm: 'i_jump', charge: 'i_point', dco: 'i_belt', fin: 'i_belt' };
  const FRI = { jab: ['i_punch', 'i_fight2', 'i_knee'], str: ['i_punch', 'i_kick'], hvy: ['i_fightG', 'i_punch'], bb: ['i_punch', 'i_knee'], kick: ['i_lowk', 'i_kick'], fin: ['i_point', 'i_mic', 'i_belt'] };

  const YSP = { jab: 'y_punch', kick: 'y_kick', str: 'y_punch', hvy: 'y_tire', c12: 'y_run', rsh: 'y_run', jsm: 'y_jump', sw: 'y_kick', bb: 'y_punch', dco: 'y_tire', fin: 'y_fin', charge: 'y_flex2' };
  const FRY = { jab: ['y_punch', 'y_ready2', 'y_kick'], str: ['y_kick', 'y_punch'], hvy: ['y_flex2', 'y_tire'], bb: ['y_punch', 'y_kick'], kick: ['y_kick', 'y_kick2'], dco: ['y_tire', 'y_smash2'], fin: ['y_fin', 'y_tire'] };

  const SSP = { jab: 's_punch', str: 's_punch', bb: 's_punch', hvy: 's_smash', dco: 's_hook', kick: 's_kick', sw: 's_kick', jsm: 's_air', c12: 's_run', rsh: 's_run', fin: 's_cape2', charge: 's_cape2' };
  const FRS = { jab: ['s_punch', 's_hook'], str: ['s_punch', 's_smash'], hvy: ['s_smash', 's_hook'], bb: ['s_punch', 's_hook'], kick: ['s_kick', 's_kick2'], rsh: ['s_run', 's_run2'], fin: ['s_cape2', 's_robe', 's_smash'] };

  const FSP = { jab: 'f_punch', str: 'f_punch', bb: 'f_palm', hvy: 'f_palm', kick: 'f_kick', sw: 'f_low', c12: 'f_punch', rsh: 'f_palm', jsm: 'f_knee', dco: 'f_plantj', fin: 'f_plant', charge: 'f_claw' };
  const FRF = { jab: ['f_punch', 'f_palm'], str: ['f_palm', 'f_punch'], kick: ['f_kick', 'f_fly'], hvy: ['f_claw', 'f_palm'], bb: ['f_palm', 'f_punch'], dco: ['f_jump', 'f_plantj'], fin: ['f_claw', 'f_plant'] };

  const GUARD_HI  = { b: 'b_guard2', i: 'i_guard', r: 'r_blkH', y: 'y_guard', s: 's_ready', f: 'f_f' };
  const GUARD_LOW = { b: 'b_low',    i: 'i_lowk',  r: 'r_blkL', y: 'y_kick',  s: 's_kick',  f: 'f_low' };
  const HURT      = { r: 'r_hurt', y: 'y_hurt', b: 'b_hurt', s: 's_hurt', i: 'i_hurt' }; // f has none → falls back to idle

  // ── CH (roster) — id, display name, hp, tune (dm,em), idle/walk pose,
  // pose map, frame map, move names (verbatim from index.html), auraColor
  // (matches index.html's own FS[id].glow theme table — same color already
  // used for rim-light/floor-glow, reused here for the special-move aura) ──
  const CH = [
    { id: 'b', name: 'BIG.COM', hp: 100, dm: 1.00, em: 1.00, auraColor: '#1f6fd8',
      names: ['JAB', 'KICK', 'SMASH', 'HEAD PUSH', 'DASH SMASH', 'RUSH KICK', 'AIR SMASH', 'LOW TRIP', 'BODY BLOW', '⚡ ADIDAS COMBO', '⚡ EAR CUP KO', '⚡ ADIDAS POWER'],
      idle: 'b_stance', walk: 'b_run', jump: 'b_jump', crouch: 'b_low', guardHiFallback: 'b_fight',
      sp: BSP_B, fr: FRB_B },
    { id: 'r', name: 'השופט', hp: 120, dm: 0.95, em: 0.92, auraColor: '#9aa0aa',
      names: ['COUNT PUNCH', 'REF KICK', 'COUNT SMASH', 'TUNNEL HEAD', 'RUSH DQ', 'REF RUSH', 'AIR DQ', 'LOW SWEEP', 'BODY COUNT', '⚡ DOUBLE DQ', '🟥 RED CARD', '⚡ REF POWER'],
      idle: 'r2_stance', walk: 'r_run', jump: 'r_jump', crouch: 'r_kick', guardHiFallback: 'r_ready2',
      sp: RSP, fr: FRR, redcard: { seq: ['R', 'S', 'T', 'X'], e: 60, d: [26, 36], ac: 'redcard', special: true, fin: true, n: '🟥 RED CARD' } },
    { id: 'i', name: 'T.M.R', hp: 130, dm: 1.08, em: 1.12, auraColor: '#c19300',
      names: ['BELT BASH', 'CHAMP KICK', 'CHAMP SLAM', 'CHAMP HEAD', 'BELT DASH', 'CHAMP RUSH', 'AIR BELT', 'LOW SWEEP', 'BODY SLAM', '⚡ BELT COMBO', '⚡ CHAMP KO', '⚡ CHAMP POWER'],
      idle: 'i_f', walk: 'i_run', jump: 'i_jump', crouch: 'i_lowk', guardHiFallback: 'i_guard',
      sp: ISP, fr: FRI },
    { id: 'y', name: 'ישר', hp: 110, dm: 1.00, em: 0.88, auraColor: '#00b35a',
      names: ['אגרוף ישר', 'בעיטה ישרה', 'מכת ישר', 'הדיפת ראש', 'זינוק ישר', 'בעיטת ריצה', 'מכה מהאוויר', 'מפלה נמוכה', 'מכת גוף', '⚡ ישר לפנים', '⚡ אני הוא הפיתרון', '⚡ כוח ישר'],
      idle: 'y_guard', walk: 'y_run', jump: 'y_jump', crouch: 'y_kick', guardHiFallback: 'y_guard',
      sp: YSP, fr: FRY },
    { id: 's', name: 'האייקון', hp: 115, dm: 0.94, em: 0.82, auraColor: '#b14de0',
      names: ['אגרוף האייקון', 'בעיטת ראווה', 'סטירת צ׳ופ', 'הדיפה יהירה', 'זינוק ראווה', 'בעיטת ריצה', 'צלילה מלמעלה', 'מפלה נמוכה', 'מכת גוף', '⚡ WOO קומבו', '⚡ סיבוב האייקון', '⚡ כוח האייקון'],
      // idle was s_idle2 — a knees-up crop that made him look legless on the
      // floor-anchored canvas (Lior's report). s_f is the only full-body-with-
      // feet stance he has (verified visually + alpha bbox).
      idle: 's_f', walk: 's_run', jump: 's_air', crouch: 's_kick', guardHiFallback: 's_ready',
      sp: SSP, fr: FRS },
    { id: 'f', name: 'FRISBEE', hp: 105, dm: 0.97, em: 0.90, auraColor: '#ff9440',
      names: ['צליפת דיסק', 'בעיטת חוף', 'סנוקרת שפם', 'הדיפת גלים', 'ריצת חוף', 'שצף דגים', 'הנחתה מהשמיים', 'גלישת חול', 'מכת סנפיר', '⚡ עציץ מעופף', '⚡ פריזבי האש', '⚡ כוח החוף'],
      idle: 'f_f', walk: 'f_palm', jump: 'f_jump', crouch: 'f_low', guardHiFallback: 'f_f',
      sp: FSP, fr: FRF }
  ];

  // ── build a Fighter-ready config for one roster entry ──
  function buildFighter(id) {
    const ch = CH.find(c => c.id === id);
    if (!ch) throw new Error('unknown fighter id: ' + id);
    let moves = tuneMoves(ch.dm, ch.em, ch.names);
    if (ch.redcard) moves = moves.slice(0, 10).concat([ch.redcard], moves.slice(11)); // r: swap fin→redcard, keep charge last
    const resolved = moves.map(m => {
      const framesKeys = (ch.fr[m.ac] || [ch.sp[m.ac]]).filter(Boolean);
      const frames = framesKeys.length ? framesKeys.map(F) : null;
      return Object.assign({}, m, TUNE[m.ac] || {}, { frames });
    });
    const guardHi = GUARD_HI[id] || ch.guardHiFallback;
    const guardLo = GUARD_LOW[id] || ch.crouch;
    const hurt = HURT[id] || ch.idle;
    const poses = {
      idle: F(ch.idle), walkF: F(ch.walk), walkB: F(ch.walk), jump: F(ch.jump), crouch: F(ch.crouch),
      lp: F(ch.sp.jab), mp: F(ch.sp.str), hp: F(ch.sp.hvy), lk: F(ch.sp.kick), mk: F(ch.sp.sw || ch.sp.kick), hk: F(ch.sp.jsm || ch.sp.kick),
      special: F(ch.sp.dco), guardHi: F(guardHi), guardLo: F(guardLo), hurt: F(hurt), ko: F(hurt), win: F(ch.sp.dco)
    };
    return { id: ch.id, name: ch.name, hp: ch.hp, auraColor: ch.auraColor, poses, moves: resolved };
  }

  root.TLV_ROSTER = { CH, buildFighter, tuneMoves, BASE_MOVES, TUNE, GUARD_HI, GUARD_LOW, HURT };
})(typeof window !== 'undefined' ? window : this);
