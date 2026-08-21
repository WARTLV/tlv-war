/* ══════════════════════════════════════════════════════════════════════════
   ROTHSCHILD RUMBLE — audio manager. Menu-loop + battle theme music with
   crossfade, one-shot combat SFX. Reuses TLV WAR's proven audio bank (same
   universe, same SFX language — AP/AK/AH/AB/AS/AW map jab/kick/heavy/block/
   special/charge exactly like tlv-war's own SFXM table) plus the BIG.COM
   theme song from the portfolio project. All assets copied locally into
   assets/audio/ so this project stays self-contained.

   Browser autoplay policy: nothing calls .play() until unlock() runs, which
   main.js/ui.js trigger from the FIRST real user gesture (the title "כניסה"
   tap) — calling play() any earlier would silently reject.
   ══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const A = 'assets/audio/';

  const MUSIC_MENU = A + 'AMN.mp4';
  const MUSIC_BATTLE = A + 'bigcom-theme.mp3';
  const SFX_SRC = { AP: A + 'AP.wav', AK: A + 'AK.wav', AH: A + 'AH.wav', AB: A + 'AB.wav', AS: A + 'AS.wav', AW: A + 'AW.wav' };
  // same semantics as tlv-war's SFXM table: punch→AP, kick→AK, uppercut(heavy)→AH,
  // special→AS, guarded-hit→AB, charge/telegraph/dodge-whoosh→AW
  const HIT_SFX = { punch: 'AP', kick: 'AK', uppercut: 'AH', special: 'AS' };

  let unlocked = false;
  let soundOn = true;
  const menuEl = new Audio(MUSIC_MENU);
  menuEl.loop = true; menuEl.volume = 0.85; menuEl.preload = 'auto';
  const battleEl = new Audio(MUSIC_BATTLE);
  battleEl.loop = true; battleEl.volume = 0; battleEl.preload = 'auto';
  const sfxPool = {};
  Object.keys(SFX_SRC).forEach(k => { const el = new Audio(SFX_SRC[k]); el.preload = 'auto'; el.volume = 0.8; sfxPool[k] = el; });

  const BATTLE_VOL = 0.7;
  let fadeTimer = null;
  function clearFade() { if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; } }
  function fadeTo(el, target, ms) {
    clearFade();
    const start = el.volume, dt = 50, steps = Math.max(1, Math.round(ms / dt));
    let i = 0;
    fadeTimer = setInterval(() => {
      i++; el.volume = clamp01(start + (target - start) * (i / steps));
      if (i >= steps) { el.volume = target; clearFade(); if (target === 0) el.pause(); }
    }, dt);
  }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  function safePlay(el) { if (!unlocked || !soundOn) return; el.play().catch(function () {}); }

  // called from the first real tap (title screen CTA) — required before any
  // audio element may legally start under mobile autoplay policy
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    safePlay(menuEl);
  }

  function playMenuMusic() {
    if (!unlocked) return;
    clearFade();
    fadeTo(battleEl, 0, 400);
    safePlay(menuEl);
    fadeTo(menuEl, 0.85, 350);
  }
  function playBattleMusic() {
    if (!unlocked) return;
    clearFade();
    battleEl.currentTime = 0;
    safePlay(battleEl);
    fadeTo(battleEl, BATTLE_VOL, 500);
    fadeTo(menuEl, 0, 400);
  }
  function pauseMusic() {
    clearFade();
    menuEl.pause(); battleEl.pause();
  }
  function resumeMusic() {
    if (!unlocked) return;
    // resume whichever track was the active one (crossfade leaves the other at volume 0)
    if (battleEl.volume > 0) safePlay(battleEl);
    else if (menuEl.volume > 0) safePlay(menuEl);
  }
  function stopAll() {
    clearFade();
    menuEl.pause(); menuEl.currentTime = 0;
    battleEl.pause(); battleEl.currentTime = 0; battleEl.volume = 0;
  }

  // one-shot SFX — clone the node per play so overlapping hits (combo
  // strings, multiple grunts) don't cut each other's tail off
  function sfx(id) {
    if (!unlocked || !soundOn) return;
    const src = sfxPool[id]; if (!src) return;
    const node = src.cloneNode(true);
    node.volume = src.volume;
    node.play().catch(function () {});
  }
  function sfxAttack(moveKind, guarded) {
    sfx(guarded ? 'AB' : (HIT_SFX[moveKind] || 'AP'));
  }
  function sfxHurt() { sfx('AH'); }
  function sfxWhoosh() { sfx('AW'); }

  function setSoundOn(v) {
    soundOn = !!v;
    if (!soundOn) { menuEl.pause(); battleEl.pause(); }
  }

  root.RRAUDIO = {
    unlock, playMenuMusic, playBattleMusic, pauseMusic, resumeMusic, stopAll,
    sfxAttack, sfxHurt, sfxWhoosh, setSoundOn
  };
})(typeof window !== 'undefined' ? window : this);
