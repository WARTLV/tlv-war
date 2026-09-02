/* OY VEY — החלילן מטינדר · store.js
   Isolated storage layer for the patron profile + character claims.

   ⚠️ CURRENT MODE: localStorage — this is PER-DEVICE ONLY.
      A pick made on one phone does NOT appear on another. This was a deliberate product
      choice (no backend). To upgrade, reimplement only getPicks / claim / myPick / setMyPick /
      release / onPicksChange against a shared DB — the UI calls nothing else.

   ── ⚠️ WHY THE `EVENT` NAMESPACE EXISTS (do not remove) ──────────────────────────────
   Every adventure page is served from the SAME origin (wartlv.github.io), and localStorage is
   scoped to the ORIGIN, not the path. Without a per-event namespace, a patron from the 16.08
   event at /cast/ would open this page and find the gate skipped with their old details and
   characters already shown as taken. Event STATE is namespaced per event; only genuine
   cross-event PREFERENCES (language, mute, stat legend) stay global on purpose.
   Every future adventure gets its own EVENT string.

   ── NOTE ON TABLES ───────────────────────────────────────────────────────────────────
   Earlier versions keyed picks per table number. Tables turned out to carry no meaning for
   this event, so the profile now holds an experience LEVEL instead and picks live in one
   pool. Level is descriptive only — it never affects who can pick what.
   ──────────────────────────────────────────────────────────────────────────────────── */
(function (global) {
  const EVENT = "piper";                                   // 14.09.26 — "החלילן מטינדר"
  const P_KEY = `oyvey_${EVENT}_profile`;
  const M_KEY = `oyvey_${EVENT}_mypick`;
  const C_KEY = `oyvey_${EVENT}_picks`;

  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  const Store = {
    // ---- patron profile ----  {name, level}
    getProfile() { return read(P_KEY, null); },
    setProfile(name, level) {
      const p = { name: String(name).trim(), level: String(level) };
      write(P_KEY, p);
      return p;
    },
    clearProfile() { try { localStorage.removeItem(P_KEY); } catch (e) {} },

    // ---- character claims ----  { charId: pickerName }
    getPicks() { return read(C_KEY, {}); },

    // try to lock a character. returns {ok:true} or {ok:false, takenBy}
    claim(charId, name) {
      const picks = read(C_KEY, {});
      if (picks[charId]) return { ok: false, takenBy: picks[charId] };
      picks[charId] = String(name).trim();
      write(C_KEY, picks);
      return { ok: true };
    },

    // ---- this device's own pick ----  {charId, name}
    myPick() { return read(M_KEY, null); },
    setMyPick(charId, name) {
      const mp = { charId, name: String(name).trim() };
      write(M_KEY, mp);
      return mp;
    },

    // undo a claim (picked by mistake, or changed their mind)
    release(charId) {
      const picks = read(C_KEY, {});
      if (picks[charId] !== undefined) { delete picks[charId]; write(C_KEY, picks); }
      const mp = read(M_KEY, null);
      if (mp && mp.charId === charId) {
        try { localStorage.removeItem(M_KEY); } catch (e) {}
      }
      return { ok: true };
    },

    // cross-tab sync on the same device
    onPicksChange(cb) {
      global.addEventListener("storage", (e) => { if (e.key === C_KEY) cb(this.getPicks()); });
    },
  };

  global.OY_VEY_STORE = Store;
})(window);
