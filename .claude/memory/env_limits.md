---
name: env-limits
description: قيود البيئة عند العمل على مشروع قدرات المغربي (المسارات على كل جهاز، Flutter، أقفال git، الشبكة، المتصفح) وكيفية تجاوزها.
type: project
---

## 🔴 مسارات المشروع — قاعدة إلزامية
**تحقّق من `connectedFolders` أول الجلسة لتعرف على أي جهاز أنت.**

### الماك بوك اير — البنية الجديدة (المعتمدة)
```
المجلد الأساسي : /Volumes/MacBook SSD/Kareem-AI/قدرات المغربي
التطبيق        : /Volumes/MacBook SSD/Kareem-AI/قدرات المغربي/App
المنصة         : /Volumes/MacBook SSD/Kareem-AI/قدرات المغربي/Platform
```
المسار فيه مسافات وحروف عربية ⇒ **علامات اقتباس دائمًا**.

### الماك ميني (`kareem-mac-local`) — البنية القديمة
```
التطبيق : /Users/KareemMac/Documents/Flutter/qudrat_maghrabi_app
المنصة  : /Users/KareemMac/Documents/AI/منصة قدرات المغربي
```

**ممنوع منعًا باتًا أدّي لكريم أمر `flutter` أو `npm` أو `git` من غير `cd` للمجلد الصح قبله في نفس السطر.**
```
cd "/Volumes/MacBook SSD/Kareem-AI/قدرات المغربي/App" && flutter analyze && flutter test
```
**ليه:** في 2026-09-02 أديته الأمر من غير `cd` وهو واقف في `~`، فظل يعمل **نص ساعة** ويفحص مجلد المستخدم كله.
**علامة الغلط:** `Analyzing KareemMac...` بدل اسم مجلد المشروع.

## Flutter
- شِل الجهاز (`device_bash`) هو Linux VM بلا flutter/dart — **لا يمكن تشغيل `flutter analyze` ولا `flutter test` ولا البناء**. يُطلب من كريم يشغّلهم.
- الحاوية السحابية كذلك بلا dart.
- **بناء iOS:** `./tool/build_ios_release.sh` — مش `flutter build ipa` لوحده (السكربت بيحط `--dart-define-from-file` وبيتحقق إن إعدادات Supabase دخلت البناء).

## Git — يعمل ✅
الدفع شغّال من `device_bash` باستخدام ملف الاعتماد المخزَّن:
```
git -c credential.helper="store --file=$PWD/.git/.git-credentials-agent" push origin HEAD:flutter-app
```
(المنصة → `main`، التطبيق → `flutter-app`). لا تكتب أي توكن في `remote.origin.url` ولا في أي ملف آخر.
**تحقّق دائمًا بعد الدفع:** `git rev-parse HEAD` مقابل `git ls-remote origin refs/heads/<branch> | cut -f1`.

## قفل git — أهم عقبة متكررة
الـ VM **لا يستطيع حذف الملفات**، فأي أمر git فاشل بيسيب `.git/index.lock` و`.git/HEAD.lock` وأقفال المراجع، وكل أمر بعده يفشل. الحل قبل أي `commit`/`push`:
```
mkdir -p .git/_stale
for f in HEAD.lock index.lock refs/heads/main.lock refs/remotes/origin/flutter-app.lock; do
  [ -e ".git/$f" ] && mv ".git/$f" ".git/_stale/$(basename $f).$(date +%s%N)"
done
```
(الاسم الجديد لازم يكون فريد وإلا فشل الـ `mv`.)
ولو ظهرت `fatal: cannot lock ref 'HEAD'` فالمسؤول هو `HEAD.lock` مش `index.lock`.

## الشبكة
- `curl` من `device_bash` ومن الحاوية السحابية **محجوب** لأغلب النطاقات (supabase.co، qudratmaghrabi.com، pub.dev) — بيرجّع `403 CONNECT tunnel failed`.
- **البديل الشغّال: المتصفح.** `mcp__claude-in-chrome__javascript_tool` بينفّذ `fetch` من سياق الصفحة، وده الطريق للوصول لأي API خارجي (اتستخدم للتحقق من أسرار Supabase ومن نسخة App Store وتوثيق pub.dev).
- للنقل بين الجهاز والحاوية استخدم `device_stage_files`.

## المتصفح
- Chrome (`claude-in-chrome`) هو المفضّل. حسابات Google المسجَّلة فيه: `/u/0` egy.kareem.pro · `/u/1` egy.kareem.ai · `/u/2` **qudrat.maghrabi.pro (حساب Play Console)**.
- App Store Connect غالبًا **غير مسجَّل دخول** في Chrome — يُطلب من كريم يسجّل قبل أي شغل عليه.
- لوحة Supabase أحيانًا بتطلع صفحة بيضا فاضية؛ البديل هو الـ API من سياق الصفحة (شوف [store_purchase_failure](store_purchase_failure.md)).
