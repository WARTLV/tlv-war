/* OY VEY — החלילן מטינדר (14.09.26) · character data (bilingual)

   Same six characters as the 16.08 adventure, same real D&D 5e sheets — but this page is a
   dating app, so each character carries a SECOND layer of copy written in profile voice:
   age / distance / tagline / bio / interests / redFlag. The D&D layer still powers the full
   profile view; the dating layer powers the swipe card.

   Stats are the real ability scores, normalized 8-18 -> 0-10 so bars compare across the roster.
   All text-bearing fields live under `en` / `he` — read them as c[lang].field. Root keeps only
   language-agnostic fields (id, name, icon, accent, stats, photos). `name` (TUHAR, DEBORAH, …)
   and `ability.name` (DISCIPLE OF LIFE, …) stay English in BOTH languages on purpose: `name` is
   set in the display font as a brand wordmark, and `ability.name` is a canonical D&D 5e feature
   printed on the player's real sheet — only `ability.desc` gets translated.

   NOTE: the `appearance` line follows the REFERENCE ART in "דמויות מבוכים ודרקונים 14.09/reference/",
   not the players' paper sheets, for three characters whose sheet text and card art disagreed on hair
   (Tuhar silver not blonde, Deborah platinum not black, Meshi dark-with-bleached-streaks not ginger).
   The art is what a patron actually sees next to this text, so the art wins.

   `photos` = filenames in photos/ . One image per character; the array shape is kept so extra shots
   can be added later without touching the swipe-card code (the card hides its pips and disables the
   edge-tap carousel whenever a character has only one). Until Codex delivers the dating-app set (see
   the brief in "דמויות מבוכים ודרקונים 14.09/"), these are copies of the existing character cards, so
   the mechanism is verified and swapping the files is all that's needed later. */
function scoreToBar(score) { return Math.round(((score - 8) / 10) * 10); } // 8-18 -> 0-10

window.OY_VEY_CAST = [
  {
    // REAL — Tuhar ben Shir, Half-elf Life Cleric 3, Doctor background
    id: "01_tuhar", name: "TUHAR", icon: "✚", accent: "#7FE3B0",
    photos: ["01_tuhar"],
    stats: { STR: scoreToBar(8), DEX: scoreToBar(10), CON: scoreToBar(14), INT: scoreToBar(16), WIS: scoreToBar(18), CHA: scoreToBar(12) },
    en: {
      cls: "THE HEALER",
      age: "38", distance: "2 km away",
      tagline: "A doctor. Yes, actually.",
      bio: "Healer by trade, healer on weekends too. If we go out and you get hurt — I've got it. If we go out and I get hurt — also me.",
      interests: ["Healing", "Herbalism", "Night shifts"],
      redFlag: "Replies at 3am, because he's on shift",
      sheetLine: "Half-elf · Life Cleric 3 · HP 24 · AC 10",
      appearance: "38 (ageless) · 1.70m · blue eyes · silver hair",
      oneLiner: "born between two worlds, saving people in both",
      ability: { name: "DISCIPLE OF LIFE", desc: "Every healing spell lands harder — plus channel divinity to mend the wounded or turn the undead." },
      backstory: "Born to a fay father and a human mother, he grew up moving between both worlds. He studied magic and medicine and joined the organization to put both to use for the greater good.",
      pickIf: "Pick if you're the one looking out for everyone tonight.",
    },
    he: {
      cls: "המרפא",
      age: "38", distance: "2 ק״מ ממך",
      tagline: "רופא. כן, באמת.",
      bio: "מרפא במקצוע, מרפא גם בסופי שבוע. אם נצא ותיפצע — אני מטפל. אם נצא ואני איפצע — גם אני מטפל.",
      interests: ["ריפוי", "צמחי מרפא", "משמרות לילה"],
      redFlag: "עונה להודעות ב-3 לפנות בוקר, כי הוא במשמרת",
      sheetLine: "חצי-אלף · כוהן חיים 3 · HP 24 · AC 10",
      appearance: "38 (חסר-גיל) · 1.70 מ׳ · עיניים כחולות · שיער כסוף",
      oneLiner: "נולד בין שני עולמות, ומציל אנשים בשניהם",
      ability: { name: "DISCIPLE OF LIFE", desc: "כל לחש ריפוי פוגע חזק יותר — ובנוסף ערוץ אלוהי לרפא פצועים או לגרש מתים-חיים." },
      backstory: "נולד לאב פיה ולאם אנושית, גדל בין שני העולמות. למד קסם ורפואה, והצטרף לארגון כדי לגייס את שניהם למען הטוב הכללי.",
      pickIf: "בחר/י אם את/ה זה שדואג לכולם בערב.",
    },
  },
  {
    // REAL — Deborah the seer, Elf Chronurgy Wizard 3, "Experimented On" background
    id: "02_deborah", name: "DEBORAH", icon: "⏳", accent: "#8CC5FF",
    photos: ["02_deborah"],
    stats: { STR: scoreToBar(10), DEX: scoreToBar(8), CON: scoreToBar(16), INT: scoreToBar(18), WIS: scoreToBar(14), CHA: scoreToBar(12) },
    en: {
      cls: "THE SEER",
      age: "???", distance: "was here 3 seconds ago",
      tagline: "Knows what you'll type before you type it.",
      bio: "Born in a lab, long story. I see about three seconds ahead, so don't bother planning a surprise. I already liked it.",
      interests: ["Paradoxes", "Broken clocks", "Knowing"],
      redFlag: "Already knows how this date ends",
      sheetLine: "Elf · Chronurgy Wizard 3 · HP 23 · AC 9",
      appearance: "??? · 1.63m · purple eyes · platinum hair",
      oneLiner: "born from a test tube, still learning to bend time itself",
      ability: { name: "CHRONAL SHIFT", desc: "Forces a creature to reroll its die — twice a rest — and reads the room three seconds ahead." },
      backstory: "Born from a test tube, given magic and the power to bend time itself. She's still learning the edges of it — and determined to prove to the organization she's more than just her powers.",
      pickIf: "Pick if you always know what happens next.",
    },
    he: {
      cls: "הרואה",
      age: "???", distance: "היתה כאן לפני 3 שניות",
      tagline: "יודעת מה תכתוב עוד לפני שכתבת.",
      bio: "נולדתי במעבדה, סיפור ארוך. אני רואה בערך שלוש שניות קדימה, אז אל תטרח לתכנן הפתעה. כבר אהבתי אותה.",
      interests: ["פרדוקסים", "שעונים שבורים", "לדעת"],
      redFlag: "כבר יודעת איך הדייט הזה נגמר",
      sheetLine: "אלפית · קוסמת כרונורגיה 3 · HP 23 · AC 9",
      appearance: "??? · 1.63 מ׳ · עיניים סגולות · שיער פלטינה",
      oneLiner: "נולדה מתוך מבחנה, ועדיין לומדת לכופף את הזמן עצמו",
      ability: { name: "CHRONAL SHIFT", desc: "מכריחה יצור להטיל מחדש את הקובייה שלו — פעמיים למנוחה — וקוראת את החדר שלוש שניות קדימה." },
      backstory: "נולדה מתוך מבחנה, וקיבלה קסם ואת הכוח לכופף את הזמן עצמו. היא עדיין לומדת את הגבולות שלו — ונחושה להוכיח לארגון שהיא יותר מסתם הכוחות שלה.",
      pickIf: "בחר/י אם את/ה תמיד יודע/ת מה יקרה אחרי.",
    },
  },
  {
    // REAL — Harel Revavi, Human Champion Fighter 3, Soldier background
    id: "03_harel", name: "HAREL", icon: "⚔", accent: "#7FE0E6",
    photos: ["03_harel"],
    stats: { STR: scoreToBar(18), DEX: scoreToBar(14), CON: scoreToBar(16), INT: scoreToBar(10), WIS: scoreToBar(12), CHA: scoreToBar(8) },
    en: {
      cls: "THE SOLDIER",
      age: "22", distance: "800 m away",
      tagline: "Doesn't talk much. Lifts a lot.",
      bio: "I was the only one who walked out. Don't really want to talk about it. Do want to talk about squats.",
      interests: ["The gym", "Silence", "Protein"],
      redFlag: "His charisma score is 8 out of 20. He knows.",
      sheetLine: "Human · Champion Fighter 3 · HP 31 · AC 17",
      appearance: "22 · 1.87m · brown eyes · black hair",
      oneLiner: "the only one who walked out of the anomaly",
      ability: { name: "ACTION SURGE", desc: "One extra action per short rest, crits on 19 too, and mends himself mid-fight with Second Wind." },
      backstory: "Served in a special forces unit until an anomaly wiped out his entire squad — he was the only one who walked out. The organization recruited him on the spot. Quick, trained, a powerhouse on the battlefield. Parties, less so.",
      pickIf: "Pick if you don't fall even when everyone else does.",
    },
    he: {
      cls: "החייל",
      age: "22", distance: "800 מ׳ ממך",
      tagline: "לא מדבר הרבה. מרים הרבה.",
      bio: "הייתי היחיד שיצא. לא ממש בא לי לדבר על זה. כן בא לי לדבר על סקוואט.",
      interests: ["חדר כושר", "שתיקה", "חלבון"],
      redFlag: "מדד הכריזמה שלו הוא 8 מתוך 20. הוא מודע.",
      sheetLine: "אנושי · לוחם אלוף 3 · HP 31 · AC 17",
      appearance: "22 · 1.87 מ׳ · עיניים חומות · שיער שחור",
      oneLiner: "היחיד שיצא מהאנומליה על הרגליים",
      ability: { name: "ACTION SURGE", desc: "פעולה נוספת אחת למנוחה קצרה, קריטי גם על 19, ומרפא את עצמו באמצע קרב עם Second Wind." },
      backstory: "שירת ביחידת עילית עד שאנומליה חיסלה את כל הכיתה שלו — הוא היה היחיד שיצא. הארגון גייס אותו במקום. מהיר, מאומן, כוח אמיתי בשדה הקרב. במסיבות, פחות.",
      pickIf: "בחר/י אם את/ה לא נופל/ת גם כשכולם נפלו.",
    },
  },
  {
    // REAL — Leon Rosele, Dwarf Wild Magic Barbarian, Folk Hero background
    id: "04_leon", name: "LEON", icon: "✊", accent: "#FFB067",
    photos: ["04_leon"],
    stats: { STR: scoreToBar(16), DEX: scoreToBar(14), CON: scoreToBar(18), INT: scoreToBar(8), WIS: scoreToBar(10), CHA: scoreToBar(12) },
    en: {
      cls: "THE SMALL GIANT",
      age: "53", distance: "1 km away (4, in his steps)",
      tagline: "A giant. Ask anyone.",
      bio: "1.45m of misunderstanding. I was on the wrong side, I got out, now I pull other kids out. When I get angry things happen that I don't control. It's usually fine.",
      interests: ["Axes", "Boars", "Quiet"],
      redFlag: "His rage rolls a random d8",
      sheetLine: "Dwarf · Wild Magic Barbarian · HP 38 · AC 18",
      appearance: "53 · 1.45m · green eyes · gray hair",
      oneLiner: "quiet giant with a magical rage he never asked for",
      ability: { name: "MAGICAL RAGE", desc: "Entering rage rolls a d8 for a random magical surge — and he can sense magic within 10ft." },
      backstory: "In his early twenties he got caught smuggling for a cult. After serving his time he had a change of heart, and now pulls other kids out of the same web of lies. The organization took him in once they realized there's real magic in his blood — maybe left over from the cult. Who knows.",
      pickIf: "Pick if you're the quietest, strongest one in the room.",
    },
    he: {
      cls: "הענק הקטן",
      age: "53", distance: "1 ק״מ ממך (בצעדים שלו: 4)",
      tagline: "ענק. תשאל את מי שבא לך.",
      bio: "1.45 מ׳ של אי-הבנה. הייתי בצד הלא נכון, יצאתי, עכשיו אני מוציא ילדים אחרים. כשאני כועס קורים דברים שאני לא שולט בהם. זה בדרך כלל בסדר.",
      interests: ["גרזנים", "חזירי בר", "שקט"],
      redFlag: "הזעם שלו מגלגל d8 אקראי",
      sheetLine: "גמד · ברברי קסם פרוע · HP 38 · AC 18",
      appearance: "53 · 1.45 מ׳ · עיניים ירוקות · שיער אפור",
      oneLiner: "ענק שקט עם זעם קסום שהוא מעולם לא ביקש",
      ability: { name: "MAGICAL RAGE", desc: "כניסה לזעם מטילה d8 לגל קסם אקראי — והוא חש קסם ברדיוס של 10 רגל." },
      backstory: "בתחילת שנות ה-20 שלו נתפס מבריח עבור כת. אחרי שריצה את עונשו עבר תפנית, ועכשיו הוא מוציא ילדים אחרים מאותה רשת שקרים. הארגון קלט אותו כשגילו שיש קסם אמיתי בדם שלו — אולי שריד מהכת. מי יודע.",
      pickIf: "בחר/י אם את/ה השקט הכי חזק בחדר.",
    },
  },
  {
    // REAL — Diana MoonBorn, Half-orc Moon Druid 3, Hippy background
    id: "05_diana", name: "DIANA", icon: "👁", accent: "#D59BFF",
    photos: ["05_diana"],
    stats: { STR: scoreToBar(12), DEX: scoreToBar(16), CON: scoreToBar(14), INT: scoreToBar(10), WIS: scoreToBar(18), CHA: scoreToBar(8) },
    en: {
      cls: "THE HIPPY",
      age: "28", distance: "somewhere in the forest",
      tagline: "1.92m. Yes, that's the real number.",
      bio: "Took something at a festival and saw the magic behind everything. It never closed back up. The wolf is not a dog, but he behaves like one.",
      interests: ["Full moons", "Festivals", "Talking to animals"],
      redFlag: "Sometimes she is a bear",
      sheetLine: "Half-orc · Moon Druid 3 · HP 24 · AC 14",
      appearance: "28 · 1.92m · hazel eyes · brown hair",
      oneLiner: "a psychedelic trip cracked the world open — she never looked away",
      ability: { name: "MOONBEAM", desc: "Channels scorching lunar light — or shifts into animal form twice a rest." },
      backstory: "After a major psychedelic trip she gained the sight to see the magic hiding behind everything — and became the target of otherworldly things because of it. An organization pulled her out. Now she works missions for them in return.",
      pickIf: "Pick if you see magic in what everyone else walks past.",
    },
    he: {
      cls: "ההיפית",
      age: "28", distance: "איפשהו ביער",
      tagline: "1.92 מ׳. כן, זה המספר האמיתי.",
      bio: "לקחתי משהו בפסטיבל וראיתי את הקסם שמאחורי הכול. זה אף פעם לא נסגר בחזרה. הזאב הוא לא כלב, אבל הוא מתנהג כמו כלב.",
      interests: ["ירח מלא", "פסטיבלים", "לדבר עם חיות"],
      redFlag: "לפעמים היא דובה",
      sheetLine: "חצי-אורק · דרואידית ירח 3 · HP 24 · AC 14",
      appearance: "28 · 1.92 מ׳ · עיניים דבש · שיער חום",
      oneLiner: "טריפ פסיכדלי פתח את העולם בבת אחת — היא מעולם לא הפנתה מבט",
      ability: { name: "MOONBEAM", desc: "מפנה אור ירח צורב — או משתנה לצורת בעל חיים פעמיים למנוחה." },
      backstory: "אחרי טריפ פסיכדלי גדול היא קיבלה את היכולת לראות את הקסם המסתתר מאחורי הכול — והפכה למטרה של יצורים מעולמות אחרים בגללו. ארגון חילץ אותה. עכשיו היא מבצעת בשבילם משימות בתמורה.",
      pickIf: "בחר/י אם את/ה רואה קסם במה שאחרים חולפים על פניו.",
    },
  },
  {
    // REAL — Meshi "Mezika", Halfling Thief Rogue 3, Street Kid background
    id: "06_meshi", name: "MESHI", icon: "🗝", accent: "#C24A8A",
    photos: ["06_meshi"],
    stats: { STR: scoreToBar(8), DEX: scoreToBar(18), CON: scoreToBar(10), INT: scoreToBar(14), WIS: scoreToBar(12), CHA: scoreToBar(16) },
    en: {
      cls: "THE THIEF",
      age: "18", distance: "not there anymore",
      tagline: "Already three steps toward the exit.",
      bio: "Orphan, streets, trust nobody. Accidentally tried to rob a secret organization and they hired me instead. Don't leave your wallet on the table.",
      interests: ["Locks", "Rooftops", "Other people's things"],
      redFlag: "Your wallet",
      sheetLine: "Halfling · Thief Rogue 3 · HP 18 · AC 16",
      appearance: "18 · 1.42m · hazel eyes · dark hair with bleached streaks",
      oneLiner: "already three steps toward the exit",
      ability: { name: "SNEAK ATTACK", desc: "2d6 bonus damage with advantage, plus a free dash, hide, or disengage every turn." },
      backstory: "Born and raised an orphan, jumping from house to house, trusting only herself. When she accidentally tried to rob the organization, they saw exactly what she was capable of — and recruited her instead.",
      pickIf: "Pick if you trust only yourself.",
    },
    he: {
      cls: "הגנבת",
      age: "18", distance: "כבר לא שם",
      tagline: "כבר שלושה צעדים בדרך החוצה.",
      bio: "יתומה, רחוב, לא סומכת על אף אחד. ניסיתי בטעות לשדוד ארגון סודי והם גייסו אותי במקום. אל תשאיר את הארנק על השולחן.",
      interests: ["מנעולים", "גגות", "דברים של אנשים אחרים"],
      redFlag: "הארנק שלך",
      sheetLine: "הפלינג · נוכלת גנב 3 · HP 18 · AC 16",
      appearance: "18 · 1.42 מ׳ · עיניים דבש · שיער כהה עם פסים בהירים",
      oneLiner: "כבר שלושה צעדים בדרך החוצה",
      ability: { name: "SNEAK ATTACK", desc: "2d6 נזק בונוס עם יתרון, ובנוסף ספרינט, הסתתרות או ניתוק חינם בכל תור." },
      backstory: "נולדה וגדלה יתומה, קפצה מבית לבית, ובטחה רק בעצמה. כשבטעות ניסתה לשדוד את הארגון, הם ראו בדיוק למה היא מסוגלת — וגייסו אותה במקום.",
      pickIf: "בחר/י אם את/ה סומך/ת רק על עצמך.",
    },
  },
];

/* PIPER — not part of the swipe deck. He appears once, after the patron has already matched with
   their character, as a second unwanted match. He cannot be picked. The page only shows him if
   photos/piper.jpg actually loads, so this ships safely before the art exists. */
window.OY_VEY_PIPER = {
  id: "piper", name: "PIPER", accent: "#A8FF3E", photo: "piper",
  en: {
    eyebrow: "you have another match",
    cls: "???",
    distance: "0 m away",
    tagline: "Promises love. Promises acceptance.",
    note: "This match cannot be undone.",
    dismiss: "OK…",
  },
  he: {
    eyebrow: "יש לך התאמה נוספת",
    cls: "???",
    distance: "0 מ׳ ממך",
    tagline: "מבטיח אהבה. מבטיח קבלה.",
    note: "לא ניתן לבטל התאמה זו.",
    dismiss: "אוקיי…",
  },
};
