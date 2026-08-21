# Changelog תמציתי

## 2026-08-16

- נוסף roster playable של שש דמויות.
- מסך הבחירה הורחב לשישה כרטיסים ונוסף `style-v8-select.css`.
- רצפי punch/kick/uppercut/jump/special חוברו ל־`assets/roster-frames/`.
- HUD ושמות מהלכים הפכו דינמיים לפי הדמות.
- בקרי mobile קיבלו safe-area, pressed state ונגישות בסיסית.
- בעיטה וקפיצה קיבלו assets נפרדים; damage עבר לפריים פעיל.
- השליח עבר ל־collision מרחבי ולתנועה מימין לשמאל.
- נוצרה חבילת HANDOFF מלאה להמשך בצ'אט אחר.
# 2026-08-16 — generated walk-source batch

- Added six-frame walk-forward source sheets for Yashar, FRISBEE, The Icon, T.M.R and Referee under `HANDOFF/GENERATED/animations`.
- Added `GENERATED/PRODUCTION-STATUS.md` with QA status and the exact finishing contract.
- Added `GENERATED/PROMPTS.md` with reproducible generation rules and character locks.
- Sources are intentionally not connected to runtime yet because their backgrounds still require clean alpha extraction and frame normalization.

