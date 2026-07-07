import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type Coupon, type Course } from "../../api";
import { DateTimePicker, toLocalInputValue } from "../../components/DateTimePicker";
import {
  Badge,
  Button,
  ConfirmModal,
  ErrorNote,
  Input,
  Modal,
  Select,
  Spinner,
} from "../../components/ui";
import { useI18n } from "../../i18n";

const emptyForm = {
  code: "",
  discountType: "percent" as "percent" | "fixed",
  discountValue: "10",
  maxUses: "" as string | number,
  expiresAt: "",
  active: true,
  courseId: "",
};

type CouponForm = typeof emptyForm;

function couponStatus(coupon: Coupon, t: (key: import("../../i18n").TKey) => string) {
  if (!coupon.active) return { label: t("couponInactive"), tone: "stone" as const };
  if (coupon.expiresAt && new Date(coupon.expiresAt) <= new Date()) {
    return { label: t("couponExpired"), tone: "red" as const };
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { label: t("couponExhausted"), tone: "red" as const };
  }
  return { label: t("couponActive"), tone: "green" as const };
}

export default function AdminCoupons() {
  const { t, pick } = useI18n();
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<Coupon | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = () => {
    api.get<{ coupons: Coupon[] }>("/api/coupons").then((d) => setCoupons(d.coupons));
  };

  useEffect(() => {
    load();
    api.get<{ courses: Course[] }>("/api/courses?all=1").then((d) => setCourses(d.courses));
  }, []);

  const openNew = () => {
    setForm(emptyForm);
    setError("");
    setEditing("new");
  };

  const openEdit = (coupon: Coupon) => {
    setForm({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      maxUses: coupon.maxUses ?? "",
      expiresAt: coupon.expiresAt ? toLocalInputValue(coupon.expiresAt) : "",
      active: coupon.active,
      courseId: coupon.courseId ?? "",
    });
    setError("");
    setEditing(coupon);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const discountValue = Number(form.discountValue);
    if (!Number.isFinite(discountValue) || discountValue < 1) {
      setError(t("discountValueInvalid"));
      return;
    }
    if (form.discountType === "percent" && discountValue > 100) {
      setError(t("discountPercentMax"));
      return;
    }

    setBusy(true);

    const payload = {
      code: form.code,
      discountType: form.discountType,
      discountValue,
      maxUses: form.maxUses === "" ? null : Number(form.maxUses),
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      active: form.active,
      courseId: form.courseId || null,
    };

    try {
      if (editing === "new") {
        await api.post("/api/coupons", payload);
      } else if (editing) {
        await api.put(`/api/coupons/${editing.id}`, payload);
      }
      setEditing(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await api.delete(`/api/coupons/${deleting.id}`);
      setDeleting(null);
      load();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : t("errorGeneric"));
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!coupons) return <Spinner />;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-clay-600">
          {t("manageCoupons")}
        </h2>
        <Button onClick={openNew}>+ {t("newCoupon")}</Button>
      </div>

      <div className="divide-y divide-stone-200 border-y border-stone-200 bg-white">
        {coupons.map((coupon) => {
          const status = couponStatus(coupon, t);
          const discountLabel =
            coupon.discountType === "percent"
              ? `${coupon.discountValue}%`
              : `₪${coupon.discountValue}`;
          return (
            <div
              key={coupon.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div>
                <div className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                  <span className="font-mono tracking-wide">{coupon.code}</span>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
                <div className="text-sm font-light text-stone-500">
                  {discountLabel} ·{" "}
                  {coupon.course ? pick(coupon.course, "title") : t("allCoursesCoupon")} ·{" "}
                  {t("couponUses")}: {coupon.usedCount}
                  {coupon.maxUses !== null ? ` / ${coupon.maxUses}` : ` (${t("maxUsesUnlimited")})`}
                  {coupon.expiresAt && (
                    <>
                      {" "}
                      · {t("expiresAt")}:{" "}
                      {new Date(coupon.expiresAt).toLocaleDateString()}
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => openEdit(coupon)}>
                  {t("edit")}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setDeleteError("");
                    setDeleting(coupon);
                  }}
                >
                  {t("delete")}
                </Button>
              </div>
            </div>
          );
        })}
        {coupons.length === 0 && (
          <p className="px-5 py-8 text-center text-stone-500">—</p>
        )}
      </div>

      {deleting && (
        <ConfirmModal
          title={t("delete")}
          message={t("confirmDeleteCoupon")}
          onClose={() => setDeleting(null)}
          onConfirm={confirmRemove}
          busy={deleteBusy}
          error={deleteError}
        />
      )}

      {editing && (
        <Modal
          title={editing === "new" ? t("newCoupon") : t("edit")}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={save} className="space-y-5">
            <Input
              label={t("couponCodeLabel")}
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="font-mono uppercase"
            />
            <Select
              label={t("discountType")}
              value={form.discountType}
              onChange={(e) =>
                setForm({ ...form, discountType: e.target.value as "percent" | "fixed" })
              }
            >
              <option value="percent">{t("discountPercent")}</option>
              <option value="fixed">{t("discountFixed")}</option>
            </Select>
            <Input
              label={t("discountValue")}
              type="number"
              min={1}
              max={form.discountType === "percent" ? 100 : undefined}
              step={form.discountType === "percent" ? 1 : 1}
              required
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
            />
            <Input
              label={t("maxUses")}
              type="number"
              min={1}
              placeholder={t("maxUsesUnlimited")}
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
            />
            <div>
              <DateTimePicker
                label={t("expiresAtOptional")}
                value={form.expiresAt}
                onChange={(expiresAt) => setForm({ ...form, expiresAt })}
              />
              {form.expiresAt && (
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setForm({ ...form, expiresAt: "" })}
                  >
                    {t("clearExpiry")}
                  </Button>
                </div>
              )}
            </div>
            <Select
              label={t("courseSpecificCoupon")}
              value={form.courseId}
              onChange={(e) => setForm({ ...form, courseId: e.target.value })}
            >
              <option value="">{t("allCoursesCoupon")}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {pick(course, "title")}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 text-sm font-medium text-stone-600">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4 accent-clay-600"
              />
              {t("active")}
            </label>
            {error && <ErrorNote message={error} />}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={busy}>
                {t("save")}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
