# מפת נכסים ומקור אמת

## היררכיית מקור אמת

1. Runtime קנוני: `outputs/rothschild-rumble-game/`
2. ארכיון זהות/פוזות: `outputs/tlv-war-next/assets/fighters/`
3. חבילת delivery/reference: `outputs/war-tlv-arcade-handoff/animations/`

אין לבצע bulk overwrite מה־handoff. מעתיקים רק לאחר בדיקת hash, alpha, זהות ו־anchor.

## מיפויים מסוכנים

- `tlv-war-next/assets/fighters/icon/i_*` = T.M.R, לא האייקון.
- `tlv-war-next/assets/fighters/the-man/s_*` = האייקון.
- `tlv-war-next/assets/fighters/red-fighter/y_*` = ישר.

## מה נמצא ב־runtime

- `assets/roster-frames/<fighter>/` — punch/kick/uppercut/jump/special מחוברים לשש הדמויות.
- `assets/animations/bigcom/movement/walk-forward/F01..F06.png` — המחזור היחיד הקיים; F06 דורש תיקון.
- `assets/bigcom-idle.webp`, `yashar-idle.webp`, `frisbee-idle.webp`, `tmr-idle.*`, `referee-idle.*`, `icon-idle.webp` — פוזות בחירה/idle יחידות.
- `assets/street-enemy/` — אויב הרחוב החלש.
- `assets/courier/blue-courier.png` — השליח הכחול.
- `assets/backgrounds/` — יעד לשכבות הרקע החדשות; לבדוק בפועל לפני הסתמכות.

## פערים אמיתיים

- walk-forward חסר: yashar, frisbee, tmr, referee, icon.
- walk-back חסר: כל שש הדמויות.
- idle/breath loop חסר: כל שש הדמויות.
- hurt-high, hurt-low, knockdown/KO, victory חסרים כרצפים מלאים.
- רקעי Rothschild production-ready אינם קיימים כרגע כסט מלא.

## חוזה שמות

`assets/animations/<fighter>/<category>/<move>/F01.png ... F0N.png`

fighter slugs: `bigcom`, `yashar`, `frisbee`, `tmr`, `referee`, `icon`.

