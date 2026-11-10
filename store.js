import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { auth, db, isDemo } from "./firebase";
import { seedData } from "./domain";
const KEY = "tamy-biomedical-demo-v1";
function readDemo() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data?.devices && data?.departments && data?.logs) return data;
  } catch {
    /* reset invalid local sample data */
  }
  return seedData();
}
function mutateDemo(callback) {
  const data = readDemo();
  callback(data);
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("biomedical-demo-change"));
}
export function useRegistry() {
  const [data, setData] = useState({
    devices: [],
    departments: [],
    loading: true,
    error: "",
  });
  useEffect(() => {
    if (isDemo) {
      const load = () => {
        const d = readDemo();
        setData({
          devices: d.devices,
          departments: d.departments,
          loading: false,
          error: "",
        });
      };
      load();
      window.addEventListener("storage", load);
      window.addEventListener("biomedical-demo-change", load);
      return () => {
        window.removeEventListener("storage", load);
        window.removeEventListener("biomedical-demo-change", load);
      };
    }
    const loaded = new Set();
    const subscriptions = ["devices", "departments"].map((name) =>
      onSnapshot(
        collection(db, name),
        (snapshot) => {
          loaded.add(name);
          setData((old) => ({
            ...old,
            [name]: snapshot.docs.map((d) => ({ ...d.data(), id: d.id })),
            loading: loaded.size < 2,
          }));
        },
        (error) =>
          setData((old) => ({
            ...old,
            loading: false,
            error: friendlyError(error),
          })),
      ),
    );
    return () => subscriptions.forEach((unsubscribe) => unsubscribe());
  }, []);
  return data;
}
export function useHistory(deviceId) {
  const [state, setState] = useState({ logs: [], loading: true, error: "" });
  useEffect(() => {
    setState({ logs: [], loading: true, error: "" });
    if (!deviceId) return;
    if (isDemo) {
      const load = () =>
        setState({
          logs: readDemo()
            .logs.filter((l) => l.deviceId === deviceId)
            .sort(
              (a, b) =>
                b.occurredOn.localeCompare(a.occurredOn) ||
                b.createdAt - a.createdAt,
            ),
          loading: false,
          error: "",
        });
      load();
      window.addEventListener("storage", load);
      window.addEventListener("biomedical-demo-change", load);
      return () => {
        window.removeEventListener("storage", load);
        window.removeEventListener("biomedical-demo-change", load);
      };
    }
    return onSnapshot(
      query(
        collection(db, "devices", deviceId, "maintenanceLogs"),
        orderBy("occurredOn", "desc"),
        orderBy("createdAt", "desc"),
      ),
      (snapshot) => {
        setState({
          logs: snapshot.docs.map((d) => ({ ...d.data(), id: d.id })),
          loading: false,
          error: "",
        });
      },
      (error) =>
        setState({ logs: [], loading: false, error: friendlyError(error) }),
    );
  }, [deviceId]);
  return state;
}
export async function addDepartment(name) {
  if (isDemo)
    return mutateDemo((d) =>
      d.departments.push({ id: crypto.randomUUID(), name }),
    );
  await addDoc(collection(db, "departments"), {
    name,
    createdAt: serverTimestamp(),
  });
}
export async function saveDevice(id, values) {
  if (isDemo)
    return mutateDemo((d) => {
      if (id)
        d.devices = d.devices.map((device) =>
          device.id === id ? { ...device, ...values } : device,
        );
      else d.devices.push({ ...values, id: crypto.randomUUID() });
    });
  if (id)
    await updateDoc(doc(db, "devices", id), {
      ...values,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser.uid,
    });
  else
    await addDoc(collection(db, "devices"), {
      ...values,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser.uid,
    });
}
export async function setStatus(id, status) {
  return saveDevice(id, { status });
}
export async function addMaintenance(deviceId, values) {
  const { nextPmDate, ...log } = values;
  if (isDemo)
    return mutateDemo((d) => {
      d.logs.push({
        ...log,
        id: crypto.randomUUID(),
        deviceId,
        createdAt: Date.now(),
      });
      d.devices = d.devices.map((device) =>
        device.id === deviceId
          ? { ...device, status: values.resultingStatus, nextPmDate }
          : device,
      );
    });
  // Atomic: the immutable maintenance event and current equipment state commit together.
  const batch = writeBatch(db);
  batch.set(doc(collection(db, "devices", deviceId, "maintenanceLogs")), {
    ...log,
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser.uid,
  });
  batch.update(doc(db, "devices", deviceId), {
    status: values.resultingStatus,
    nextPmDate,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser.uid,
  });
  await batch.commit();
}
export function friendlyError(error) {
  const code = error?.code || "";
  if (code.includes("permission-denied"))
    return "غير مصرح. تحقق من رمز الحماية وقواعد Firestore ثم أعد المحاولة.";
  if (code.includes("resource-exhausted"))
    return "محاولات كثيرة. انتظر قبل إعادة المحاولة.";
  if (code.includes("unavailable") || code.includes("network"))
    return "تعذر الاتصال بالخادم. تحقق من الشبكة وأعد المحاولة.";
  if (code.includes("unauthenticated"))
    return "انتهت جلسة التحقق. أعد إدخال رمز الحماية.";
  return error?.message || "حدث خطأ غير متوقع. أعد المحاولة.";
}
