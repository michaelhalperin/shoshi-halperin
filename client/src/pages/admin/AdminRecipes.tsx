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
  ModalActions,
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

function RecipeAiOrganizingOverlay() {
  const { t } = useI18n();
  const statuses = [t("organizingReading"), t("organizingWriting"), t("organizingSorting")];
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStatusIndex((current) => (current + 1) % statuses.length);
    }, 1700);
    return () => window.clearInterval(timer);
  }, [statuses.length]);

  return (
    <div
      className="recipe-ai-overlay absolute inset-0 z-20 flex items-center justify-center bg-paper/82 px-6 backdrop-blur-[3px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="recipe-ai-card relative flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-clay-200/80 bg-paper px-8 py-9 shadow-[0_18px_50px_rgba(33,29,25,0.12)]">
        <div className="relative flex h-24 w-24 items-center justify-center" aria-hidden>
          <span className="recipe-ai-pulse absolute inset-3 rounded-full bg-clay-100" />
          <span className="recipe-ai-orbit absolute inset-0 rounded-full border border-dashed border-clay-300/80" />
          <span className="recipe-ai-orbit-reverse absolute inset-2 rounded-full border border-clay-200/60 border-t-clay-500/70" />
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-clay-50 text-clay-700 shadow-[inset_0_0_0_1px_rgba(154,93,60,0.12)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 7h16M7 12h10M9 17h6" strokeLinecap="round" />
              <circle cx="18.5" cy="5.5" r="1.2" fill="currentColor" stroke="none" className="recipe-ai-spark" />
              <circle cx="5.5" cy="12" r="1" fill="currentColor" stroke="none" className="recipe-ai-spark" />
              <circle cx="16.5" cy="18" r="1.1" fill="currentColor" stroke="none" className="recipe-ai-spark" />
            </svg>
          </span>
        </div>

        <div className="flex w-full max-w-[12rem] flex-col gap-2.5" aria-hidden>
          <span className="recipe-ai-line h-1.5 w-full rounded-full bg-clay-300/90" />
          <span className="recipe-ai-line mx-auto h-1.5 w-[88%] rounded-full bg-clay-200" />
          <span className="recipe-ai-line mx-auto h-1.5 w-[72%] rounded-full bg-clay-200/90" />
          <span className="recipe-ai-line mx-auto h-1.5 w-[58%] rounded-full bg-clay-100" />
        </div>

        <p
          key={statuses[statusIndex]}
          className="recipe-ai-status-swap min-h-6 text-center text-sm font-medium tracking-wide text-clay-700"
        >
          {statuses[statusIndex]}
        </p>
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

  type ParsedRecipeFields = Pick<
    RecipeForm,
    | "titleEn"
    | "titleHe"
    | "descriptionEn"
    | "descriptionHe"
    | "ingredientsEn"
    | "ingredientsHe"
    | "stepsEn"
    | "stepsHe"
  >;

  const parseContent = async (): Promise<ParsedRecipeFields | null> => {
    const content = rawContent.trim();
    if (!content) {
      setParseError(t("recipeParseRequired"));
      return null;
    }

    setParseError("");
    setParseBusy(true);
    try {
      const result = await api.post<{ recipe: ParsedRecipeFields }>("/api/admin/recipes/parse", {
        content,
      });
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
      const linked = payload.courseId
        ? courses.find((course) => course.id === payload.courseId)
        : undefined;
      const linkedCourse = linked
        ? { id: linked.id, titleEn: linked.titleEn, titleHe: linked.titleHe }
        : null;

      if (editing === "new") {
        const { recipe } = await api.post<{ recipe: Recipe }>("/api/recipes", payload);
        setRecipes((list) => [...(list ?? []), { ...recipe, course: linkedCourse }]);
      } else if (editing) {
        const { recipe } = await api.put<{ recipe: Recipe }>(`/api/recipes/${editing.id}`, payload);
        setRecipes((list) =>
          (list ?? []).map((item) =>
            item.id === recipe.id ? { ...recipe, course: linkedCourse } : item
          )
        );
      }
      setEditing(null);
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
      const removedId = deleting.id;
      await api.delete(`/api/recipes/${removedId}`);
      setRecipes((list) => (list ?? []).filter((recipe) => recipe.id !== removedId));
      setDeleting(null);
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
        <Modal
          title={editing === "new" ? t("newRecipe") : t("edit")}
          onClose={() => setEditing(null)}
          size="lg"
          disableClose={parseBusy}
          overlay={parseBusy ? <RecipeAiOrganizingOverlay /> : null}
        >
          <form onSubmit={save} className={`space-y-5 ${parseBusy ? "pointer-events-none select-none" : ""}`}>
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
            <div className="grid gap-5 sm:grid-cols-2">
              <Textarea
                label={t("descriptionEn")}
                required
                rows={3}
                value={form.descriptionEn}
                onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
              />
              <Textarea
                label={t("descriptionHe")}
                required
                rows={3}
                dir="rtl"
                value={form.descriptionHe}
                onChange={(e) => setForm({ ...form, descriptionHe: e.target.value })}
              />
            </div>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
              <div>
                <Textarea
                  label={t("recipeContent")}
                  required
                  rows={7}
                  value={rawContent}
                  placeholder={t("recipeContentPlaceholder")}
                  onChange={(e) => {
                    setRawContent(e.target.value);
                    setParseError("");
                  }}
                />
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-light text-stone-500">{t("recipeAiHint")}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={parseBusy || !rawContent.trim()}
                    onClick={() => void parseContent()}
                    className="w-full shrink-0 sm:w-auto"
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
              <div className="space-y-5">
                <ImageUpload
                  label={t("image")}
                  folder="recipes"
                  value={form.imageUrl}
                  onChange={(imageUrl) => setForm({ ...form, imageUrl })}
                  color={form.color}
                  searchQuery={form.titleEn.trim() || form.titleHe.trim()}
                />
                <div className="flex items-end gap-4">
                  <div className="min-w-0 flex-1">
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
                  </div>
                  <label className="flex shrink-0 items-center gap-2 pb-2 text-sm font-medium text-stone-600">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                      className="h-4 w-4 accent-clay-600"
                    />
                    {t("active")}
                  </label>
                </div>
              </div>
            </div>
            {hasParsedContent(form) && rawContent.trim() === parsedFromRaw && (
              <RecipeParsePreview form={form} />
            )}
            {error && <ErrorNote message={error} />}
            <ModalActions>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)} className="w-full sm:w-auto">
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={busy || parseBusy} className="w-full sm:w-auto">
                {t("save")}
              </Button>
            </ModalActions>
          </form>
        </Modal>
      )}
    </div>
  );
}
