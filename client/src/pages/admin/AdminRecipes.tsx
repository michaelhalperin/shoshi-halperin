import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type Course, type Recipe } from "../../api";
import {
  Badge,
  Button,
  CourseImage,
  ErrorNote,
  ImageUpload,
  Input,
  ConfirmModal,
  Modal,
  Select,
  Spinner,
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

function formToRawContent(form: RecipeForm): string {
  const sections: string[] = [];
  if (form.ingredientsEn.trim()) {
    sections.push("Ingredients (English):");
    sections.push(form.ingredientsEn);
  }
  if (form.ingredientsHe.trim()) {
    sections.push("\nIngredients (Hebrew):");
    sections.push(form.ingredientsHe);
  }
  if (form.stepsEn.trim()) {
    sections.push("\nSteps (English):");
    sections.push(form.stepsEn);
  }
  if (form.stepsHe.trim()) {
    sections.push("\nSteps (Hebrew):");
    sections.push(form.stepsHe);
  }
  return sections.join("\n").trim();
}

function hasParsedContent(form: RecipeForm): boolean {
  return Boolean(
    form.ingredientsEn.trim() &&
      form.ingredientsHe.trim() &&
      form.stepsEn.trim() &&
      form.stepsHe.trim()
  );
}

function formatPreviewLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function RecipeParsePreview({ form }: { form: RecipeForm }) {
  const { t } = useI18n();
  const sections = [
    { label: t("ingredientsEn"), lines: formatPreviewLines(form.ingredientsEn), dir: undefined },
    { label: t("ingredientsHe"), lines: formatPreviewLines(form.ingredientsHe), dir: "rtl" as const },
    { label: t("stepsEn"), lines: formatPreviewLines(form.stepsEn), dir: undefined, numbered: true },
    { label: t("stepsHe"), lines: formatPreviewLines(form.stepsHe), dir: "rtl" as const, numbered: true },
  ];

  return (
    <div className="space-y-4 rounded-xl border border-clay-200 bg-clay-50/60 p-4">
      <p className="text-sm font-medium text-clay-700">{t("recipeParsed")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map(({ label, lines, dir, numbered }) => (
          <div key={label}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">{label}</p>
            {numbered ? (
              <ol className="list-decimal space-y-1 ps-5 text-sm text-stone-700" dir={dir}>
                {lines.map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ol>
            ) : (
              <ul className="space-y-1 text-sm text-stone-700" dir={dir}>
                {lines.map((line, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay-500" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminRecipes() {
  const { t, pick } = useI18n();
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [editing, setEditing] = useState<Recipe | "new" | null>(null);
  const [form, setForm] = useState<RecipeForm>(emptyForm);
  const [rawContent, setRawContent] = useState("");
  const [parsedFromRaw, setParsedFromRaw] = useState("");
  const [error, setError] = useState("");
  const [parseError, setParseError] = useState("");
  const [busy, setBusy] = useState(false);
  const [parseBusy, setParseBusy] = useState(false);
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
    setRawContent("");
    setParsedFromRaw("");
    setError("");
    setParseError("");
    setEditing("new");
  };

  const openEdit = (recipe: Recipe) => {
    const nextForm = {
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
    };
    setForm(nextForm);
    setRawContent(formToRawContent(nextForm));
    setParsedFromRaw(formToRawContent(nextForm));
    setError("");
    setParseError("");
    setEditing(recipe);
  };

  const parseContent = async (): Promise<
    Pick<RecipeForm, "ingredientsEn" | "ingredientsHe" | "stepsEn" | "stepsHe"> | null
  > => {
    const content = rawContent.trim();
    if (!content) {
      setParseError(t("recipeParseRequired"));
      return null;
    }

    setParseError("");
    setParseBusy(true);
    try {
      const result = await api.post<{
        recipe: Pick<RecipeForm, "ingredientsEn" | "ingredientsHe" | "stepsEn" | "stepsHe">;
      }>("/api/admin/recipes/parse", { content });
      setForm((current) => ({ ...current, ...result.recipe }));
      setParsedFromRaw(content);
      return result.recipe;
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setParseError(t("aiNotConfigured"));
      } else {
        setParseError(err instanceof ApiError ? err.message : t("errorGeneric"));
      }
      return null;
    } finally {
      setParseBusy(false);
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setParseError("");

    const trimmedRaw = rawContent.trim();
    const needsParse =
      Boolean(trimmedRaw) && (!hasParsedContent(form) || trimmedRaw !== parsedFromRaw);

    let workingForm = form;
    if (needsParse) {
      const parsed = await parseContent();
      if (!parsed) return;
      workingForm = { ...form, ...parsed };
    } else if (!hasParsedContent(form)) {
      setParseError(t("recipeParseRequired"));
      return;
    }

    setBusy(true);
    const payload = {
      ...workingForm,
      ingredientsEn: normalizeList(workingForm.ingredientsEn),
      ingredientsHe: normalizeList(workingForm.ingredientsHe),
      stepsEn: normalizeList(workingForm.stepsEn),
      stepsHe: normalizeList(workingForm.stepsHe),
      imageUrl: workingForm.imageUrl.trim() || null,
      courseId: workingForm.courseId || null,
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
            <div>
              <Textarea
                label={t("recipeContent")}
                required
                rows={10}
                value={rawContent}
                placeholder={t("recipeContentPlaceholder")}
                onChange={(e) => {
                  setRawContent(e.target.value);
                  setParseError("");
                }}
              />
              <p className="mt-2 text-sm font-light text-stone-500">{t("recipeContentHint")}</p>
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={parseBusy || !rawContent.trim()}
                  onClick={() => void parseContent()}
                >
                  {parseBusy ? t("organizing") : t("organizeWithAi")}
                </Button>
              </div>
              {parseError && (
                <div className="mt-3">
                  <ErrorNote message={parseError} />
                </div>
              )}
            </div>
            {hasParsedContent(form) && rawContent.trim() === parsedFromRaw && (
              <RecipeParsePreview form={form} />
            )}
            <ImageUpload
              label={t("image")}
              folder="recipes"
              value={form.imageUrl}
              onChange={(imageUrl) => setForm({ ...form, imageUrl })}
              color={form.color}
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
              <Button type="submit" disabled={busy || parseBusy}>
                {t("save")}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
