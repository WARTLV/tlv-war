# Backlog קנוני

## P0 — לפני הרחבת תוכן

1. להחליף booleans ב־Actor state machine וטבלת transitions.
2. להעביר את כל המהלכים ל־frame-data עם startup/active/recovery/hitbox.
3. 2.5D hitboxes אמיתיים כולל Y/Z ושליח לפי lane.
4. לנרמל תנועה אלכסונית, acceleration/friction ו־air steering.
5. לסנכרן jump frames לפיזיקה ו־landing lock.
6. camera dead-zone + boss arena soft lock.
7. `enemies[]` + wave director + attacker slots.
8. לוודא UTF-8 עברי בדפדפן ובטלפון.

## P1 — נכסים והרגשה

1. לתקן BIG.COM walk F06 ולבצע motion QA.
2. לייצר 5 walk-forward ו־6 walk-back — סך 66 פריימים חסרים, 72 כולל סט מלא.
3. idle/breath ארבעה פריימים לכל שש הדמויות.
4. hurt-high/low, knockdown/KO, victory לכל שש הדמויות.
5. לייצר שש סביבות Rothschild בשכבות parallax.
6. לייצר props: שני עצים, ספסל, פנס, קיוסק, קורקינט, אופניים קשורים, פח, שולחן קפה, עמוד מודעות ועמודים נמוכים.
7. לחבר מהלכי boss מה־handoff ולתת לכל בוס 2–3 patterns.
8. combat feedback: hit spark runtime, hitstop, shake עדין, knockback.

## P2 — מוצר

1. combo 3-hit עם input buffer.
2. jump attack, low sweep, dash-smash, body-blow.
3. pickups, energy/food, props שבירים ו־difficulty ramp.
4. pause, defeat, results, settings, sound/haptics toggles.
5. left-handed controls וגודל/opacity controls.
6. debug HUD מקומי מאחורי `?debug=1`.

## תנאי מסירה לכל משימה

- לא דורסים קובץ מאושר; כותבים גרסה חדשה או שומרים source.
- בדיקת קוד + בדיקת דפדפן אמיתית.
- צילום/וידאו בשלושת גדלי המובייל.
- עדכון `CURRENT-STATE.md` ו־`CHANGELOG.md`.
- אין שירותים בתשלום ואין תלות רשת חדשה ללא אישור מפורש.

