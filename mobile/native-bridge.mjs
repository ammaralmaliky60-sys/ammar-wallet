/*
 * The only native additions: share/save user-requested JSON, CSV and PDF files.
 * No analytics, remote backend, background sync or account tracking.
 */
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const isNative = Capacitor.isNativePlatform();

async function base64FromBlob(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('تعذرت قراءة الملف.'));
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      if (comma === -1) reject(new Error('صيغة الملف غير صالحة.'));
      else resolve(result.slice(comma + 1));
    };
    reader.readAsDataURL(blob);
  });
}

window.WRNative = {
  isNative,
  async saveFile(filename, blob) {
    if (!isNative) throw new Error('الحفظ الأصلي متاح داخل تطبيق Android فقط.');
    if (!(blob instanceof Blob)) throw new Error('الملف المطلوب غير صالح.');
    const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '');
    if (!safeName || safeName.length > 120) throw new Error('اسم الملف غير صالح.');
    const data = await base64FromBlob(blob);
    // Cache is temporary. The user must explicitly save/copy via the Android share sheet.
    await Filesystem.writeFile({ path: safeName, data, directory: Directory.Cache });
    const { uri } = await Filesystem.getUri({ path: safeName, directory: Directory.Cache });
    await Share.share({
      title: filename,
      files: [uri],
      dialogTitle: 'اختر مكان حفظ الملف أو مشاركته'
    });
    return { chooserOpened: true };
  }
};
