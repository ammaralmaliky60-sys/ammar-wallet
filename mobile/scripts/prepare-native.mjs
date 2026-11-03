/*
 * Apply minimal native hardening to the freshly generated Capacitor Android project.
 * Run AFTER cap add/sync, and BEFORE Gradle build.
 */
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mobile = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const android = join(mobile, 'android');
const read = path => readFile(path, 'utf8');
const versionCode = Number(process.env.ANDROID_VERSION_CODE || 1);
const versionName = process.env.ANDROID_VERSION_NAME || '1.0.0';
if (!Number.isSafeInteger(versionCode) || versionCode < 1)
  throw new Error('ANDROID_VERSION_CODE must be a positive integer.');
if (!/^\d+\.\d+\.\d+$/.test(versionName))
  throw new Error('ANDROID_VERSION_NAME must be in 1.0.0 format.');

const variablePath = join(android, 'variables.gradle');
let variables = await read(variablePath);
for (const [key, value] of [['minSdkVersion', 24], ['compileSdkVersion', 36], ['targetSdkVersion', 36]]) {
  const pattern = new RegExp('\\b' + key + '\\s*=\\s*\\d+');
  if (!pattern.test(variables)) throw new Error('Missing Gradle variable: ' + key);
  variables = variables.replace(pattern, key + ' = ' + value);
}
await writeFile(variablePath, variables);

const manifestPath = join(android, 'app/src/main/AndroidManifest.xml');
let manifest = await read(manifestPath);
if (!/<application\b/.test(manifest)) throw new Error('Android manifest has no application tag.');
manifest = manifest.replace(/<application\b([^>]*?)>/, (tag, attrs) => {
  const cleaned = attrs
    .replace(/\sandroid:allowBackup="[^"]*"/g, '')
    .replace(/\sandroid:fullBackupContent="[^"]*"/g, '');
  return '<application' + cleaned + ' android:allowBackup="false" android:fullBackupContent="false">';
});
await writeFile(manifestPath, manifest);

const gradlePath = join(android, 'app/build.gradle');
let gradle = await read(gradlePath);
if (!/\bversionCode\s+\d+/.test(gradle) || !/\bversionName\s+"[^"]*"/.test(gradle))
  throw new Error('Expected versionCode/versionName not found in app/build.gradle.');
gradle = gradle.replace(/\bversionCode\s+\d+/, 'versionCode ' + versionCode);
gradle = gradle.replace(/\bversionName\s+"[^"]*"/, 'versionName "' + versionName + '"');

const signingVars = ['ANDROID_KEYSTORE_PATH', 'ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS', 'ANDROID_KEY_PASSWORD'];
const configured = signingVars.filter(key => Boolean(process.env[key]));
if (configured.length && configured.length !== signingVars.length)
  throw new Error('Incomplete Android upload-signing environment.');
if (configured.length && !gradle.includes('// WR_RELEASE_SIGNING')) {
  gradle += `
// WR_RELEASE_SIGNING: values are read at build time; NEVER hard-code passwords.
android {
    signingConfigs {
        upload {
            storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            keyAlias System.getenv('ANDROID_KEY_ALIAS')
            keyPassword System.getenv('ANDROID_KEY_PASSWORD')
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.upload
        }
    }
}
`;
}
await writeFile(gradlePath, gradle);

const assetsDir = join(mobile, 'assets');
await mkdir(assetsDir, { recursive: true });
await copyFile(join(mobile, '..', 'icon.svg'), join(assetsDir, 'logo.svg'));
console.log('Android: API 36, cloud backup disabled, version ' + versionName + ' (' + versionCode + ')');
