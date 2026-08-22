# CODEX ART BRIEF v7 — Delivery

נמסרו 111 נכסים חדשים. זוהי מסירת אמנות בלבד; החיבור למנוע נשאר לסבב קוד נפרד.

## P0 — 9 שכבות מחוז

`assets/scenes-v7/`: Independence Hall, Towers, Neve Tzedek — sky/mid/near לכל מחוז.

- גודל: 1915×821.
- sky אטום.
- mid/near RGBA.
- קו תחתון מדוד: y=639 (סטייה של פיקסל אחד בלבד מיעד y=640).
- כל הפיקסלים מתחת לקו שקופים.

## P1 — 95 נכסי תנועה

- שש דמויות: `walk-back` ×6 ו-`idle` ×4 — 60.
- cart/vendor/busker/blanket: walk ×4, hurt ×2, ko ×2 — 32.
- BIG.COM: jump-rise, jump-fall, land — 3.

כל ספרייט דמות: 768×1024 RGBA עם רקע שקוף.

## P2 — 7 נכסי מצגת

- `assets/presentation/boss-card-{tmr,referee,icon}.png` — 800×800 RGBA.
- `assets/presentation/ko.png`, `victory-he.png` — 1200×400 RGBA.
- `assets/roster-frames/bigcom/victory/F01..F02.png` — 768×1024 RGBA.

## כלי עיבוד

`tools/prepare_art_v7_lf.py` משחזר את כל המסירה מתוצרי הרינדור: chroma key, חיתוך גיליונות, נרמול קנבס, נעילת קו קרקע ומידות.
