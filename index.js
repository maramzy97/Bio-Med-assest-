const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { createHash, timingSafeEqual } = require("node:crypto");
initializeApp();
const STAFF_PIN = defineSecret("STAFF_PIN");
const database = getFirestore();
const emulator = process.env.FUNCTIONS_EMULATOR === "true";
const hash = (value) => createHash("sha256").update(value).digest();

exports.verifyStaffPin = onCall(
  {
    region: "us-central1",
    secrets: [STAFF_PIN],
    enforceAppCheck: !emulator,
    maxInstances: 10,
  },
  async (request) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "يلزم بدء جلسة مشاهدة أولاً.");
    const pin = request.data?.pin;
    if (typeof pin !== "string" || !/^\d{4}$/.test(pin))
      throw new HttpsError(
        "invalid-argument",
        "الرمز يجب أن يتكون من أربعة أرقام.",
      );
    const secret = STAFF_PIN.value();
    if (!/^\d{4}$/.test(secret))
      throw new HttpsError(
        "failed-precondition",
        "لم يتم إعداد رمز الحماية على الخادم.",
      );
    // The default 1234 is intentionally DEMO ONLY. Never deploy it for hospital use.
    if (!emulator && secret === "1234")
      throw new HttpsError(
        "failed-precondition",
        "غيّر الرمز الافتراضي قبل التشغيل الفعلي.",
      );

    // Independent UID and IP buckets: recreating an anonymous account does not reset the IP limit.
    // Compare first, then update failed-attempt counters in one transaction (no race).
    const validPin = timingSafeEqual(hash(pin), hash(secret));
    const now = Date.now();
    const ip =
      request.rawRequest.ip ||
      request.rawRequest.socket.remoteAddress ||
      "unknown";
    const keys = [`uid:${request.auth.uid}`, `ip:${ip}`].map((key) =>
      hash(`${secret}:${key}`).toString("hex"),
    );
    await database.runTransaction(async (transaction) => {
      const refs = keys.map((key) =>
        database.collection("_pinAttempts").doc(key),
      );
      const snapshots = await Promise.all(
        refs.map((ref) => transaction.get(ref)),
      );
      const next = snapshots.map((snapshot) => {
        const old = snapshot.data();
        const withinWindow = old && now - old.startedAt < 15 * 60 * 1000;
        const count = withinWindow ? old.count : 0;
        if (count >= 5)
          throw new HttpsError(
            "resource-exhausted",
            "محاولات كثيرة. حاول بعد ١٥ دقيقة.",
          );
        return {
          startedAt: withinWindow ? old.startedAt : now,
          count: count + (validPin ? 0 : 1),
          expireAt: Timestamp.fromMillis(now + 24 * 60 * 60 * 1000),
        };
      });
      refs.forEach((ref, i) => transaction.set(ref, next[i]));
    });
    if (!validPin)
      throw new HttpsError("permission-denied", "رمز الحماية غير صحيح.");
    // Short-lived write privilege enforced by rules even if the ID token is refreshed later.
    const token = await getAuth().createCustomToken(request.auth.uid, {
      pinVerifiedUntil: now + 5 * 60 * 1000,
    });
    return { token };
  },
);
