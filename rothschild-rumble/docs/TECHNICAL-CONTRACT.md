# חוזה טכני

## אנימציות

- master: PNG RGBA 768×1024.
- root anchor: x=384, ground y=972.
- alpha נקי; פיקסלים שקופים עם RGB=0; אין chroma fringe.
- רגל נוגעת בקו הקרקע; אין padding משתנה בין פריימים.
- סטיית ראש/רגליים בלופ: עד 2px לאחר normalization.
- walk-forward: 6 פריימים — contact, down, pass, up, contact, recover.
- walk-back: 6 פריימים נפרדים; אסור להפוך סדר של forward ולהציג זאת כ־backward.
- 10–12fps walk, 6–8fps idle.
- displacement מבוצע במנוע, לא baked לתוך הקנבס.

## קלט

- input buffer 120ms.
- global reset ב־pointerup, pointercancel, blur ו־visibilitychange.
- multi-touch: תנועה ופעולה בו־זמנית.
- `aria-pressed`, labels ו־progressbar values חייבים להתעדכן.

## ביצועים

- יעד 55–60fps בטלפון בינוני; frame p95 מתחת 20ms.
- fixed-step accumulator על requestAnimationFrame.
- preload לכל sprite לפני encounter; אין decode בזמן contact.
- שכבות רקע פעילות עד 12; נכס runtime יחיד עד כ־350KB ככל האפשר.

## בדיקות קבלה

- גדלים: 667×375, 844×390, 932×430 landscape.
- אין control מחוץ למסך או מעל דמות במרכז.
- חמש פעולות מציגות חמש תנועות מובחנות.
- קפיצה עוברת מעל השליח עם margin של לפחות 25px.
- sticky input אינו נשאר לאחר מעבר אפליקציה.
- אין שגיאות console; `node --check game-v2.js` עובר.

