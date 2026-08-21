# Game Design — Rothschild Rumble

## לולאת משחק

בחירת לוחם → התקדמות לאורך הרחוב → wave של 2–4 אויבים חלשים → פתיחת הדרך → בוס → מעבר אזור → בוס סופי → תוצאות.

## תנועה

- משחק 2.5D: X קדימה/אחורה, Y עומק מוגבל, Z לקפיצה.
- יעד מהירות: X 4.8px/tick, Y 2.6px/tick, אלכסון מנורמל.
- backward = 82% ממהירות forward.
- jump מומלץ: velocity 21, gravity .92, apex כ־240px, זמן אוויר כ־0.76s.
- camera dead-zone: 32%–58% מרוחב המסך; הרקע זז רק כשהשחקן יוצא ממנו.

## קרב

- punch: 4 פריימים, active ב־F03, damage 14, range 92.
- kick: 4 פריימים, active ב־F03, damage 18, range 122.
- uppercut: 4 פריימים, active ב־F03, damage 23, range 88 ו־launch.
- hitstop: 55–70ms; hitstun לפי עוצמה; כל swing פוגע פעם אחת בלבד.
- states נדרשים: idle, walk, jump_start, airborne, landing, attack_startup, attack_active, attack_recovery, guard, evade, hitstun, knockdown, ko.

## אויבי רחוב

חלשים מבוסים, HP יעד 24–32, power 3. לפני תקיפה bubble אקראית: “יש לך שקל?” או “יש לך סיגריה?”. AI: approach → flank → telegraph → active → recovery. עד שני תוקפים פעילים והשאר ממקמים את עצמם.

## השליח

שליח במיתוג כחול רוכב מימין לשמאל על שביל האופניים בלבד כל 12 שניות. בארבע ההופעות הראשונות מופיעה הוראת “קפוץ!” 650–850ms לפני overlap. collision חייב לבדוק X, lane depth וגובה כפות הרגליים, לא timeout קשיח.

## מובייל

יעד בסיס 844×390, תמיכה 667×375 עד 932×430. לפחות 55–60% מאמצע המסך פנויים לקרב. HUD עליון 48–56px. controls: דיסק תנועה משמאל, Attack/Jump גדולים מימין, Kick/Guard/Special משניים; כל hit target לפחות 56×56.

