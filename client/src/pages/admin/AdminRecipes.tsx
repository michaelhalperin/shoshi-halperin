import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type Course, type Recipe } from "../../api";
import {
  Badge,
  Button,
  CourseImage,
  ErrorNote,
  Input,
  ConfirmModal,
  Modal,
  Select,
  Spinner,
  ListEditor,
  Textarea,
} from "../../components/ui";
import { useI18n } from "../../i18n";

const emptyForm = {
  titleEn: "",
  titleHe: "",
  descriptionEn: "",
  descriptionHe: "",
  ingredientsEn: "",
  ingredientsHe: "",
  stepsEn: "",
  stepsHe: "",
  imageUrl: "",
  color: "amber",
  active: true,
  courseId: "",
};

type RecipeForm = typeof emptyForm;

function normalizeList(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

export default function AdminRecipes() {
  const { t, pick } = useI18n();
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [editing, setEditing] = useState<Recipe | "new" | null>(null);
  const [form, setForm] = useState<RecipeForm>(emptyForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<Recipe | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = () => {
    api.get<{ recipes: Recipe[] }>("/api/recipes?all=1").then((d) => setRecipes(d.recipes));
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

  const openEdit = (recipe: Recipe) => {
    setForm({
      titleEn: recipe.titleEn,
      titleHe: recipe.titleHe,
      descriptionEn: recipe.descriptionEn,
      descriptionHe: recipe.descriptionHe,
      ingredientsEn: recipe.ingredientsEn,
      ingredientsHe: recipe.ingredientsHe,
      stepsEn: recipe.stepsEn,
      stepsHe: recipe.stepsHe,
      imageUrl: recipe.imageUrl ?? "",
      color: recipe.color,
      active: recipe.active,
      courseId: recipe.courseId ?? "",
    });
    setError("");
    setEditing(recipe);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const payload = {
      ...form,
      ingredientsEn: normalizeList(form.ingredientsEn),
      ingredientsHe: normalizeList(form.ingredientsHe),
      stepsEn: normalizeList(form.stepsEn),
      stepsHe: normalizeList(form.stepsHe),
      imageUrl: form.imageUrl.trim() || null,
      courseId: form.courseId || null,
    };
    try {
      if (editing === "new") {
        await api.post("/api/recipes", payload);
      } else if (editing) {
        await api.put(`/api/recipes/${editing.id}`, payload);
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
      await api.delete(`/api/recipes/${deleting.id}`);
      setDeleting(null);
      load();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : t("errorGeneric"));
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!recipes) return <Spinner />;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-clay-600">
          {t("manageRecipes")}
        </h2>
        <Button onClick={openNew}>+ {t("newRecipe")}</Button>
      </div>

      <div className="divide-y divide-stone-200 border-y border-stone-200 bg-white">
        {recipes.map((recipe) => (
          <div key={recipe.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-4">
              <CourseImage
                imageUrl={recipe.imageUrl}
                color={recipe.color}
                alt={pick(recipe, "title")}
                className="h-14 w-20 shrink-0"
              />
              <div>
                <div className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                  {pick(recipe, "title")}
                  {recipe.active ? (
                    <Badge tone="green">{t("active")}</Badge>
                  ) : (
                    <Badge tone="stone">{t("inactive")}</Badge>
                  )}
                </div>
                {recipe.course && (
                  <div className="text-sm font-light text-stone-500">
                    {t("linkedCourse")}: {pick(recipe.course, "title")}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => openEdit(recipe)}>
                {t("edit")}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setDeleteError("");
                  setDeleting(recipe);
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
        <Modal title={editing === "new" ? t("newRecipe") : t("edit")} onClose={() => setEditing(null)}>
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
            <ListEditor
              label={t("ingredientsEn")}
              variant="bullet"
              placeholder={t("ingredientPlaceholder")}
              addLabel={t("addIngredient")}
              removeLabel={t("removeItem")}
              value={form.ingredientsEn}
              onChange={(ingredientsEn) => setForm({ ...form, ingredientsEn })}
            />
            <ListEditor
              label={t("ingredientsHe")}
              variant="bullet"
              dir="rtl"
              placeholder={t("ingredientPlaceholder")}
              addLabel={t("addIngredient")}
              removeLabel={t("removeItem")}
              value={form.ingredientsHe}
              onChange={(ingredientsHe) => setForm({ ...form, ingredientsHe })}
            />
            <ListEditor
              label={t("stepsEn")}
              variant="numbered"
              placeholder={t("stepPlaceholder")}
              addLabel={t("addStep")}
              removeLabel={t("removeItem")}
              value={form.stepsEn}
              onChange={(stepsEn) => setForm({ ...form, stepsEn })}
            />
            <ListEditor
              label={t("stepsHe")}
              variant="numbered"
              dir="rtl"
              placeholder={t("stepPlaceholder")}
              addLabel={t("addStep")}
              removeLabel={t("removeItem")}
              value={form.stepsHe}
              onChange={(stepsHe) => setForm({ ...form, stepsHe })}
            />
            <Input
              label={t("imageUrl")}
              type="url"
              placeholder="https://…"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            />
            <Select
              label={t("linkedCourseOptional")}
              value={form.courseId}
              onChange={(e) => setForm({ ...form, courseId: e.target.value })}
            >
              <option value="">{t("noLinkedCourse")}</option>
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
