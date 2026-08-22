# Rothschild Rumble — Move Asset Library

מסמך זה הוא נקודת הכניסה לקלוד/קודקס שעובד על אנימציות הקרב. אין להזיז את
קובצי ה-PNG: הנתיבים נטענים ישירות ב-`js/roster.js`.

## מוסכמות קבצים

- לוחמים: `<fighter>/<move>/F01.png` וכן הלאה.
- `tmr` ו-`referee` משתמשים בסיומת `-clean`: לדוגמה `F01-clean.png`.
- כל פריים סופי: PNG מסוג RGBA, ‏768×1024, רקע שקוף, רגליים מעוגנות בקו אחיד.
- סדר הפריימים תמיד כרונולוגי. אין לדלג או למיין לפי זמן שינוי.
- `frameTicks` קובע כמה tick-ים נשארים על כל תמונה; `contactFrames` הם אינדקסים
  שמתחילים מאפס בקוד.

## מפת הדמויות

| id | דמות | סגנון |
|---|---|---|
| `bigcom` | BIG.COM | Power Brawler מהיר |
| `yashar` | ישר | Technician |
| `frisbee` | FRISBEE | אקרובטי/לא צפוי |
| `tmr` | T.M.R | אלוף כוחני |
| `referee` | השופט | Ground Control / Enforcer |
| `icon` | האייקון | High-Flyer ראוותני |
| `rottweiler` | רוטוויילר רוטשילד | Elite בין גראנט לבוס; נמצא תחת `assets/enemies/wrestler-dog/` |

## שלושת מהלכי-העל החדשים

### `finisher/` — Finisher פיזי

- 12 פריימים; שש פגיעות: `[1,3,5,7,9,10]`; `frameTicks:5`.
- עלות: 100 אנרגיה. BIG.COM: לחיצה על ספיישל ב-100%.
- שמות לפי סדר הטבלה: `BLUE SCREEN SHUTDOWN`, `SOLUTION PROTOCOL`,
  `RIPTIDE LOOP`, `CHAMPIONSHIP VERDICT`, `FINAL COUNT`, `WOOO ASCENSION`.
- הכלב: `HOUND'S RECKONING`.

### `energy_super/` — מתקפת אנרגיה ארוכת טווח

- 12 פריימים: טעינה 1–8, ירי 9–11, recovery בפריים 12.
- שלושה חלונות פגיעה: `[8,9,10]`; טווח 380; cleave; עלות 100.
- BIG.COM: החזקת הגנה + ספיישל.
- שמות: `BLUE DATA OVERDRIVE`, `GREEN SOLUTION ARRAY`, `COSMIC RIPTIDE`,
  `GOLDEN CHAMPION CANNON`, `SILENT VERDICT`, `WOOO STAR ASCENSION`.
- הכלב: `HELLHOUND NOVA`.

### `charged_strike/` — מכה פיזית טעונה במקום

- 8 פריימים: 1–4 צבירת מתח, 5–6 שחרור, 7 מגע, 8 recovery.
- פגיעה אחת: `[6]`; `frameTicks:7`; טווח 112; עלות 75.
- BIG.COM: החזקת הגנה + אגרוף.
- שמות וסוגי מכה:

| id | שם | מכניקת גוף |
|---|---|---|
| `bigcom` | ROTHSC​HILD ONE-INCH CRASH | אגרוף ישר ימני טעון |
| `yashar` | SOLUTION ELBOW | מרפק ימני קצר וטכני |
| `frisbee` | RIPTIDE HEEL | בעיטת עקב מסובבת |
| `tmr` | CHAMPION HAMMER | אגרוף-פטיש כפול כלפי מטה |
| `referee` | ENFORCER HEAD COUNT | נגיחה קדמית קצרה |
| `icon` | WOOO AXE HEEL | בעיטת גרזן גבוהה |
| `rottweiler` | HOUND SKULL DRIVER | נגיחת ראש-כתף חייתית |

## מהלכים בסיסיים וסביבתיים

- `punch/`, `kick/`, `uppercut/`, `special/` — ערכת הקרב הבסיסית.
- `walk/`, `jump/`, `guard/`, `hurt/`, `ko/` — תנועה ותגובות.
- BIG.COM בלבד: `divekick/`, `runattack/`, `weapon_swing/`, `weapon_throw/`,
  `grab-hold/`, `grab-knee/`, `grab-throw/`.
- הכלב: `idle/`, `walk/`, `hurt/`, `knockdown/`, `bite/`, `claw/`, `charge/`,
  בתוספת שלושת מהלכי-העל לעיל.

## חיבור בקוד

- הגדרות ונתיבים: `js/roster.js` — `frameSeq`, `MOVE_SHAPE`, `buildMoves`,
  `buildRottweiler`.
- state machine, חלונות פגיעה ועלות אנרגיה: `js/engine.js` — `ATTACK_STATES`,
  `Actor.startAttack`, `Actor.hitBox`, `World._applyHit`.
- קלט שחקן: `js/main.js` — `onPunch`, `onSpecial`.
- שימוש עצמאי של בוסים/FRISBEE: `js/ai.js`.

## כללי ברזל לנכס חדש

1. גוף מלא כולל נעליים; אותה זהות ותלבושת בכל הפריימים.
2. שקיפות אלפא אמיתית, בלי ירוק/משבצות/הילה/מסגרת/צל צרוב.
3. 768×1024 ועוגן רגליים אחיד. תנועה במקום אינה מזיזה את מרכז הגוף שרירותית.
4. פריים מגע צריך להיות חד וברור; recovery אינו זהה ל-wind-up.
5. לאחר הוספה: לעדכן `MOVE_SHAPE`, להוסיף ל-`ATTACK_STATES`, לוודא preload,
   להעלות cache-buster ב-`index.html`, ולהריץ `node --check` + בדיקת alpha/count.
# v7 — Tekken-style identity specials + contextual hit reactions

כל שש דמויות הרוסטר והכלב קיבלו `tekken_special` בן 8 פריימים. לכל אחד ארכיטיפ משחקיות שונה: BIG.COM לחץ אגרוף, ישר קראטה מדויק, FRISBEE שרשרת בעיטות, T.M.R היאבקות שרשרת, השופט סמבו, האייקון זרימה אקרובטית והכלב כוח חייתי.

הפעלה לשחקן: **הגנה + בעיטה**, בעלות 85 אנרגיה. נקודות פגיעה בפריימים 3, 5 ו־7; המכה האחרונה משגרת.

חמישה בנקי תגובה, שני פריימים בכל בנק: `hurt_high`, `hurt_mid`, `hurt_low`, `hurt_launch`, `hurt_crumple`. המנוע בוחר את הבנק לפי המכה, עם fallback ל-`hurt`.

