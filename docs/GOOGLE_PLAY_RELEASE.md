# خطة الإصدار الرسمي — وين راحت؟ / Android

آخر مراجعة: 2026-11-03. المصدر التقني: Capacitor 8، Android API 36. هذه **وثيقة تجهيز** وليست إثبات قبول التطبيق في Google Play.

## 1. ما أُنجز في الفرع

- بناء Android عبر Capacitor 8 دون تغيير طريقة عمل موقع GitHub Pages؛ الأصول مضمنة داخل التطبيق، وليس مجرد صفحة تعتمد على الإنترنت.
- الاحتفاظ ببيانات الإصدار الثالث في `localStorage`، مع استيراد JSON يدوياً بين الموقع والتطبيق.
- تصدير Android الآمن نسبياً عبر FileSystem إلى Cache + نظام المشاركة/الحفظ Android، بدلاً من روابط تنزيل Blob غير الموثوقة داخل WebView.
- عدم تشغيل Service Worker على Android؛ لأنه يحتوي أصلاً على أصول محلية.
- `allowBackup=false` وحظر نسخ بيانات التطبيق الاحتياطية التلقائية عبر خاصية التطبيق.
- سياسة خصوصية عربية منشورة كصفحة HTML في جذر المشروع بعد دمج الفرع: https://ammaralmaliky60-sys.github.io/ammar-wallet/privacy.html
- إعداد debug APK وsigned AAB في GitHub Actions. ملف التوقيع والأسرار لا يوجدان في Git.

## 2. قبل طلب النشر

1. **هوية رسمية:** راجع الاسم «وين راحت؟»، اسم المطوّر و`appId: iq.ammar.weenrahat`. تحقّق من توفر معرّف الحزمة قبل أول نشر؛ لا تغيّره بعد النشر.
2. **خصوصية وتواصل:** استبدل آلية التواصل الحالية بوسيلة دعم رسمية (مثل بريد خاص للتطبيق). تأكد أن كل تصريح في `privacy.html` صحيح بالنسبة إلى النسخة التي ستنشرها.
3. **اختبار يدوي:** Android 16/Honor X9d وجهاز أقدم، RTL، الوضع الداكن، إدخال مبلغ، الحسابات، التقارير PDF/CSV، نسخة JSON، استعادتها، العمل بلا إنترنت، الدوران/العودة، الضغط والتمرير، واختبار حفظ الملفات من نافذة Android.
4. **مراجعة الملفات الحساسة:** لا تدخل التزامات حقيقية في Fixtures أو Issues أو تقارير الأعطال؛ لا ترفع أي ملف `*.jks` أو JSON مالي.
5. **Store Listing:** الاسم العربي، وصف قصير ووصف كامل، أيقونة 512×512 (مصدر الشعار الحالي)، Feature Graphic ‏1024×500، صورتان على الأقل من شاشات فعلية، وبيانات التواصل الفعلية.
6. **التصريحات:** Data safety بعد مراجعة الحزمة والملحقات النهائية. المعلومات التي تُستخدم فقط على الجهاز دون إرسال لا تعتبر «collected» وفق تعريف Google، لكن الإفصاح مطلوب. أكمل استمارة **Financial features declaration** لأن التطبيق يدير الأموال والميزانية، رغم أنه لا يقدّم قروضاً أو استثمارات.
7. **الإصدارات:** زد `versionCode` مع كل رفع جديد. يُستخدم Android 16 `targetSdkVersion=36` وفق متطلبات Google Play بعد 31-08-2026.
8. **اختبار مغلق:** إذا كان حساب المطوّر شخصياً وأُنشئ بعد 13-11-2023، يتطلب عادةً 12 مختبراً مسجلاً لمدة متواصلة لا تقل عن 14 يوماً قبل طلب Production Access.
9. **سياسات عامة:** Content rating وTarget audience وApp access وAds declaration وخصوصية البيانات، وفق الحالة الحقيقية للتطبيق.

## 3. إنشاء مفتاح رفع Signing Key

أنشئ مفتاحاً على حاسبتك الشخصية فقط، واحتفظ بنسخة آمنة منفصلة. مثال:

```bash
keytool -genkeypair -v -keystore upload.jks -alias weenrahat-upload -keyalg RSA -keysize 3072 -validity 10000
```

استعمل كلمة سر قوية وفريدة للمخزن وللمفتاح. لا ترسل الكلمات أو ملف `upload.jks` في محادثة أو GitHub. فعّل Play App Signing في Google Play Console؛ مفتاح الرفع يوقّع AAB المقدّم، وGoogle Play يحتفظ بمفتاح توقيع التوزيع.

إذا رغبت في البناء عبر GitHub Actions، أضف في **Settings > Secrets and variables > Actions** الأسرار:

| اسم السر | المحتوى |
|---|---|
| `ANDROID_UPLOAD_KEYSTORE_BASE64` | تمثيل base64 لملف `upload.jks`، سطر واحد |
| `ANDROID_KEYSTORE_PASSWORD` | كلمة سر ملف JKS |
| `ANDROID_KEY_ALIAS` | alias مثل `weenrahat-upload` |
| `ANDROID_KEY_PASSWORD` | كلمة سر المفتاح |

بعد دمج PR في `main` افتح **Actions > Android (debug APK / signed Play AAB) > Run workflow**، وفعّل `release=true` وأدخل `version_code` متزايداً. نزّل `ween-rahat-play-signed-aab` من Artifacts. لا تُنشر تلقائياً أي نسخة على المتجر؛ يجب أن ترفعها من Play Console بنفسك وتُكمل المراجعة.

## 4. سياسة الأمان والبيانات

- لا يوجد Backend/Analytics/Ads بحسب كود هذا الإصدار. أي إضافة SDK أو شبكة مستقبلية تتطلب إعادة مراجعة الخصوصية وData safety.
- تطبيق Android لا يمكنه قراءة `localStorage` الخاص بـ Chrome/PWA. استخدم JSON export/import للتحويل، ثم قارن الأرصدة والحركات وتواريخ التقارير.
- ملفات المشاركة مؤقتة؛ بعد الضغط «نسخة احتياطية» يجب اختيار حفظ الملف في مكان خارج التطبيق، ثم اختبار فتحه مرة أخرى.
- حذف التطبيق دون نسخة خارجية قد يؤدي إلى فقدان جميع المعلومات.
- `allowBackup=false` لتقليل النسخ الآلي غير المقصود؛ ليس بديلاً عن تشفير بيانات مالية أكثر حساسية. إذا أُضيف ربط مصرفي مستقبلاً، يلزم إعادة تصميم الحفظ والأمن.

## 5. مراجع رسمية

- Google Play API 36: https://support.google.com/googleplay/android-developer/answer/11926878
- Privacy policy: https://support.google.com/googleplay/android-developer/answer/10144311
- Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Financial features: https://support.google.com/googleplay/android-developer/answer/9876821
- Testing for new personal accounts: https://support.google.com/googleplay/android-developer/answer/14151465
- App signing: https://developer.android.com/studio/publish/app-signing
- Capacitor 8: https://capacitorjs.com/docs/getting-started
