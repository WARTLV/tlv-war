/* OY VEY — מצוד בסנטר · store.js
   Same contract as piper/store.js (the UI calls only these methods), plus `side` —
   the patron's secret allegiance (police / org / undecided) for the DM.

   ⚠️ CURRENT MODE: localStorage — PER-DEVICE ONLY. A cover identity taken on one phone does NOT
      show as taken on another. To make claims shared, reimplement getPicks / claim / release /
      onPicksChange against a shared DB; nothing else changes.

   ⚠️ EVENT namespace: every adventure page shares the wartlv.github.io origin, so state is keyed
      oyvey_<event>_* — never reuse another event's string. Language stays global on purpose. */
(function (global) {
  const EVENT = "matzod";                                  // 03.11.26 — "מצוד בסנטר"
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
  function drop(key) { try { localStorage.removeItem(key); } catch (e) {} }

  const Store = {
    // ---- patron profile ----  {name, level, side}
    getProfile() { return read(P_KEY, null); },
    setProfile(name, level) {
      const old = read(P_KEY, {}) || {};
      const p = { name: String(name).trim(), level: String(level), side: old.side || null };
      write(P_KEY, p);
      return p;
    },
    setSide(side) {
      const p = read(P_KEY, null);
      if (!p) return null;
      p.side = side;
      write(P_KEY, p);
      return p;
    },
    clearProfile() { drop(P_KEY); },

    // ---- character claims ----  { charId: pickerName }
    getPicks() { return read(C_KEY, {}); },
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
    release(charId) {
      const picks = read(C_KEY, {});
      if (picks[charId] !== undefined) { delete picks[charId]; write(C_KEY, picks); }
      const mp = read(M_KEY, null);
      if (mp && mp.charId === charId) drop(M_KEY);
      return { ok: true };
    },

    onPicksChange(cb) {
      global.addEventListener("storage", (e) => { if (e.key === C_KEY) cb(this.getPicks()); });
    },
  };

  global.OY_VEY_STORE = Store;
})(window);
