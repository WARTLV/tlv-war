/* OY VEY — CHOOSE YOUR FIGHTER · character data
   Stats use the real D&D ability scores (STR/DEX/CON/INT/WIS/CHA), normalized 8-18 -> 0-10 so bars compare
   fairly across the roster. `real: true` = pulled from the player's actual character sheet; everything else
   is a placeholder estimate until that sheet arrives — replace it, don't guess forever.
   `img` = branded/<id>.png (auto-placeholder "portrait pending" card shown until that file exists).
   Optional `sheetLine` (race · class · HP/AC) and `appearance` render only when present. */
function scoreToBar(score) { return Math.round(((score - 8) / 10) * 10); } // 8-18 -> 0-10

window.OY_VEY_CAST = [
  {
    // REAL — Tuhar ben Shir, Half-elf Life Cleric 3, Doctor background (sheet: "Tuhar the healer.pdf")
    id: "01_tuhar", name: "TUHAR", cls: "THE HEALER", icon: "✚", accent: "#7FE3B0",
    real: true,
    sheetLine: "Half-elf · Life Cleric 3 · HP 24 · AC 10",
    appearance: "38 (ageless) · 1.70m · blue eyes · blonde hair",
    oneLiner: "born between two worlds, saving people in both",
    stats: { STR: scoreToBar(8), DEX: scoreToBar(10), CON: scoreToBar(14), INT: scoreToBar(16), WIS: scoreToBar(18), CHA: scoreToBar(12) },
    ability: { name: "DISCIPLE OF LIFE", desc: "Every healing spell lands harder — plus channel divinity to mend the wounded or turn the undead." },
    backstory: "Born to a fay father and a human mother, he grew up moving between both worlds. He studied magic and medicine and joined the organization to put both to use for the greater good.",
    pickIf: "בחר/י אם את/ה זה שדואג לכולם בערב.",
  },
  {
    // REAL — Deborah the seer, Elf Chronurgy Wizard 3, "Experimented On" background (sheet: "Deborah the seer.pdf")
    id: "02_deborah", name: "DEBORAH", cls: "THE SEER", icon: "⏳", accent: "#8CC5FF",
    real: true,
    sheetLine: "Elf · Chronurgy Wizard 3 · HP 23 · AC 9",
    appearance: "??? · 1.63m · purple eyes · black hair",
    oneLiner: "born from a test tube, still learning to bend time itself",
    stats: { STR: scoreToBar(10), DEX: scoreToBar(8), CON: scoreToBar(16), INT: scoreToBar(18), WIS: scoreToBar(14), CHA: scoreToBar(12) },
    ability: { name: "CHRONAL SHIFT", desc: "Forces a creature to reroll its die — twice a rest — and reads the room three seconds ahead." },
    backstory: "Born from a test tube, given magic and the power to bend time itself. She's still learning the edges of it — and determined to prove to the organization she's more than just her powers.",
    pickIf: "בחר/י אם את/ה תמיד יודע/ת מה יקרה אחרי.",
  },
  {
    // REAL — Harel Revavi, Human Champion Fighter 3, Soldier background (sheet: "Harel the soldier.pdf")
    id: "03_harel", name: "HAREL", cls: "THE SOLDIER", icon: "⚔", accent: "#7FE0E6",
    real: true,
    sheetLine: "Human · Champion Fighter 3 · HP 31 · AC 17",
    appearance: "22 · 1.87m · brown eyes · black hair",
    oneLiner: "the only one who walked out of the anomaly",
    stats: { STR: scoreToBar(18), DEX: scoreToBar(14), CON: scoreToBar(16), INT: scoreToBar(10), WIS: scoreToBar(12), CHA: scoreToBar(8) },
    ability: { name: "ACTION SURGE", desc: "One extra action per short rest, crits on 19 too, and mends himself mid-fight with Second Wind." },
    backstory: "Served in a special forces unit until an anomaly wiped out his entire squad — he was the only one who walked out. The organization recruited him on the spot. Quick, trained, a powerhouse on the battlefield. Parties, less so.",
    pickIf: "בחר/י אם את/ה לא נופל/ת גם כשכולם נפלו.",
  },
  {
    // REAL — Leon Rosele, Dwarf Wild Magic Barbarian, Folk Hero background (sheet: "Leon the small giant.pdf")
    id: "04_leon", name: "LEON", cls: "THE SMALL GIANT", icon: "✊", accent: "#FFB067",
    real: true,
    sheetLine: "Dwarf · Wild Magic Barbarian · HP 38 · AC 18",
    appearance: "53 · 1.45m · green eyes · gray hair",
    oneLiner: "quiet giant with a magical rage he never asked for",
    stats: { STR: scoreToBar(16), DEX: scoreToBar(14), CON: scoreToBar(18), INT: scoreToBar(8), WIS: scoreToBar(10), CHA: scoreToBar(12) },
    ability: { name: "MAGICAL RAGE", desc: "Entering rage rolls a d8 for a random magical surge — and he can sense magic within 10ft." },
    backstory: "In his early twenties he got caught smuggling for a cult. After serving his time he had a change of heart, and now pulls other kids out of the same web of lies. The organization took him in once they realized there's real magic in his blood — maybe left over from the cult. Who knows.",
    pickIf: "בחר/י אם את/ה השקט הכי חזק בחדר.",
  },
  {
    // REAL — Diana MoonBorn, Half-orc Moon Druid 3, Hippy background (sheet: "Diana The hippy.pdf")
    id: "05_diana", name: "DIANA", cls: "THE HIPPY", icon: "👁", accent: "#D59BFF",
    real: true,
    sheetLine: "Half-orc · Moon Druid 3 · HP 24 · AC 14",
    appearance: "28 · 1.92m · hazel eyes · brown hair",
    oneLiner: "a psychedelic trip cracked the world open — she never looked away",
    stats: { STR: scoreToBar(12), DEX: scoreToBar(16), CON: scoreToBar(14), INT: scoreToBar(10), WIS: scoreToBar(18), CHA: scoreToBar(8) },
    ability: { name: "MOONBEAM", desc: "Channels scorching lunar light — or shifts into animal form twice a rest." },
    backstory: "After a major psychedelic trip she gained the sight to see the magic hiding behind everything — and became the target of otherworldly things because of it. An organization pulled her out. Now she works missions for them in return.",
    pickIf: "בחר/י אם את/ה רואה קסם במה שאחרים חולפים על פניו.",
  },
  {
    // REAL — Meshi "Mezika", Halfling Thief Rogue 3, Street Kid background (sheet: "Meshi the theif.pdf")
    id: "06_meshi", name: "MESHI", cls: "THE THIEF", icon: "🗝", accent: "#C24A8A",
    real: true,
    sheetLine: "Halfling · Thief Rogue 3 · HP 18 · AC 16",
    appearance: "18 · 1.42m · hazel eyes · ginger hair",
    oneLiner: "already three steps toward the exit",
    stats: { STR: scoreToBar(8), DEX: scoreToBar(18), CON: scoreToBar(10), INT: scoreToBar(14), WIS: scoreToBar(12), CHA: scoreToBar(16) },
    ability: { name: "SNEAK ATTACK", desc: "2d6 bonus damage with advantage, plus a free dash, hide, or disengage every turn." },
    backstory: "Born and raised an orphan, jumping from house to house, trusting only herself. When she accidentally tried to rob the organization, they saw exactly what she was capable of — and recruited her instead.",
    pickIf: "בחר/י אם את/ה סומך/ת רק על עצמך.",
  },
];
