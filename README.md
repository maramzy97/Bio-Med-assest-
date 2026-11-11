# نظام إدارة الأجهزة الطبية — حزمة النشر

## الملفات
- `index.html` التطبيق كله | `sw.js` + `manifest.webmanifest` + الأيقونات = PWA أوفلاين وقابل للتثبيت
- `firebase-config.js` إعدادات Firebase (تملاها إنت) | `firestore.rules` قواعد الأمان

## بدون Firebase (تجربة سريعة)
ارفع المجلد كما هو. التطبيق يشتغل محليًا على كل جهاز بـ PIN = 1234.

## تشغيل البيانات المشتركة للفريق (Firebase — مجاني)
1. console.firebase.google.com ← Add project.
2. **Authentication** ← Sign-in method ← فعّل Email/Password. ثم Users ← Add user لكل مهندس (إيميل + باسورد).
   ثم Settings ← User actions ← عطّل Enable create (sign-up).
3. **Firestore Database** ← Create database (Production mode).
4. افتح Rules، الصق محتوى `firestore.rules`، واضغط Publish. (القواعد تسمح بالكتابة بس لمستخدمي الإيميل/الباسورد. لتشديد أكتر ضيف شرط `request.auth.token.email in [...]` بإيميلات الفريق.)
5. Project settings ← Your apps ← Web (</>) ← انسخ `firebaseConfig` والصقه في `firebase-config.js`.
6. ارفع المجلد على استضافة HTTPS (Firebase Hosting / Cloudflare Pages / Netlify / GitHub Pages). HTTPS ضروري للكاميرا والأوفلاين.
7. افتح التطبيق ← ⚙️ ← استيراد (JSON/Excel) لو عندك بيانات، أو ابدأ بإضافة الأجهزة.

## ملاحظات
- الزائر (بدون دخول) يعرض فقط. أي تعديل يطلب تسجيل الدخول، والقواعد في السيرفر هي اللي بتحمي البيانات.
- ملصقات الـ QR فيها رابط الموقع. ثبّت الدومين النهائي قبل ما تطبع.
- خد نسخة احتياطية دورية من ⚙️ ← تصدير.
- عند تحديث الملفات غيّر رقم `bme-v1` في `sw.js` علشان الأجهزة تاخد النسخة الجديدة.
