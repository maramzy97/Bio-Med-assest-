import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDoqVKeAgnI4e1HVRCRgo7Gb-eh9muQIr4",
  authDomain: "bio-med-mr.firebaseapp.com",
  projectId: "bio-med-mr",
  storageBucket: "bio-med-mr.firebasestorage.app",
  messagingSenderId: "781823836877",
  appId: "1:781823836877:web:14d4dd3e38db270f1a5f84"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// إيقاف وضع الـ Demo لتفعيل المزامنة الحية
export const isDemo = false;

// دالة التحقق من رمز PIN
export async function verifyStaffPin(pin) {
  // الرمز الافتراضي 1234 أو الرمز الخاص بك
  if (pin === "1234" || pin === "0000") {
    return true;
  }
  throw new Error("رمز الحماية غير صحيح");
}
