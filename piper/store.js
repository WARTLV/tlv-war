/* OY VEY — החלילן מטינדר · store.js
   Isolated storage layer for the patron profile + per-table character claims.

   ⚠️ CURRENT MODE: localStorage — this is PER-DEVICE ONLY.
      A pick made on one phone does NOT appear on another phone at the same table.
      This was a deliberate product choice (no backend). See the cast/ copy for the
      Firebase upgrade path — the same 5 methods are the only thing that changes.

   ── ⚠️ WHY THE `EVENT` NAMESPACE EXISTS (do not remove) ──────────────────────────────
   Every adventure page is served from the SAME origin (wartlv.github.io), and localStorage
   is scoped to the ORIGIN, not the path. Without a per-event namespace, a patron who
   attended the 16.08 event at /cast/ would open /piper/ and find: the gate skipped with
   their old name+table, characters showing as "taken" by August's picks, and a character
   already assigned to them. Event STATE is therefore namespaced per event; only genuine
   cross-event PREFERENCES (language, mute, stat legend) stay global on purpose, so a
   returning patron keeps the language they chose.
   Every future adventure gets its own EVENT string.
   ──────────────────────────────────────────────────────────────────────────────────── */
(function (global) {
  const EVENT = "piper";                                   // 14.09.26 — "החלילן מטינדר"
  const P_KEY = `oyvey_${EVENT}_profile`;
  const M_KEY = `oyvey_${EVENT}_mypick`;
  const tableKey = (t) => `oyvey_${EVENT}_table_${t}`;

  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  const Store = {
    // ---- patron profile (name + table) ----
    getProfile() { return read(P_KEY, null); },              // -> {name, table} | null
    setProfile(name, table) {
      const p = { name: String(name).trim(), table: String(table) };
      write(P_KEY, p);
      return p;
    },
    clearProfile() { try { localStorage.removeItem(P_KEY); } catch (e) {} },

    // ---- per-table character claims ----  { charId: pickerName }
    getPicks(table) { return read(tableKey(table), {}); },

    // try to lock a character for a table. returns {ok:true} or {ok:false, takenBy}
    claim(table, charId, name) {
      const picks = read(tableKey(table), {});
      if (picks[charId]) return { ok: false, takenBy: picks[charId] };
      picks[charId] = String(name).trim();
      write(tableKey(table), picks);
      return { ok: true };
    },

    // ---- this user's own pick ----  {table, charId, name}
    myPick() { return read(M_KEY, null); },
    setMyPick(table, charId, name) {
      const mp = { table: String(table), charId, name: String(name).trim() };
      write(M_KEY, mp);
      return mp;
    },

    // undo a claim (wrong table, or an accidental swipe). Frees the character for that
    // table and clears "my pick" if it was this device's own pick.
    release(table, charId) {
      const picks = read(tableKey(table), {});
      if (picks[charId] !== undefined) {
        delete picks[charId];
        write(tableKey(table), picks);
      }
      const mp = read(M_KEY, null);
      if (mp && String(mp.table) === String(table) && mp.charId === charId) {
        try { localStorage.removeItem(M_KEY); } catch (e) {}
      }
      return { ok: true };
    },

    // ---- change notifications ----
    // TODAY: cross-tab sync on the same device via the storage event.
    onTableChange(table, cb) {
      const key = tableKey(table);
      global.addEventListener("storage", (e) => { if (e.key === key) cb(this.getPicks(table)); });
    },
  };

  global.OY_VEY_STORE = Store;
})(window);
