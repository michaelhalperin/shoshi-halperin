import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type Course } from "../../api";
import {
  Badge,
  Button,
  CourseImage,
  ErrorNote,
  ImageUpload,
  Input,
  ConfirmModal,
  Modal,
  Spinner,
  Textarea,
} from "../../components/ui";
import { useI18n } from "../../i18n";

const emptyForm = {
  titleEn: "",
  titleHe: "",
  descriptionEn: "",
  descriptionHe: "",
  price: 0,
  customPrice: false,
  durationMin: 60,
  maxParticipants: 8,
  imageUrl: "",
  color: "amber",
  active: true,
};

type CourseForm = typeof emptyForm;

export default function AdminCourses() {
  const { t, pick } = useI18n();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [editing, setEditing] = useState<Course | "new" | null>(null);
  const [form, setForm] = useState<CourseForm>(emptyForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<Course | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = () => {
    api.get<{ courses: Course[] }>("/api/courses?all=1").then((d) => setCourses(d.courses));
  };
  useEffect(load, []);

  const openNew = () => {
    setForm(emptyForm);
    setError("");
    setEditing("new");
  };

  const openEdit = (course: Course) => {
    setForm({
      titleEn: course.titleEn,
      titleHe: course.titleHe,
      descriptionEn: course.descriptionEn,
      descriptionHe: course.descriptionHe,
      price: course.price,
      customPrice: course.customPrice,
      durationMin: course.durationMin,
      maxParticipants: course.maxParticipants,
      imageUrl: course.imageUrl ?? "",
      color: course.color,
      active: course.active,
    });
    setError("");
    setEditing(course);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const payload = { ...form, imageUrl: form.imageUrl.trim() || null };
    try {
      if (editing === "new") {
        await api.post("/api/courses", payload);
      } else if (editing) {
        await api.put(`/api/courses/${editing.id}`, payload);
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
      await api.delete(`/api/courses/${deleting.id}`);
      setDeleting(null);
      load();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : t("errorGeneric"));
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!courses) return <Spinner />;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-clay-600">
          {t("manageCourses")}
        </h2>
        <Button onClick={openNew}>+ {t("newCourse")}</Button>
      </div>

      <div className="divide-y divide-stone-200 border-y border-stone-200 bg-white">
        {courses.map((course) => (
          <div key={course.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-4">
              <CourseImage
                imageUrl={course.imageUrl}
                color={course.color}
                alt={pick(course, "title")}
                className="h-14 w-20 shrink-0"
              />
              <div>
                <div className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                  {pick(course, "title")}
                  {course.active ? (
                    <Badge tone="green">{t("active")}</Badge>
                  ) : (
                    <Badge tone="stone">{t("inactive")}</Badge>
                  )}
                </div>
                <div className="text-sm font-light text-stone-500">
                  {course.customPrice ? t("contactForPrice") : `₪${course.price}`} ·{" "}
                  {course.durationMin} {t("minutes")} · {t("upToPeople")} {course.maxParticipants}{" "}
                  {t("people")}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => openEdit(course)}>
                {t("edit")}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setDeleteError("");
                  setDeleting(course);
                }}
              >
                {t("delete")}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {deleting && (
        <ConfirmModal
          title={t("delete")}
          message={t("confirmDelete")}
          onClose={() => setDeleting(null)}
          onConfirm={confirmRemove}
          busy={deleteBusy}
          error={deleteError}
        />
      )}

      {editing && (
        <Modal title={editing === "new" ? t("newCourse") : t("edit")} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label={t("titleEn")}
                required
                value={form.titleEn}
                onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
              />
              <Input
                label={t("titleHe")}
                required
                dir="rtl"
                value={form.titleHe}
                onChange={(e) => setForm({ ...form, titleHe: e.target.value })}
              />
            </div>
            <Textarea
              label={t("descriptionEn")}
              required
              value={form.descriptionEn}
              onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
            />
            <Textarea
              label={t("descriptionHe")}
              required
              dir="rtl"
              value={form.descriptionHe}
              onChange={(e) => setForm({ ...form, descriptionHe: e.target.value })}
            />
            <ImageUpload
              label={t("image")}
              folder="courses"
              value={form.imageUrl}
              onChange={(imageUrl) => setForm({ ...form, imageUrl })}
              color={form.color}
            />
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              <div className="space-y-2">
                <Input
                  label={`${t("price")} (₪)`}
                  type="number"
                  min={0}
                  step="0.01"
                  required={!form.customPrice}
                  disabled={form.customPrice}
                  value={form.customPrice ? "" : form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                />
                <label className="flex items-center gap-2 text-sm font-medium text-stone-600">
                  <input
                    type="checkbox"
                    checked={form.customPrice}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        customPrice: e.target.checked,
                        price: e.target.checked ? 0 : form.price,
                      })
                    }
                    className="h-4 w-4 accent-clay-600"
                  />
                  {t("customPrice")}
                </label>
              </div>
              <Input
                label={`${t("duration")} (${t("minutes")})`}
                type="number"
                min={5}
                required
                value={form.durationMin}
                onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}
              />
              <Input
                label={t("maxParticipants")}
                type="number"
                min={1}
                required
                value={form.maxParticipants}
                onChange={(e) => setForm({ ...form, maxParticipants: Number(e.target.value) })}
              />
            </div>
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
