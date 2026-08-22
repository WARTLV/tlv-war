# רוטוויילר רוטשילד — מדריך נכסים

הכלב הוא יריב Elite חוזר: חזק מאיש רחוב וחלש מבוס קנוני. כמה מופעים יכולים
להופיע לאורך המשחק. כל קובצי התנועה נמצאים בתיקיות הסמוכות למסמך זה.

- בסיס: `idle(2)`, `walk(4)`, `hurt(2)`, `knockdown(3)`.
- התקפות: `bite(4)`, `claw(4)`, `charge(4)`.
- Finisher פיזי: `finisher(12)` — `HOUND'S RECKONING`.
- מתקפת אנרגיה: `energy_super(12)` — `HELLHOUND NOVA`.
- מכה טעונה: `charged_strike(8)` — `HOUND SKULL DRIVER`, נגיחת ראש-כתף.

כל התמונות PNG RGBA ‏768×1024 עם עוגן רגליים אחיד. החיבור נמצא ב-
`js/roster.js::buildRottweiler`; בחירת המהלכים ב-`js/ai.js::BOSS_PATTERNS.rottweiler`.
האינדקס המלא והוראות העבודה נמצאים ב-`assets/roster-frames/MOVE-LIBRARY.md`.
# v7 — HOUND RAMPAGE

`tekken_special/F01..F08.png`: רצף כוח חייתי בן 8 פריימים. נוספו גם `hurt_high`, `hurt_mid`, `hurt_low`, `hurt_launch`, `hurt_crumple` — שני פריימים לכל תגובה.
