import { after, before, test } from "node:test";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
let env;
const uid = "technician-test";
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-biomedical",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "departments", "icu"), {
      name: "العناية المركزة",
      createdAt: new Date(),
    });
  });
});
after(async () => {
  await env?.cleanup();
});
const staff = () =>
  env
    .authenticatedContext(uid, { pinVerifiedUntil: Date.now() + 300000 })
    .firestore();
const values = () => ({
  name: "جهاز تنفس",
  assetId: "BME-TEST",
  serialNumber: "SN-TEST",
  model: "Test",
  manufacturer: "Test",
  departmentId: "icu",
  status: "down",
  warrantyEnd: "",
  vendorName: "",
  vendorPhone: "",
  nextPmDate: "",
  notes: "",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  updatedBy: uid,
});
test("guests can read equipment metadata", async () => {
  await assertSucceeds(
    getDoc(doc(env.unauthenticatedContext().firestore(), "departments", "icu")),
  );
});
test("guests cannot create records", async () => {
  await assertFails(
    setDoc(
      doc(env.unauthenticatedContext().firestore(), "devices", "guest-device"),
      values(),
    ),
  );
});
test("anonymous users cannot bypass the PIN guard", async () => {
  await assertFails(
    setDoc(
      doc(
        env.authenticatedContext("anonymous-user").firestore(),
        "devices",
        "anon-device",
      ),
      values(),
    ),
  );
});
test("expired verification cannot write", async () => {
  await assertFails(
    setDoc(
      doc(
        env
          .authenticatedContext(uid, { pinVerifiedUntil: Date.now() - 1000 })
          .firestore(),
        "devices",
        "expired-device",
      ),
      values(),
    ),
  );
});
test("verified staff can create a valid equipment record", async () => {
  await assertSucceeds(
    setDoc(doc(staff(), "devices", "valid-device"), values()),
  );
});
test("schema validation rejects arbitrary status and patient fields", async () => {
  await assertFails(
    setDoc(doc(staff(), "devices", "invalid-status"), {
      ...values(),
      status: "hacked",
    }),
  );
  await assertFails(
    setDoc(doc(staff(), "devices", "invalid-field"), {
      ...values(),
      patientName: "not-allowed",
    }),
  );
});
test("invalid department references are rejected", async () => {
  await assertFails(
    setDoc(doc(staff(), "devices", "invalid-department"), {
      ...values(),
      departmentId: "does-not-exist",
    }),
  );
});
test("spoofed actor IDs are rejected", async () => {
  await assertFails(
    setDoc(doc(staff(), "devices", "invalid-actor"), {
      ...values(),
      updatedBy: "someone-else",
    }),
  );
});
test("maintenance and equipment status commit atomically", async () => {
  const db = staff();
  const batch = writeBatch(db);
  batch.update(doc(db, "devices", "valid-device"), {
    status: "active",
    nextPmDate: "2027-01-01",
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
  batch.set(doc(db, "devices", "valid-device", "maintenanceLogs", "log-1"), {
    occurredOn: "2026-01-01",
    type: "corrective",
    description: "إصلاح العطل",
    spareParts: "فلتر",
    technician: "مهندس اختبار",
    cost: 200,
    resultingStatus: "active",
    createdAt: serverTimestamp(),
    createdBy: uid,
  });
  await assertSucceeds(batch.commit());
});
test("maintenance history is immutable even for verified staff", async () => {
  await assertFails(
    updateDoc(
      doc(staff(), "devices", "valid-device", "maintenanceLogs", "log-1"),
      { cost: 0 },
    ),
  );
});
test("private PIN rate-limit data is unreadable to clients", async () => {
  await assertFails(getDoc(doc(staff(), "_pinAttempts", "test")));
});
test("unknown collections reject client writes", async () => {
  await assertFails(setDoc(doc(staff(), "anything", "test"), { admin: true }));
});
