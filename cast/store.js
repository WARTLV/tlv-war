/* OY VEY — CHOOSE YOUR FIGHTER · store.js
   Isolated storage layer for the patron profile + per-table character claims.

   ⚠️ CURRENT MODE: localStorage — this is PER-DEVICE ONLY.
      A pick made on one phone does NOT appear on another phone at the same table.
      Locking + "picked by <name>" therefore mostly reflects the current device's own picks.
      This was a deliberate product choice (no backend). See below to upgrade.

   ── HOW TO UPGRADE TO REAL CROSS-PHONE LOCKING (Firebase, ~5 min, free) ──────────────
   1) Create a free Firebase project + Realtime Database.
   2) Add the Firebase SDK <script> tags to index.html and init with your config.
   3) Reimplement ONLY the 5 methods below (getPicks / claim / setMyPick / myPick / onTableChange)
      against a DB path like  /events/<night>/tables/<table>/<charId> = pickerName.
      - claim(): use a transaction that writes only if the slot is empty (atomic, prevents dupes).
      - onTableChange(): attach a realtime .on('value') listener so cards lock live for everyone.
   The UI in index.html calls ONLY these methods, so nothing else has to change.
   Namespacing by <night> (e.g. the event date) keeps each party night clean.
   ──────────────────────────────────────────────────────────────────────────────────── */
(function (global) {
  const P_KEY = "oyvey_profile";
  const M_KEY = "oyvey_mypick";
  const tableKey = (t) => `oyvey_table_${t}`;

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

    // ---- change notifications ----
    // TODAY: cross-tab sync on the same device via the storage event.
    // FIREBASE: replace body with a realtime .on('value') listener for /tables/<table>.
    onTableChange(table, cb) {
      const key = tableKey(table);
      global.addEventListener("storage", (e) => { if (e.key === key) cb(this.getPicks(table)); });
    },
  };

  global.OY_VEY_STORE = Store;
})(window);
