import { initializeApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
} from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";

// Copy .env.example to .env.local and insert your Firebase web app configuration.
// Web configuration is public identification, NOT authorization. Deploy firestore.rules.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};
export const isDemo =
  !firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId;
export const app = isDemo ? null : initializeApp(firebaseConfig);
if (app && import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(
      import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY,
    ),
    isTokenAutoRefreshEnabled: true,
  });
}
// Persistent hospital-data caching is OFF by default on shared hospital devices.
// Only opt in on a managed, trusted device. Memory cache still supports live listeners.
export const db = !app
  ? null
  : import.meta.env.VITE_FIREBASE_PERSIST_CACHE === "true"
    ? initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      })
    : getFirestore(app);
export const auth = app ? getAuth(app) : null;
export const functions = app
  ? getFunctions(app, import.meta.env.VITE_FUNCTIONS_REGION || "us-central1")
  : null;
let anonymousLogin;
export async function ensureGuest() {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;
  anonymousLogin ||= signInAnonymously(auth).catch((error) => {
    anonymousLogin = null;
    throw error;
  });
  return (await anonymousLogin).user;
}
export async function verifyStaffPin(pin) {
  if (isDemo) {
    if (pin !== "1234") throw new Error("رمز الحماية غير صحيح");
    return;
  }
  await ensureGuest();
  const result = await httpsCallable(functions, "verifyStaffPin")({ pin });
  await signInWithCustomToken(auth, result.data.token);
}
