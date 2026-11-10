import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
} from "react";
import {
  Activity,
  ArrowLeft,
  Building2,
  CalendarClock,
  Check,
  ChevronLeft,
  CircleAlert,
  ClipboardList,
  Download,
  HeartPulse,
  LayoutDashboard,
  LockKeyhole,
  Pencil,
  Plus,
  Printer,
  QrCode,
  ScanLine,
  Search,
  ShieldCheck,
  Stethoscope,
  Wifi,
  WifiOff,
  Wrench,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import { isDemo, verifyStaffPin } from "./firebase";
import {
  addDepartment,
  addMaintenance,
  friendlyError,
  saveDevice,
  setStatus,
  useHistory,
  useRegistry,
} from "./store";
import {
  filterDevices,
  formatDate,
  formatMoney,
  HOSPITAL,
  isDue,
  normalize,
  qrAssetId,
  STATUS,
  today,
} from "./domain";

const NAV = [
  { id: "dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { id: "assets", label: "الأجهزة", icon: HeartPulse },
  { id: "departments", label: "الأقسام", icon: Building2 },
  { id: "scanner", label: "مسح QR", icon: ScanLine },
];
const EMPTY_DEVICE = {
  name: "",
  assetId: "",
  serialNumber: "",
  model: "",
  manufacturer: "",
  departmentId: "",
  status: "active",
  warrantyEnd: "",
  vendorName: "",
  vendorPhone: "",
  nextPmDate: "",
  notes: "",
};
function Badge({ status }) {
  const s = STATUS[status];
  return (
    <span className={`badge ${s?.className || ""}`}>
      <i />
      {s?.label || "غير محدد"}
    </span>
  );
}
function Empty({
  title = "لا توجد نتائج",
  text = "جرّب تغيير البحث أو أضف سجلاً جديداً.",
  icon: Icon = ClipboardList,
}) {
  return (
    <div className="empty">
      <Icon size={38} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function ErrorMessage({ children }) {
  return children ? (
    <div className="error" role="alert">
      <CircleAlert size={17} />
      <span>{children}</span>
    </div>
  ) : null;
}
function Field({ label, children, className = "" }) {
  const id = useId();
  return (
    <label className={`field ${className}`} htmlFor={id}>
      <span id={`${id}-label`}>{label}</span>
      {React.cloneElement(children, {
        id,
        "aria-labelledby": children.props["aria-label"]
          ? undefined
          : `${id}-label`,
      })}
    </label>
  );
}
function Stat({ title, value, icon: Icon, tone = "teal", caption }) {
  return (
    <div className={`stat tone-${tone}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-slate-400 text-sm">{title}</span>
        <span className="stat-icon">
          <Icon size={21} />
        </span>
      </div>
      <strong>{value.toLocaleString("ar-EG")}</strong>
      <span className="text-xs text-slate-500">{caption}</span>
    </div>
  );
}

function Modal({ title, subtitle, children, onClose, wide = false }) {
  const box = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const root = box.current;
    const first = root.querySelector(
      '[autofocus], input, button, select, textarea, [tabindex="0"]',
    );
    first?.focus();
    const keydown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeRef.current();
      }
      if (event.key === "Tab") {
        const items = [
          ...root.querySelectorAll(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
          ),
        ].filter((el) => el.getClientRects().length);
        if (!items.length) return;
        const firstItem = items[0],
          lastItem = items[items.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === firstItem ||
            !root.contains(document.activeElement))
        ) {
          event.preventDefault();
          lastItem.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === lastItem ||
            !root.contains(document.activeElement))
        ) {
          event.preventDefault();
          firstItem.focus();
        }
      }
    };
    root.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = oldOverflow;
      root.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={box}
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <header className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="إغلاق">
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function PinModal({ onClose, onVerified }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    if (!/^\d{4}$/.test(pin) || busy) return;
    setBusy(true);
    setError("");
    try {
      await verifyStaffPin(pin);
      onVerified();
    } catch (err) {
      setError(friendlyError(err));
      setPin("");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="التحقق من صلاحية التعديل"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit} className="modal-body space-y-5">
        <div className="pin-emblem">
          <LockKeyhole size={28} />
        </div>
        <p className="text-center text-slate-400 text-sm">
          المشاهدة متاحة للجميع. أدخل رمز الحماية لتنفيذ هذا الإجراء.
        </p>
        <Field label="رمز الحماية — ٤ أرقام">
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            autoComplete="off"
            aria-label="رمز الحماية"
            maxLength={4}
            pattern="[0-9]{4}"
            required
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="pin-input"
            disabled={busy}
          />
        </Field>
        {isDemo && (
          <p className="text-xs text-center text-amber-300">
            وضع تجريبي: الرمز الافتراضي 1234
          </p>
        )}
        <ErrorMessage>{error}</ErrorMessage>
        <button
          className="btn btn-primary w-full"
          disabled={busy || pin.length !== 4}
        >
          {busy ? "جارٍ التحقق…" : "تحقق ومتابعة"}
          <ShieldCheck size={17} />
        </button>
      </form>
    </Modal>
  );
}

function AssetCard({ device, department, onOpen }) {
  return (
    <button className="asset-card text-right" onClick={() => onOpen(device.id)}>
      <div className="flex justify-between gap-3 items-center">
        <span className="equipment-icon">
          <Stethoscope size={23} />
        </span>
        <Badge status={device.status} />
      </div>
      <h3>{device.name}</h3>
      <p className="text-sm text-slate-400 mb-5">
        {department || "قسم غير محدد"}
      </p>
      <dl className="device-meta">
        <div>
          <dt>الموديل</dt>
          <dd dir="auto">{device.model || "—"}</dd>
        </div>
        <div>
          <dt>رقم الأصل</dt>
          <dd className="mono" dir="ltr">
            {device.assetId}
          </dd>
        </div>
        <div>
          <dt>الرقم المسلسل</dt>
          <dd className="mono" dir="ltr">
            {device.serialNumber || "—"}
          </dd>
        </div>
      </dl>
      <div className="card-footer">
        <span className={isDue(device) ? "text-amber-300" : ""}>
          {isDue(device) ? "الصيانة الوقائية مستحقة" : "عرض كارت الجهاز"}
        </span>
        <ChevronLeft size={17} />
      </div>
    </button>
  );
}

function Dashboard({ devices, departments, onOpen, onAssets }) {
  const active = devices.filter((d) => d.status === "active").length;
  const down = devices.filter((d) => d.status === "down").length;
  const maintenance = devices.filter((d) => d.status === "maintenance").length;
  const due = devices.filter(isDue).length;
  const alerts = devices
    .filter((d) => d.status === "down" || isDue(d))
    .sort((a, b) => Number(b.status === "down") - Number(a.status === "down"))
    .slice(0, 4);
  const uptime = devices.length
    ? Math.round((active / devices.length) * 100)
    : 0;
  return (
    <div className="space-y-6">
      <div className="welcome-panel">
        <div>
          <span className="eyebrow">رعاية المعدات. استمرارية الخدمة.</span>
          <h2>
            صورة واضحة، لقرار أفضل<span className="text-teal-300">.</span>
          </h2>
          <p>تابع جاهزية الأجهزة الطبية وأولويات الصيانة في مكان واحد.</p>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <HeartPulse size={68} strokeWidth={1.2} />
          <span />
          <i />
        </div>
      </div>
      <div className="stats-grid">
        <Stat
          title="إجمالي الأجهزة"
          value={devices.length}
          icon={HeartPulse}
          caption="أصل طبي مسجل"
        />
        <Stat
          title="في الخدمة"
          value={active}
          icon={Activity}
          tone="green"
          caption="جاهزة للتشغيل"
        />
        <Stat
          title="خارج الخدمة"
          value={down}
          icon={CircleAlert}
          tone="rose"
          caption="تحتاج إلى تدخل فني"
        />
        <Stat
          title="الصيانة المستحقة"
          value={due}
          icon={CalendarClock}
          tone="amber"
          caption="اليوم أو متأخرة"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h3>جاهزية الأجهزة</h3>
              <p>التوزيع حسب الحالة التشغيلية</p>
            </div>
            <Activity className="text-teal-300" size={20} />
          </div>
          <div className="readiness-number">
            <strong>
              {uptime.toLocaleString("ar-EG")}
              <small>٪</small>
            </strong>
            <span>نسبة الأجهزة في الخدمة</span>
          </div>
          <div
            className="progress-track"
            role="img"
            aria-label={`نسبة الأجهزة في الخدمة ${uptime}%`}
          >
            {[
              ["active", active],
              ["maintenance", maintenance],
              ["down", down],
            ].map(([status, count]) => (
              <div
                key={status}
                className={`segment-${status}`}
                style={{
                  width: `${devices.length ? (count / devices.length) * 100 : 0}%`,
                }}
              />
            ))}
          </div>
          <div className="status-legend">
            {Object.entries(STATUS).map(([status, s]) => (
              <div key={status}>
                <span>
                  <i className={`dot-${status}`} />
                  {s.label}
                </span>
                <b>
                  {devices
                    .filter((d) => d.status === status)
                    .length.toLocaleString("ar-EG")}
                </b>
              </div>
            ))}
          </div>
          <div className="panel-note">
            <ShieldCheck size={17} />
            الصيانة الدورية تدعم سلامة المرضى وكفاءة التشغيل.
          </div>
        </section>
        <section className="panel">
          <div className="section-heading">
            <div>
              <h3>تنبيهات تستحق الاهتمام</h3>
              <p>أولوية التدخل لفريق الهندسة الطبية</p>
            </div>
            <span className="count-pill">
              {devices
                .filter((d) => d.status === "down" || isDue(d))
                .length.toLocaleString("ar-EG")}
            </span>
          </div>
          {alerts.length ? (
            <div className="alert-list">
              {alerts.map((d) => (
                <button
                  key={d.id}
                  onClick={() => onOpen(d.id)}
                  className="alert-row"
                >
                  <span
                    className={`alert-symbol ${d.status === "down" ? "rose" : "amber"}`}
                  >
                    <CircleAlert size={19} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <strong>{d.name}</strong>
                    <small>
                      {
                        departments.find((dep) => dep.id === d.departmentId)
                          ?.name
                      }{" "}
                      ·{" "}
                      {d.status === "down"
                        ? "الجهاز متوقف عن العمل"
                        : "موعد الصيانة الوقائية مستحق"}
                    </small>
                  </span>
                  <ChevronLeft size={17} />
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title="لا توجد تنبيهات عاجلة"
              text="حالة الأجهزة ومواعيد الصيانة محدثة."
              icon={ShieldCheck}
            />
          )}
          <button className="text-action" onClick={onAssets}>
            الانتقال إلى سجل الأجهزة
            <ArrowLeft size={16} />
          </button>
        </section>
      </div>
    </div>
  );
}

function DeviceForm({ device, devices, departments, onClose, onSaved }) {
  const [values, setValues] = useState(
    device
      ? Object.fromEntries(
          Object.keys(EMPTY_DEVICE).map((k) => [
            k,
            device[k] || EMPTY_DEVICE[k],
          ]),
        )
      : { ...EMPTY_DEVICE },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const change = (e) =>
    setValues((old) => ({ ...old, [e.target.name]: e.target.value }));
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    const cleaned = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() : value,
      ]),
    );
    if (
      !cleaned.name ||
      !cleaned.assetId ||
      !cleaned.serialNumber ||
      !cleaned.departmentId
    )
      return setError("أكمل الحقول الإلزامية.");
    if (
      devices.some(
        (d) =>
          d.id !== device?.id &&
          normalize(d.assetId) === normalize(cleaned.assetId),
      )
    )
      return setError("رقم الأصل مستخدم بالفعل.");
    setBusy(true);
    try {
      await saveDevice(device?.id, cleaned);
      onSaved();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={device ? "تعديل بيانات الجهاز" : "إضافة جهاز جديد"}
      subtitle="سجل الأصل الطبي وبيانات الخدمة"
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
    >
      <form onSubmit={submit} className="modal-body">
        <div className="form-grid">
          <Field label="اسم الجهاز *">
            <input
              autoFocus
              name="name"
              value={values.name}
              onChange={change}
              required
              maxLength={160}
            />
          </Field>
          <Field label="القسم *">
            <select
              name="departmentId"
              value={values.departmentId}
              onChange={change}
              required
            >
              <option value="">اختر القسم</option>
              {departments.map((d) => (
                <option value={d.id} key={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="رقم الأصل *">
            <input
              name="assetId"
              dir="ltr"
              value={values.assetId}
              onChange={change}
              required
              maxLength={80}
              placeholder="BME-0001"
            />
          </Field>
          <Field label="الرقم المسلسل *">
            <input
              name="serialNumber"
              dir="ltr"
              value={values.serialNumber}
              onChange={change}
              required
              maxLength={120}
            />
          </Field>
          <Field label="الموديل">
            <input
              name="model"
              dir="auto"
              value={values.model}
              onChange={change}
              maxLength={120}
            />
          </Field>
          <Field label="الشركة المصنعة">
            <input
              name="manufacturer"
              dir="auto"
              value={values.manufacturer}
              onChange={change}
              maxLength={120}
            />
          </Field>
          <Field label="الحالة التشغيلية">
            <select name="status" value={values.status} onChange={change}>
              {Object.entries(STATUS).map(([key, s]) => (
                <option key={key} value={key}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="نهاية الضمان">
            <input
              type="date"
              name="warrantyEnd"
              value={values.warrantyEnd}
              onChange={change}
            />
          </Field>
          <Field label="شركة الصيانة / المورد">
            <input
              name="vendorName"
              value={values.vendorName}
              onChange={change}
              maxLength={160}
            />
          </Field>
          <Field label="هاتف شركة الصيانة">
            <input
              type="tel"
              name="vendorPhone"
              dir="ltr"
              value={values.vendorPhone}
              onChange={change}
              maxLength={50}
            />
          </Field>
          <Field label="موعد الصيانة الوقائية القادمة">
            <input
              type="date"
              name="nextPmDate"
              value={values.nextPmDate}
              onChange={change}
            />
          </Field>
          <Field label="ملاحظات" className="full-width">
            <textarea
              name="notes"
              rows={3}
              value={values.notes}
              onChange={change}
              maxLength={2000}
            />
          </Field>
        </div>
        <ErrorMessage>{error}</ErrorMessage>
        <div className="form-actions">
          <button
            className="btn btn-primary"
            disabled={busy || !departments.length}
          >
            {busy ? "جارٍ الحفظ…" : "حفظ بيانات الجهاز"}
            <Check size={17} />
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            إلغاء
          </button>
        </div>
        {!departments.length && (
          <p className="text-amber-300 text-sm mt-4">
            أضف قسماً أولاً من تبويب الأقسام.
          </p>
        )}
      </form>
    </Modal>
  );
}

function DepartmentForm({ departments, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const clean = name.trim();
    if (!clean) return setError("أدخل اسم القسم.");
    if (departments.some((d) => normalize(d.name) === normalize(clean)))
      return setError("القسم مسجل بالفعل.");
    setBusy(true);
    setError("");
    try {
      await addDepartment(clean);
      onSaved();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="إضافة قسم جديد"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit} className="modal-body space-y-5">
        <Field label="اسم القسم">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            placeholder="مثال: الأشعة التشخيصية"
          />
        </Field>
        <ErrorMessage>{error}</ErrorMessage>
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? "جارٍ الحفظ…" : "إضافة القسم"}
          <Plus size={17} />
        </button>
      </form>
    </Modal>
  );
}

function MaintenanceForm({ device, onClose, onSaved }) {
  const [values, setValues] = useState({
    occurredOn: today(),
    type: "corrective",
    description: "",
    spareParts: "",
    technician: "",
    cost: "0",
    resultingStatus: device.status,
    nextPmDate: device.nextPmDate || "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const change = (e) =>
    setValues((old) => ({ ...old, [e.target.name]: e.target.value }));
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (!values.description.trim() || !values.technician.trim())
      return setError("أدخل تفاصيل العمل واسم الفني.");
    const cost = Number(values.cost);
    if (!Number.isFinite(cost) || cost < 0 || cost > 100000000)
      return setError("أدخل تكلفة صحيحة غير سالبة.");
    if (values.occurredOn > today())
      return setError("لا يمكن تسجيل عمل صيانة في تاريخ مستقبلي.");
    setBusy(true);
    setError("");
    try {
      await addMaintenance(device.id, {
        ...values,
        cost,
        description: values.description.trim(),
        technician: values.technician.trim(),
        spareParts: values.spareParts.trim(),
      });
      onSaved();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="تسجيل صيانة"
      subtitle={`${device.name} · ${device.assetId}`}
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
    >
      <form onSubmit={submit} className="modal-body">
        <div className="form-grid">
          <Field label="تاريخ الصيانة *">
            <input
              type="date"
              name="occurredOn"
              value={values.occurredOn}
              max={today()}
              onChange={change}
              required
            />
          </Field>
          <Field label="نوع الصيانة">
            <select name="type" value={values.type} onChange={change}>
              <option value="corrective">صيانة تصحيحية / إصلاح عطل</option>
              <option value="preventive">صيانة وقائية دورية</option>
              <option value="inspection">فحص ومعايرة</option>
            </select>
          </Field>
          <Field label="تفاصيل العطل والإجراء الفني *" className="full-width">
            <textarea
              autoFocus
              name="description"
              value={values.description}
              onChange={change}
              required
              maxLength={4000}
              rows={3}
            />
          </Field>
          <Field label="قطع الغيار المستبدلة" className="full-width">
            <textarea
              name="spareParts"
              value={values.spareParts}
              onChange={change}
              maxLength={2000}
              rows={2}
            />
          </Field>
          <Field label="اسم الفني / المهندس *">
            <input
              name="technician"
              value={values.technician}
              onChange={change}
              maxLength={160}
              required
            />
          </Field>
          <Field label="التكلفة بالجنيه المصري">
            <input
              type="number"
              name="cost"
              min="0"
              max="100000000"
              step="0.01"
              value={values.cost}
              onChange={change}
              required
            />
          </Field>
          <Field label="الحالة بعد الصيانة">
            <select
              name="resultingStatus"
              value={values.resultingStatus}
              onChange={change}
            >
              {Object.entries(STATUS).map(([key, s]) => (
                <option key={key} value={key}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="موعد الصيانة الوقائية القادمة">
            <input
              type="date"
              name="nextPmDate"
              value={values.nextPmDate}
              onChange={change}
            />
          </Field>
        </div>
        <ErrorMessage>{error}</ErrorMessage>
        <div className="form-actions">
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "جارٍ التسجيل…" : "تسجيل الصيانة وتحديث الجهاز"}
            <Check size={17} />
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeviceProfile({
  device,
  department,
  onClose,
  guard,
  onEdit,
  onMaintenance,
  notify,
}) {
  const [tab, setTab] = useState("overview");
  const { logs, loading, error } = useHistory(device.id);
  const [changing, setChanging] = useState(false);
  const qrValue = `${window.location.origin}${window.location.pathname}?asset=${encodeURIComponent(device.assetId)}`;
  async function updateStatus(status) {
    setChanging(true);
    try {
      await setStatus(device.id, status);
      notify("تم تحديث حالة الجهاز");
    } catch (err) {
      notify(friendlyError(err), true);
    } finally {
      setChanging(false);
    }
  }
  const overview = [
    ["رقم الأصل", device.assetId],
    ["الرقم المسلسل", device.serialNumber],
    ["الموديل", device.model],
    ["الشركة المصنعة", device.manufacturer],
    ["القسم", department],
    [
      "الضمان",
      device.warrantyEnd
        ? `${device.warrantyEnd >= today() ? "ساري حتى" : "منتهي منذ"} ${formatDate(device.warrantyEnd)}`
        : "غير مسجل",
    ],
    ["شركة الصيانة", device.vendorName],
    ["هاتف شركة الصيانة", device.vendorPhone],
    ["الصيانة الوقائية القادمة", formatDate(device.nextPmDate)],
  ];
  return (
    <Modal
      title={device.name}
      subtitle={`${department || "غير محدد"} · ${device.assetId}`}
      onClose={onClose}
      wide
    >
      <div className="profile-summary">
        <Badge status={device.status} />
        <span className="text-xs text-slate-500">
          <LockKeyhole size={13} className="inline ms-1" />
          التعديلات محمية برمز
        </span>
      </div>
      <div className="profile-tabs" role="tablist" aria-label="تفاصيل الجهاز">
        {[
          ["overview", "نظرة عامة"],
          ["history", "سجل الصيانة"],
          ["qr", "بطاقة QR"],
        ].map(([key, label]) => (
          <button
            role="tab"
            aria-selected={tab === key}
            aria-controls={`profile-${key}`}
            id={`tab-${key}`}
            key={key}
            className={tab === key ? "selected" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className="modal-body"
        role="tabpanel"
        id={`profile-${tab}`}
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
      >
        {tab === "overview" && (
          <>
            <dl className="overview-grid">
              {overview.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd dir="auto">{value || "—"}</dd>
                </div>
              ))}
            </dl>
            {device.notes && (
              <div className="notes">
                <strong>ملاحظات الجهاز</strong>
                <p>{device.notes}</p>
              </div>
            )}
            <div className="status-controls">
              <h3>
                الحالة التشغيلية <LockKeyhole size={14} />
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS).map(([status, s]) => (
                  <button
                    disabled={changing || device.status === status}
                    className={`status-button ${device.status === status ? "is-current" : ""}`}
                    key={status}
                    onClick={() => guard(() => updateStatus(status))}
                  >
                    {s.label}
                    {device.status === status && <Check size={15} />}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button
                className="btn btn-primary"
                onClick={() => guard(onMaintenance)}
              >
                <Wrench size={17} />
                تسجيل صيانة
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => guard(onEdit)}
              >
                <Pencil size={16} />
                تعديل البيانات
              </button>
            </div>
          </>
        )}
        {tab === "history" && (
          <>
            <div className="flex items-center justify-between gap-3 mb-5">
              <span className="text-sm text-slate-400">
                سجل التدخلات الفنية والتكاليف
              </span>
              <button
                className="btn btn-primary"
                onClick={() => guard(onMaintenance)}
              >
                <Plus size={16} />
                تسجيل صيانة
              </button>
            </div>
            <ErrorMessage>{error}</ErrorMessage>
            {loading ? (
              <p role="status">جارٍ تحميل السجل…</p>
            ) : logs.length ? (
              <ol className="timeline">
                {logs.map((log) => (
                  <li key={log.id}>
                    <span className="timeline-dot">
                      <Wrench size={14} />
                    </span>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3>
                        {
                          {
                            corrective: "صيانة تصحيحية",
                            preventive: "صيانة وقائية",
                            inspection: "فحص ومعايرة",
                          }[log.type]
                        }
                      </h3>
                      <time className="text-xs text-slate-500">
                        {formatDate(log.occurredOn)}
                      </time>
                    </div>
                    <p className="whitespace-pre-wrap mt-2 text-sm text-slate-300">
                      {log.description}
                    </p>
                    {log.spareParts && (
                      <p className="text-sm text-slate-400 mt-2">
                        قطع الغيار: {log.spareParts}
                      </p>
                    )}
                    <div className="log-meta">
                      <span>الفني: {log.technician}</span>
                      <strong>{formatMoney(log.cost)}</strong>
                      <Badge status={log.resultingStatus} />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              !error && (
                <Empty
                  title="لا توجد أعمال صيانة مسجلة"
                  text="سجل أول تدخل فني لبدء الخط الزمني للجهاز."
                  icon={Wrench}
                />
              )
            )}
          </>
        )}
        {tab === "qr" && (
          <div className="qr-section">
            <div id="print-badge" className="print-badge">
              <div className="badge-brand">
                <HeartPulse size={23} />
                <strong>{HOSPITAL}</strong>
              </div>
              <span>قسم الهندسة الطبية</span>
              <QRCodeSVG
                value={qrValue}
                size={176}
                level="M"
                marginSize={4}
                title={`رمز الجهاز ${device.assetId}`}
              />
              <strong className="badge-asset" dir="ltr">
                {device.assetId}
              </strong>
              <b>{device.name}</b>
              <small>{department}</small>
            </div>
            <p className="text-sm text-slate-400">
              امسح الكود لفتح كارت الجهاز مباشرة من أي هاتف.
            </p>
            <button className="btn btn-primary" onClick={() => window.print()}>
              <Printer size={17} />
              طباعة ملصق الجهاز
            </button>
            <p className="text-xs text-slate-500">
              مقاس الملصق المقترح ٧٠ × ٩٠ مم. استخدم رابط الاستضافة الفعلي قبل
              الطباعة.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Scanner({ devices, onOpen }) {
  const [input, setInput] = useState("");
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const scanner = useRef(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const openRef = useRef(onOpen);
  openRef.current = onOpen;
  const devicesRef = useRef(devices);
  devicesRef.current = devices;
  const stop = useCallback(async () => {
    generation.current += 1;
    const instance = scanner.current;
    scanner.current = null;
    if (instance) {
      try {
        if (instance.isScanning) await instance.stop();
        instance.clear();
      } catch {
        /* camera already stopped */
      }
    }
    if (mounted.current) {
      setActive(false);
      setStarting(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      void stop();
    };
  }, [stop]);
  async function lookup(raw) {
    setError("");
    try {
      const id = qrAssetId(raw);
      const device = devicesRef.current.find(
        (d) => normalize(d.assetId) === normalize(id),
      );
      if (!device)
        return setError("لم يتم العثور على جهاز بهذا الرقم في السجل الحالي.");
      await stop();
      openRef.current(device.id);
    } catch (err) {
      setError(friendlyError(err));
    }
  }
  async function start() {
    if (starting || active) return;
    if (!window.isSecureContext)
      return setError("تشغيل الكاميرا يتطلب اتصال HTTPS أو localhost.");
    setError("");
    setStarting(true);
    const ticket = ++generation.current;
    try {
      const instance = new Html5Qrcode("qr-reader");
      scanner.current = instance;
      await instance.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 220, height: 220 }, aspectRatio: 1 },
        (text) => {
          if (ticket === generation.current) void lookup(text);
        },
        () => {},
      );
      if (!mounted.current || ticket !== generation.current) {
        if (instance.isScanning) await instance.stop();
        instance.clear();
        return;
      }
      setActive(true);
    } catch {
      if (mounted.current) {
        setError(
          "تعذر تشغيل الكاميرا. اسمح بالوصول إليها أو استخدم الإدخال اليدوي.",
        );
        setActive(false);
      }
      scanner.current = null;
    } finally {
      if (mounted.current) setStarting(false);
    }
  }
  return (
    <div className="scanner-layout">
      <section className="panel scanner-panel">
        <div className="section-heading">
          <div>
            <h3>الفحص الميداني السريع</h3>
            <p>وجّه الكاميرا إلى رمز QR الموجود على الجهاز</p>
          </div>
          <ScanLine size={22} className="text-teal-300" />
        </div>
        <div className={`scanner-window ${active ? "camera-on" : ""}`}>
          <div id="qr-reader" />
          {!active && !starting && (
            <div className="scanner-placeholder">
              <div className="scan-frame">
                <QrCode size={95} strokeWidth={1.1} />
              </div>
              <span>جاهز لمسح بطاقة الجهاز</span>
            </div>
          )}
          {starting && (
            <span className="scanner-starting" role="status">
              جارٍ تشغيل الكاميرا…
            </span>
          )}
        </div>
        <ErrorMessage>{error}</ErrorMessage>
        <button
          className="btn btn-primary w-full mt-5"
          onClick={active ? stop : start}
          disabled={starting}
        >
          <ScanLine size={18} />
          {active
            ? "إيقاف الكاميرا"
            : starting
              ? "جارٍ الاتصال…"
              : "تشغيل الكاميرا"}
        </button>
      </section>
      <section className="panel h-fit">
        <div className="section-heading">
          <div>
            <h3>بحث يدوي / محاكاة المسح</h3>
            <p>أدخل رقم الأصل أو الصق محتوى رمز QR</p>
          </div>
          <Search size={19} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void lookup(input);
          }}
          className="space-y-4"
        >
          <Field label="رقم الأصل أو رابط الجهاز">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              dir="ltr"
              placeholder="BME-0001"
              required
            />
          </Field>
          <button className="btn btn-secondary w-full">
            فتح كارت الجهاز
            <ArrowLeft size={16} />
          </button>
        </form>
        <div className="panel-note mt-6">
          <ShieldCheck size={21} />
          <p>
            عرض الكارت لا يحتاج إلى رمز حماية. أي تعديل في الحالة أو سجل الصيانة
            يتطلب التحقق أولاً.
          </p>
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const { devices, departments, loading, error } = useRegistry();
  const [tab, setTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [editor, setEditor] = useState(null);
  const [pending, setPending] = useState(null);
  const [toast, setToast] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);
  const deepLinkRead = useRef(false);
  const selected = devices.find((d) => d.id === selectedId);
  const filtered = useMemo(
    () => filterDevices(devices, search, departmentFilter, statusFilter),
    [devices, search, departmentFilter, statusFilter],
  );
  const departmentName = (id) =>
    departments.find((d) => d.id === id)?.name || "غير محدد";
  const notify = (message, failure = false) => setToast({ message, failure });
  // Every protected click prompts again; no permanent browser-side unlock.
  const guard = (action) => {
    if (!online && !isDemo)
      return notify(
        "يلزم الاتصال بالشبكة للتحقق من الرمز وحفظ التعديلات.",
        true,
      );
    setPending(() => action);
  };
  useEffect(() => {
    const handleOnline = () => setOnline(true),
      handleOffline = () => setOnline(false);
    const install = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", install);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", install);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 5500);
    return () => clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    if (loading || deepLinkRead.current) return;
    deepLinkRead.current = true;
    const asset = new URLSearchParams(window.location.search).get("asset");
    if (asset) {
      const match = devices.find(
        (d) => normalize(d.assetId) === normalize(asset),
      );
      setTab("assets");
      if (match) setSelectedId(match.id);
      else
        setToast({
          message: "الجهاز الموجود في الرابط غير مسجل.",
          failure: true,
        });
    }
  }, [loading, devices]);
  const title = NAV.find((n) => n.id === tab).label;
  const saved = (message) => {
    setEditor(null);
    notify(message);
  };
  function changeTab(id) {
    setTab(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function openDepartment(id) {
    setDepartmentFilter(id);
    setSearch("");
    setStatusFilter("");
    changeTab("assets");
  }
  return (
    <div dir="rtl" className="app-shell">
      <div
        aria-hidden={Boolean(selected || editor || pending)}
        inert={selected || editor || pending ? true : undefined}
      >
        <aside className="sidebar">
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              changeTab("dashboard");
            }}
          >
            <span className="brand-icon">
              <HeartPulse size={27} />
            </span>
            <span>
              <strong>الهندسة الطبية</strong>
              <small>{HOSPITAL}</small>
            </span>
          </a>
          <div className="sidebar-label">مساحة العمل</div>
          <nav aria-label="القائمة الرئيسية">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                className={`nav-item ${tab === id ? "is-active" : ""}`}
                aria-label={label}
                aria-current={tab === id ? "page" : undefined}
                key={id}
                onClick={() => changeTab(id)}
              >
                <Icon size={21} />
                <span>{label}</span>
                {id === "assets" && (
                  <small>{devices.length.toLocaleString("ar-EG")}</small>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="guest-card">
              <span>
                <ShieldCheck size={20} />
              </span>
              <div>
                <strong>وضع الزائر</strong>
                <small>المشاهدة متاحة · التعديل محمي</small>
              </div>
            </div>
            <p>
              نظام إدارة الأصول والصيانة
              <br />
              قسم الهندسة الطبية
            </p>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="mobile-brand">
              <HeartPulse className="text-teal-300" size={25} />
              <span>الهندسة الطبية</span>
            </div>
            <div className="desktop-breadcrumb">
              مساحة العمل <ChevronLeft size={15} />
              <span>{title}</span>
            </div>
            <div className="topbar-status">
              <span className={`connection ${online ? "" : "offline"}`}>
                {online ? <Wifi size={14} /> : <WifiOff size={14} />}
                {isDemo
                  ? "وضع تجريبي محلي"
                  : online
                    ? "مزامنة مباشرة"
                    : "غير متصل"}
              </span>
              {installPrompt && (
                <button
                  className="icon-button"
                  title="تثبيت التطبيق"
                  aria-label="تثبيت التطبيق"
                  onClick={async () => {
                    await installPrompt.prompt();
                    setInstallPrompt(null);
                  }}
                >
                  <Download size={18} />
                </button>
              )}
              <span className="avatar">ط</span>
            </div>
          </header>
          <main className="main-content">
            <div className="page-heading">
              <div>
                <div className="eyebrow">{HOSPITAL}</div>
                <h1>{tab === "dashboard" ? "لوحة المتابعة" : title}</h1>
                <p>
                  {
                    {
                      dashboard: "نظرة شاملة على جاهزية الأصول الطبية",
                      assets: "سجل موحّد لجميع الأجهزة والمعدات الطبية",
                      departments: "تنظيم الأصول الطبية حسب الأقسام",
                      scanner: "الوصول الفوري إلى بيانات الجهاز في الميدان",
                    }[tab]
                  }
                </p>
              </div>
              {tab === "assets" && (
                <button
                  className="btn btn-primary"
                  onClick={() => guard(() => setEditor({ type: "device" }))}
                >
                  <Plus size={18} />
                  إضافة جهاز جديد
                </button>
              )}
              {tab === "departments" && (
                <button
                  className="btn btn-primary"
                  onClick={() => guard(() => setEditor({ type: "department" }))}
                >
                  <Plus size={18} />
                  إضافة قسم جديد
                </button>
              )}
              {tab === "dashboard" && (
                <div className="date-chip">
                  <CalendarClock size={16} />
                  {formatDate(today())}
                </div>
              )}
            </div>
            {isDemo && (
              <div className="demo-banner">
                <CircleAlert size={16} />
                <span>
                  نسخة تجريبية ببيانات توضيحية. تُحفظ التغييرات في هذا المتصفح
                  فقط؛ فعّل Firebase للمزامنة بين الأجهزة.
                </span>
              </div>
            )}
            {!online && (
              <div className="demo-banner">
                <WifiOff size={16} />
                أنت غير متصل. البيانات المعروضة قد لا تكون محدثة.
              </div>
            )}
            <ErrorMessage>{error}</ErrorMessage>
            {loading ? (
              <div className="loading" role="status">
                <Activity size={30} className="animate-pulse" />
                جارٍ تحميل سجل الأجهزة…
              </div>
            ) : (
              <>
                {tab === "dashboard" && (
                  <Dashboard
                    devices={devices}
                    departments={departments}
                    onOpen={setSelectedId}
                    onAssets={() => changeTab("assets")}
                  />
                )}
                {tab === "assets" && (
                  <>
                    <section className="filters">
                      <div className="search-field">
                        <Search size={19} />
                        <input
                          aria-label="البحث في الأجهزة"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="ابحث بالاسم، الرقم المسلسل أو رقم الأصل…"
                        />
                        {search && (
                          <button
                            className="icon-button"
                            aria-label="مسح البحث"
                            onClick={() => setSearch("")}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      <select
                        aria-label="تصفية حسب القسم"
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                      >
                        <option value="">جميع الأقسام</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label="تصفية حسب الحالة"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="">جميع الحالات</option>
                        {Object.entries(STATUS).map(([key, s]) => (
                          <option key={key} value={key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </section>
                    <div className="results-header">
                      <span>
                        {filtered.length.toLocaleString("ar-EG")} جهاز في السجل
                      </span>
                      <span>بيانات الأصل والحالة التشغيلية</span>
                    </div>
                    {filtered.length ? (
                      <div className="asset-grid">
                        {filtered.map((d) => (
                          <AssetCard
                            key={d.id}
                            device={d}
                            department={departmentName(d.departmentId)}
                            onOpen={setSelectedId}
                          />
                        ))}
                      </div>
                    ) : (
                      <Empty
                        title="لم يتم العثور على أجهزة"
                        text="غيّر معايير البحث أو أضف جهازاً جديداً إلى السجل."
                      />
                    )}
                  </>
                )}
                {tab === "departments" &&
                  (departments.length ? (
                    <div className="department-grid">
                      {departments.map((dep) => {
                        const group = devices.filter(
                          (d) => d.departmentId === dep.id,
                        );
                        const count = group.filter(
                          (d) => d.status === "active",
                        ).length;
                        return (
                          <button
                            key={dep.id}
                            className="department-card"
                            onClick={() => openDepartment(dep.id)}
                          >
                            <div className="flex justify-between items-center">
                              <span className="equipment-icon">
                                <Building2 size={24} />
                              </span>
                              <span className="count-pill">
                                {group.length.toLocaleString("ar-EG")} جهاز
                              </span>
                            </div>
                            <h3>{dep.name}</h3>
                            <div className="progress-track">
                              <div
                                className="segment-active"
                                style={{
                                  width: `${group.length ? (count / group.length) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            <p>
                              {count.toLocaleString("ar-EG")} في الخدمة ·{" "}
                              {group
                                .filter((d) => d.status === "down")
                                .length.toLocaleString("ar-EG")}{" "}
                              خارج الخدمة ·{" "}
                              {group
                                .filter((d) => d.status === "maintenance")
                                .length.toLocaleString("ar-EG")}{" "}
                              تحت الصيانة
                            </p>
                            <span className="text-action">
                              عرض أجهزة القسم
                              <ChevronLeft size={17} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <Empty
                      title="لا توجد أقسام مسجلة"
                      text="ابدأ بإضافة أقسام المستشفى ثم سجل أجهزتها."
                      icon={Building2}
                    />
                  ))}
                {tab === "scanner" && (
                  <Scanner devices={devices} onOpen={setSelectedId} />
                )}
              </>
            )}
            <footer className="page-footer">
              <span>الهندسة الطبية · {HOSPITAL}</span>
              <span>صيانة موثوقة، رعاية مستمرة.</span>
            </footer>
          </main>
        </div>
        <nav className="bottom-nav" aria-label="التنقل السفلي">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? "is-active" : ""}
              onClick={() => changeTab(id)}
              aria-current={tab === id ? "page" : undefined}
            >
              <Icon size={21} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
      {selected && !editor && !pending && (
        <DeviceProfile
          device={selected}
          department={departmentName(selected.departmentId)}
          onClose={() => setSelectedId(null)}
          guard={guard}
          onEdit={() => setEditor({ type: "device", device: selected })}
          onMaintenance={() =>
            setEditor({ type: "maintenance", device: selected })
          }
          notify={notify}
        />
      )}
      {editor?.type === "device" && (
        <DeviceForm
          device={editor.device}
          devices={devices}
          departments={departments}
          onClose={() => setEditor(null)}
          onSaved={() => saved("تم حفظ بيانات الجهاز بنجاح")}
        />
      )}
      {editor?.type === "department" && (
        <DepartmentForm
          departments={departments}
          onClose={() => setEditor(null)}
          onSaved={() => saved("تمت إضافة القسم بنجاح")}
        />
      )}
      {editor?.type === "maintenance" && (
        <MaintenanceForm
          device={editor.device}
          onClose={() => setEditor(null)}
          onSaved={() => saved("تم تسجيل الصيانة وتحديث الحالة بنجاح")}
        />
      )}
      {pending && (
        <PinModal
          onClose={() => setPending(null)}
          onVerified={() => {
            const action = pending;
            setPending(null);
            action();
          }}
        />
      )}
      {toast && (
        <div
          className={`toast ${toast.failure ? "toast-error" : ""}`}
          role={toast.failure ? "alert" : "status"}
        >
          {toast.failure ? <CircleAlert size={19} /> : <Check size={19} />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} aria-label="إغلاق التنبيه">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
