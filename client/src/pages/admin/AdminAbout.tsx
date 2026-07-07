import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { api, ApiError, type AboutContent, type GalleryImage } from "../../api";
import { Button, ConfirmModal, ErrorNote, Input, Spinner, Textarea } from "../../components/ui";
import { useI18n } from "../../i18n";

type AboutParagraph = { en: string; he: string };

type AboutForm = {
  titleEn: string;
  titleHe: string;
  introEn: string;
  introHe: string;
  paragraphs: AboutParagraph[];
};

const emptyForm: AboutForm = {
  titleEn: "",
  titleHe: "",
  introEn: "",
  introHe: "",
  paragraphs: [{ en: "", he: "" }],
};

function previewText(...parts: (string | undefined)[]) {
  const text = parts.find((part) => part?.trim())?.trim() ?? "";
  if (!text) return "";
  return text.length > 72 ? `${text.slice(0, 72)}…` : text;
}

function CollapsibleSection({
  title,
  summary,
  action,
  children,
}: {
  title: string;
  summary?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const panelId = title.replace(/\s+/g, "-").toLowerCase();

  return (
    <div className="overflow-hidden border border-stone-200 bg-white">
      <div className="flex items-start gap-3 border-b border-stone-100 px-4 py-3 sm:items-center">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-w-0 flex-1 items-start gap-3 text-start sm:items-center"
        >
          <span
            className={`mt-1 shrink-0 text-stone-400 transition-transform sm:mt-0 ${open ? "rotate-90" : ""}`}
            aria-hidden
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8.2 5.2a1 1 0 0 1 1.4 0l4.8 4.8a1 1 0 0 1 0 1.4l-4.8 4.8a1 1 0 0 1-1.4-1.4L12.2 10 8.2 6a1 1 0 0 1 0-1.4z" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              {title}
            </span>
            {!open && (
              <span className="mt-1 block truncate text-sm font-light text-stone-400">
                {summary || t("emptySection")}
              </span>
            )}
          </span>
        </button>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {open && (
        <div id={panelId} className="space-y-5 p-4 sm:p-5">
          {children}
        </div>
      )}
    </div>
  );
}

function toForm(content: AboutContent): AboutForm {
  return {
    titleEn: content.titleEn,
    titleHe: content.titleHe,
    introEn: content.introEn,
    introHe: content.introHe,
    paragraphs: content.paragraphsEn.map((en, index) => ({
      en,
      he: content.paragraphsHe[index] ?? "",
    })),
  };
}

function toPayload(form: AboutForm) {
  return {
    titleEn: form.titleEn,
    titleHe: form.titleHe,
    introEn: form.introEn,
    introHe: form.introHe,
    paragraphsEn: form.paragraphs.map((paragraph) => paragraph.en),
    paragraphsHe: form.paragraphs.map((paragraph) => paragraph.he),
  };
}

export default function AdminAbout() {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<AboutForm>(emptyForm);
  const [image, setImage] = useState<GalleryImage | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removingParagraph, setRemovingParagraph] = useState<number | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = () => {
    api
      .get<{ content: AboutContent; images: GalleryImage[] }>("/api/admin/about")
      .then((data) => {
        setForm(toForm(data.content));
        setImage(data.images[0] ?? null);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  };

  useEffect(load, []);

  const uploadFile = async (file: File) => {
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "about");
      await api.upload("/api/admin/upload", formData);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("errorGeneric"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaveError("");
    setSaving(true);
    try {
      await api.put("/api/admin/about", toPayload(form));
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : t("errorGeneric"));
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    if (!image) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await api.deleteWithQuery("/api/admin/about", { key: image.key });
      setConfirmDelete(false);
      load();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : t("errorGeneric"));
    } finally {
      setDeleteBusy(false);
    }
  };

  const confirmRemoveParagraph = () => {
    if (removingParagraph === null) return;
    setForm({
      ...form,
      paragraphs: form.paragraphs.filter((_, i) => i !== removingParagraph),
    });
    setRemovingParagraph(null);
  };

  if (!loaded) return <Spinner />;

  const photoSummary = image ? t("photoUploaded") : t("noAboutPhoto");
  const titleSummary = previewText(form.titleEn, form.titleHe);
  const introSummary = previewText(form.introEn, form.introHe);
  const paragraphsSummary = `${form.paragraphs.length} ${t("paragraphCount")}`;

  return (
    <div className="space-y-6">
      <CollapsibleSection
        title={t("aboutPhotoSection")}
        summary={photoSummary}
        action={
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadFile(file);
              }}
            />
            <Button
              type="button"
              disabled={uploading}
              className="!px-3 !py-1.5 !text-[11px]"
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? t("uploading") : image ? t("replaceImage") : t("uploadImage")}
            </Button>
          </>
        }
      >
        <p className="text-sm font-light leading-relaxed text-stone-500">{t("aboutPhotoHelp")}</p>

        {error && <ErrorNote message={error} />}

        {image ? (
          <div className="max-w-sm">
            <div className="group relative overflow-hidden border border-stone-200 bg-clay-100">
              <img
                src={image.url}
                alt=""
                loading="lazy"
                className="aspect-[4/5] w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-ink/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  type="button"
                  variant="danger"
                  className="!px-3 !py-1.5 !text-[11px]"
                  onClick={() => {
                    setDeleteError("");
                    setConfirmDelete(true);
                  }}
                >
                  {t("delete")}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm font-light text-stone-500">{t("noAboutPhoto")}</p>
        )}
      </CollapsibleSection>

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-clay-600">
          {t("aboutContentSection")}
        </h2>

        <form onSubmit={save} className="space-y-4">
          <CollapsibleSection title={t("aboutTitleSection")} summary={titleSummary}>
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
          </CollapsibleSection>

          <CollapsibleSection title={t("aboutIntroSection")} summary={introSummary}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Textarea
                label={t("aboutIntroEn")}
                required
                value={form.introEn}
                onChange={(e) => setForm({ ...form, introEn: e.target.value })}
              />
              <Textarea
                label={t("aboutIntroHe")}
                required
                dir="rtl"
                value={form.introHe}
                onChange={(e) => setForm({ ...form, introHe: e.target.value })}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={t("aboutParagraphs")} summary={paragraphsSummary}>
            <div className="space-y-4">
              {form.paragraphs.map((paragraph, index) => (
                <CollapsibleSection
                  key={index}
                  title={`${t("aboutParagraph")} ${index + 1}`}
                  summary={previewText(paragraph.en, paragraph.he)}
                >
                  <div className="flex justify-end">
                    {form.paragraphs.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="!px-2 !py-1 !text-[11px]"
                        onClick={() => setRemovingParagraph(index)}
                      >
                        {t("removeItem")}
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Textarea
                      label={t("descriptionEn")}
                      required
                      value={paragraph.en}
                      onChange={(e) => {
                        const paragraphs = [...form.paragraphs];
                        paragraphs[index] = { ...paragraph, en: e.target.value };
                        setForm({ ...form, paragraphs });
                      }}
                    />
                    <Textarea
                      label={t("descriptionHe")}
                      required
                      dir="rtl"
                      value={paragraph.he}
                      onChange={(e) => {
                        const paragraphs = [...form.paragraphs];
                        paragraphs[index] = { ...paragraph, he: e.target.value };
                        setForm({ ...form, paragraphs });
                      }}
                    />
                  </div>
                </CollapsibleSection>
              ))}

              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setForm({
                    ...form,
                    paragraphs: [...form.paragraphs, { en: "", he: "" }],
                  })
                }
              >
                + {t("addParagraph")}
              </Button>
            </div>
          </CollapsibleSection>

          {saveError && <ErrorNote message={saveError} />}

          <Button type="submit" disabled={saving}>
            {saving ? t("saving") : t("save")}
          </Button>
        </form>
      </section>

      {removingParagraph !== null && (
        <ConfirmModal
          title={t("removeItem")}
          message={t("confirmRemoveParagraph")}
          confirmLabel={t("removeItem")}
          onClose={() => setRemovingParagraph(null)}
          onConfirm={confirmRemoveParagraph}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title={t("removeImage")}
          message={t("confirmRemoveImage")}
          confirmLabel={t("removeImage")}
          onClose={() => setConfirmDelete(false)}
          onConfirm={confirmRemove}
          busy={deleteBusy}
          error={deleteError}
        />
      )}
    </div>
  );
}
