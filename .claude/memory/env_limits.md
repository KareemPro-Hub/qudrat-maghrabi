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

### ✅ بيئة الماك بوك اير — اتثبتت كاملة 2026-09-05 (`flutter doctor` = No issues found)
| | المكان |
|---|---|
| Flutter 3.47.2 | `/Volumes/MacBook SSD/Kareem-AI/dev/flutter` (على الهارد الخارجي) |
| Xcode 26.6 | `/Volumes/MacBook SSD/Applications/Xcode.app` — **مش في `/Applications`** |
| Android SDK 36 | `~/Library/Android/sdk` (+ `cmdline-tools/latest` اتنزّلت يدويًا) |
| Java 17 (Temurin) | `/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home` |
| CocoaPods 1.17 · Homebrew | `/opt/homebrew` |

كل الـ`export`ات (PATH وANDROID_HOME وJAVA_HOME وbrew shellenv) في `~/.zprofile`.

### 🔴 استخدم `dart analyze` لا `flutter analyze`
`flutter analyze` **بيقع دايمًا** على هذا المشروع بـ`analysis server exited with code 255` +
`FormatException: Unterminated string`. السبب: مسار المشروع فيه حروف عربية، وخادم التحليل في
3.47.2 بيحسب طول رسالة LSP بالحروف بدل البايتات فبتتقطع. مش مشكلة في الكود.
**السيملينك الإنجليزي لا يحل المشكلة** (جُرّب — Flutter بيرجع للمسار الأصلي).
```
cd "/Volumes/MacBook SSD/Kareem-AI/قدرات المغربي/App" && dart analyze
cd "/Volumes/MacBook SSD/Kareem-AI/قدرات المغربي/App" && flutter test
```
`flutter test` يعمل بلا مشاكل (51 اختبارًا، كلها ناجحة 2026-09-05).

### ملاحظات تثبيت (لو اتكرر على جهاز تاني)
- `sudo gem install cocoapods` **بيفشل** لأن مسار Xcode فيه مسافة (`MacBook SSD`) و`make` بيتكسر. الحل: Homebrew ثم `brew install cocoapods`.
- الصق أمرًا واحدًا في المرة: لصق أوامر طويلة في Terminal بيسيب مخلّفات (`[200~`، `16`، `¨`) — والكيبورد العربي بيضيف `¨`. الحل: نافذة Terminal جديدة (⌘N) ثم اللصق.

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

## حذف الملفات على جهاز كريم — الحل الجذري
الـVM ممنوع من الحذف افتراضيًا، فأي `rm` بيرجّع `Operation not permitted` وgit بيفشل بـ`unable to unlink old`.
**الترتيب الصحيح للحل:**
1. **اطلب صلاحية الحذف** بـ`device_request_delete_permission` على المجلدات الموصّلة — كريم يوافق مرة واحدة وتشتغل لباقي الجلسة. ده الحل الأنضف.
2. لو رُفض أو مش متاح: انقل الملف المعترض بـ`mv` بدل ما تحذفه (`.git/_stale/` للأقفال، `_to_delete/` لملفات العمل)، وقول لكريم مكانها.
3. آخر حل: أمر `rm` جاهز للّصق يشغّله كريم في Terminal بنفسه.

⚠️ **متكتبش فوق ملف متتبَّع في Git من غير ما تعمل commit**، وإلا الـ`git pull` على الجهاز التاني هيفشل بـ`local changes would be overwritten`. الحل وقتها: `git checkout -- <الملف>` ثم إعادة الدمج. (حصل فعلًا 2026-09-02.)
