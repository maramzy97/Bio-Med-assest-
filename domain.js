export const HOSPITAL = "مستشفى تمي الأمديد المركزي";
export const STATUS = {
  active: { label: "في الخدمة", className: "badge-active" },
  down: { label: "خارج الخدمة", className: "badge-down" },
  maintenance: { label: "تحت الصيانة", className: "badge-maintenance" },
};
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const isDue = (device) =>
  Boolean(device.nextPmDate && device.nextPmDate <= today());
export const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLocaleLowerCase("ar");
export function filterDevices(devices, search, departmentId, status) {
  const query = normalize(search);
  return devices.filter(
    (d) =>
      (!departmentId || d.departmentId === departmentId) &&
      (!status || d.status === status) &&
      (!query ||
        [d.name, d.serialNumber, d.assetId].some((v) =>
          normalize(v).includes(query),
        )),
  );
}
export function qrAssetId(input) {
  const text = input.trim();
  if (!text) throw new Error("أدخل رقم الأصل أو امسح كود الجهاز");
  if (/^https?:\/\//i.test(text)) {
    const id = new URL(text).searchParams.get("asset");
    if (!id) throw new Error("الكود لا يحتوي على رقم أصل");
    return id;
  }
  return text;
}
export const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(
        new Date(`${value}T12:00:00`),
      )
    : "غير محدد";
export const formatMoney = (value) =>
  new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
export function seedData() {
  const departments = [
    { id: "dialysis", name: "الغسيل الكلوي" },
    { id: "icu", name: "العناية المركزة" },
    { id: "nicu", name: "المبتسرين" },
    { id: "surgery", name: "العمليات" },
  ];
  const future = new Date();
  future.setDate(future.getDate() + 30);
  const past = new Date();
  past.setDate(past.getDate() - 3);
  const rows = [
    ["جهاز غسيل كلوي", "dialysis", "4008S", "Fresenius", "active"],
    ["جهاز تنفس صناعي", "icu", "Evita V300", "Dräger", "down"],
    ["حضانة أطفال", "nicu", "Isolette 8000", "Dräger", "active"],
    ["جهاز تخدير", "surgery", "Aisys CS2", "GE Healthcare", "maintenance"],
    ["مونيتور مراقبة مريض", "icu", "IntelliVue MX450", "Philips", "active"],
    ["مضخة محاليل", "nicu", "Infusomat Space", "B. Braun", "active"],
  ];
  return {
    departments,
    devices: rows.map(
      ([name, departmentId, model, manufacturer, status], i) => ({
        id: `demo-${i + 1}`,
        name,
        departmentId,
        model,
        manufacturer,
        status,
        assetId: `BME-${String(i + 1).padStart(4, "0")}`,
        serialNumber: `SN-${70231 + i}`,
        warrantyEnd: "2027-12-31",
        vendorName: "شركة الخدمات الطبية — بيانات تجريبية",
        vendorPhone: "",
        nextPmDate: (i === 0 || i === 3 ? past : future)
          .toISOString()
          .slice(0, 10),
        notes: "بيانات توضيحية فقط، وليست سجلات حقيقية للمستشفى.",
      }),
    ),
    logs: [],
  };
}
