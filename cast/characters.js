/* OY VEY — CHOOSE YOUR FIGHTER · character data (bilingual)
   Stats use the real D&D ability scores (STR/DEX/CON/INT/WIS/CHA), normalized 8-18 -> 0-10 so bars compare
   fairly across the roster. `real: true` = pulled from the player's actual character sheet.
   `img` = branded/<id>.png (auto-placeholder "portrait pending" card shown until that file exists).

   All text-bearing fields live under `en` / `he` — pick a language with c[lang].field. Root keeps only
   fields that are language-agnostic (id, name, icon, accent, real, stats). `name` (TUHAR, DEBORAH, …) and
   `ability.name` (DISCIPLE OF LIFE, …) stay English in BOTH languages on purpose: `name` is set in the
   display font as a brand wordmark, and `ability.name` is a canonical D&D 5e feature name printed on the
   player's real sheet — only `ability.desc` (what it does) gets translated. */
function scoreToBar(score) { return Math.round(((score - 8) / 10) * 10); } // 8-18 -> 0-10

window.OY_VEY_CAST = [
  {
    // REAL — Tuhar ben Shir, Half-elf Life Cleric 3, Doctor background (sheet: "Tuhar the healer.pdf")
    id: "01_tuhar", name: "TUHAR", icon: "✚", accent: "#7FE3B0",
    real: true,
    stats: { STR: scoreToBar(8), DEX: scoreToBar(10), CON: scoreToBar(14), INT: scoreToBar(16), WIS: scoreToBar(18), CHA: scoreToBar(12) },
    en: {
      cls: "THE HEALER",
      sheetLine: "Half-elf · Life Cleric 3 · HP 24 · AC 10",
      appearance: "38 (ageless) · 1.70m · blue eyes · blonde hair",
      oneLiner: "born between two worlds, saving people in both",
      ability: { name: "DISCIPLE OF LIFE", desc: "Every healing spell lands harder — plus channel divinity to mend the wounded or turn the undead." },
      backstory: "Born to a fay father and a human mother, he grew up moving between both worlds. He studied magic and medicine and joined the organization to put both to use for the greater good.",
      pickIf: "Pick if you're the one looking out for everyone tonight.",
    },
    he: {
      cls: "המרפא",
      sheetLine: "חצי-אלף · כוהן חיים 3 · HP 24 · AC 10",
      appearance: "38 (חסר-גיל) · 1.70 מ׳ · עיניים כחולות · שיער בלונדיני",
      oneLiner: "נולד בין שני עולמות, ומציל אנשים בשניהם",
      ability: { name: "DISCIPLE OF LIFE", desc: "כל לחש ריפוי פוגע חזק יותר — ובנוסף ערוץ אלוהי לרפא פצועים או לגרש מתים-חיים." },
      backstory: "נולד לאב פיה ולאם אנושית, גדל בין שני העולמות. למד קסם ורפואה, והצטרף לארגון כדי לגייס את שניהם למען הטוב הכללי.",
      pickIf: "בחר/י אם את/ה זה שדואג לכולם בערב.",
    },
  },
  {
    // REAL — Deborah the seer, Elf Chronurgy Wizard 3, "Experimented On" background (sheet: "Deborah the seer.pdf")
    id: "02_deborah", name: "DEBORAH", icon: "⏳", accent: "#8CC5FF",
    real: true,
    stats: { STR: scoreToBar(10), DEX: scoreToBar(8), CON: scoreToBar(16), INT: scoreToBar(18), WIS: scoreToBar(14), CHA: scoreToBar(12) },
    en: {
      cls: "THE SEER",
      sheetLine: "Elf · Chronurgy Wizard 3 · HP 23 · AC 9",
      appearance: "??? · 1.63m · purple eyes · black hair",
      oneLiner: "born from a test tube, still learning to bend time itself",
      ability: { name: "CHRONAL SHIFT", desc: "Forces a creature to reroll its die — twice a rest — and reads the room three seconds ahead." },
      backstory: "Born from a test tube, given magic and the power to bend time itself. She's still learning the edges of it — and determined to prove to the organization she's more than just her powers.",
      pickIf: "Pick if you always know what happens next.",
    },
    he: {
      cls: "הרואה",
      sheetLine: "אלפית · קוסמת כרונורגיה 3 · HP 23 · AC 9",
      appearance: "??? · 1.63 מ׳ · עיניים סגולות · שיער שחור",
      oneLiner: "נולדה מתוך מבחנה, ועדיין לומדת לכופף את הזמן עצמו",
      ability: { name: "CHRONAL SHIFT", desc: "מכריחה יצור להטיל מחדש את הקובייה שלו — פעמיים למנוחה — וקוראת את החדר שלוש שניות קדימה." },
      backstory: "נולדה מתוך מבחנה, וקיבלה קסם ואת הכוח לכופף את הזמן עצמו. היא עדיין לומדת את הגבולות שלו — ונחושה להוכיח לארגון שהיא יותר מסתם הכוחות שלה.",
      pickIf: "בחר/י אם את/ה תמיד יודע/ת מה יקרה אחרי.",
    },
  },
  {
    // REAL — Harel Revavi, Human Champion Fighter 3, Soldier background (sheet: "Harel the soldier.pdf")
    id: "03_harel", name: "HAREL", icon: "⚔", accent: "#7FE0E6",
    real: true,
    stats: { STR: scoreToBar(18), DEX: scoreToBar(14), CON: scoreToBar(16), INT: scoreToBar(10), WIS: scoreToBar(12), CHA: scoreToBar(8) },
    en: {
      cls: "THE SOLDIER",
      sheetLine: "Human · Champion Fighter 3 · HP 31 · AC 17",
      appearance: "22 · 1.87m · brown eyes · black hair",
      oneLiner: "the only one who walked out of the anomaly",
      ability: { name: "ACTION SURGE", desc: "One extra action per short rest, crits on 19 too, and mends himself mid-fight with Second Wind." },
      backstory: "Served in a special forces unit until an anomaly wiped out his entire squad — he was the only one who walked out. The organization recruited him on the spot. Quick, trained, a powerhouse on the battlefield. Parties, less so.",
      pickIf: "Pick if you don't fall even when everyone else does.",
    },
    he: {
      cls: "החייל",
      sheetLine: "אנושי · לוחם אלוף 3 · HP 31 · AC 17",
      appearance: "22 · 1.87 מ׳ · עיניים חומות · שיער שחור",
      oneLiner: "היחיד שיצא מהאנומליה על הרגליים",
      ability: { name: "ACTION SURGE", desc: "פעולה נוספת אחת למנוחה קצרה, קריטי גם על 19, ומרפא את עצמו באמצע קרב עם Second Wind." },
      backstory: "שירת ביחידת עילית עד שאנומליה חיסלה את כל הכיתה שלו — הוא היה היחיד שיצא. הארגון גייס אותו במקום. מהיר, מאומן, כוח אמיתי בשדה הקרב. במסיבות, פחות.",
      pickIf: "בחר/י אם את/ה לא נופל/ת גם כשכולם נפלו.",
    },
  },
  {
    // REAL — Leon Rosele, Dwarf Wild Magic Barbarian, Folk Hero background (sheet: "Leon the small giant.pdf")
    id: "04_leon", name: "LEON", icon: "✊", accent: "#FFB067",
    real: true,
    stats: { STR: scoreToBar(16), DEX: scoreToBar(14), CON: scoreToBar(18), INT: scoreToBar(8), WIS: scoreToBar(10), CHA: scoreToBar(12) },
    en: {
      cls: "THE SMALL GIANT",
      sheetLine: "Dwarf · Wild Magic Barbarian · HP 38 · AC 18",
      appearance: "53 · 1.45m · green eyes · gray hair",
      oneLiner: "quiet giant with a magical rage he never asked for",
      ability: { name: "MAGICAL RAGE", desc: "Entering rage rolls a d8 for a random magical surge — and he can sense magic within 10ft." },
      backstory: "In his early twenties he got caught smuggling for a cult. After serving his time he had a change of heart, and now pulls other kids out of the same web of lies. The organization took him in once they realized there's real magic in his blood — maybe left over from the cult. Who knows.",
      pickIf: "Pick if you're the quietest, strongest one in the room.",
    },
    he: {
      cls: "הענק הקטן",
      sheetLine: "גמד · ברברי קסם פרוע · HP 38 · AC 18",
      appearance: "53 · 1.45 מ׳ · עיניים ירוקות · שיער אפור",
      oneLiner: "ענק שקט עם זעם קסום שהוא מעולם לא ביקש",
      ability: { name: "MAGICAL RAGE", desc: "כניסה לזעם מטילה d8 לגל קסם אקראי — והוא חש קסם ברדיוס של 10 רגל." },
      backstory: "בתחילת שנות ה-20 שלו נתפס מבריח עבור כת. אחרי שריצה את עונשו עבר תפנית, ועכשיו הוא מוציא ילדים אחרים מאותה רשת שקרים. הארגון קלט אותו כשגילו שיש קסם אמיתי בדם שלו — אולי שריד מהכת. מי יודע.",
      pickIf: "בחר/י אם את/ה השקט הכי חזק בחדר.",
    },
  },
  {
    // REAL — Diana MoonBorn, Half-orc Moon Druid 3, Hippy background (sheet: "Diana The hippy.pdf")
    id: "05_diana", name: "DIANA", icon: "👁", accent: "#D59BFF",
    real: true,
    stats: { STR: scoreToBar(12), DEX: scoreToBar(16), CON: scoreToBar(14), INT: scoreToBar(10), WIS: scoreToBar(18), CHA: scoreToBar(8) },
    en: {
      cls: "THE HIPPY",
      sheetLine: "Half-orc · Moon Druid 3 · HP 24 · AC 14",
      appearance: "28 · 1.92m · hazel eyes · brown hair",
      oneLiner: "a psychedelic trip cracked the world open — she never looked away",
      ability: { name: "MOONBEAM", desc: "Channels scorching lunar light — or shifts into animal form twice a rest." },
      backstory: "After a major psychedelic trip she gained the sight to see the magic hiding behind everything — and became the target of otherworldly things because of it. An organization pulled her out. Now she works missions for them in return.",
      pickIf: "Pick if you see magic in what everyone else walks past.",
    },
    he: {
      cls: "ההיפית",
      sheetLine: "חצי-אורק · דרואידית ירח 3 · HP 24 · AC 14",
      appearance: "28 · 1.92 מ׳ · עיניים דבש · שיער חום",
      oneLiner: "טריפ פסיכדלי פתח את העולם בבת אחת — היא מעולם לא הפנתה מבט",
      ability: { name: "MOONBEAM", desc: "מפנה אור ירח צורב — או משתנה לצורת בעל חיים פעמיים למנוחה." },
      backstory: "אחרי טריפ פסיכדלי גדול היא קיבלה את היכולת לראות את הקסם המסתתר מאחורי הכול — והפכה למטרה של יצורים מעולמות אחרים בגללו. ארגון חילץ אותה. עכשיו היא מבצעת בשבילם משימות בתמורה.",
      pickIf: "בחר/י אם את/ה רואה קסם במה שאחרים חולפים על פניו.",
    },
  },
  {
    // REAL — Meshi "Mezika", Halfling Thief Rogue 3, Street Kid background (sheet: "Meshi the theif.pdf")
    id: "06_meshi", name: "MESHI", icon: "🗝", accent: "#C24A8A",
    real: true,
    stats: { STR: scoreToBar(8), DEX: scoreToBar(18), CON: scoreToBar(10), INT: scoreToBar(14), WIS: scoreToBar(12), CHA: scoreToBar(16) },
    en: {
      cls: "THE THIEF",
      sheetLine: "Halfling · Thief Rogue 3 · HP 18 · AC 16",
      appearance: "18 · 1.42m · hazel eyes · ginger hair",
      oneLiner: "already three steps toward the exit",
      ability: { name: "SNEAK ATTACK", desc: "2d6 bonus damage with advantage, plus a free dash, hide, or disengage every turn." },
      backstory: "Born and raised an orphan, jumping from house to house, trusting only herself. When she accidentally tried to rob the organization, they saw exactly what she was capable of — and recruited her instead.",
      pickIf: "Pick if you trust only yourself.",
    },
    he: {
      cls: "הגנבת",
      sheetLine: "הפלינג · נוכלת גנב 3 · HP 18 · AC 16",
      appearance: "18 · 1.42 מ׳ · עיניים דבש · שיער ג'ינג'י",
      oneLiner: "כבר שלושה צעדים בדרך החוצה",
      ability: { name: "SNEAK ATTACK", desc: "2d6 נזק בונוס עם יתרון, ובנוסף ספרינט, הסתתרות או ניתוק חינם בכל תור." },
      backstory: "נולדה וגדלה יתומה, קפצה מבית לבית, ובטחה רק בעצמה. כשבטעות ניסתה לשדוד את הארגון, הם ראו בדיוק למה היא מסוגלת — וגייסו אותה במקום.",
      pickIf: "בחר/י אם את/ה סומך/ת רק על עצמך.",
    },
  },
];
