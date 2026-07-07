import { useEffect, useRef, useState } from "react";
import { api, ApiError, type GalleryImage } from "../../api";
import { Button, ConfirmModal, ErrorNote, Spinner } from "../../components/ui";
import { useI18n } from "../../i18n";

export default function AdminGallery() {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<GalleryImage[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<GalleryImage | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = () => {
    api.get<{ images: GalleryImage[] }>("/api/gallery").then((data) => setImages(data.images));
  };

  useEffect(load, []);

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setError("");
    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });

    const failures: string[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const formData = new FormData();
        formData.append("file", files[i]);
        formData.append("folder", "gallery");
        await api.upload("/api/admin/upload", formData);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : t("errorGeneric");
        failures.push(`${files[i].name}: ${message}`);
      }
      setUploadProgress({ done: i + 1, total: files.length });
    }

    load();

    if (failures.length > 0) {
      setError(failures.join("; "));
    }

    setUploading(false);
    setUploadProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const confirmRemove = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await api.deleteWithQuery("/api/admin/gallery", { key: deleting.key });
      setDeleting(null);
      load();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : t("errorGeneric"));
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!images) return <Spinner />;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-clay-600">
          {t("manageGallery")}
        </h2>
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length > 0) void uploadFiles(files);
            }}
          />
          <Button disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading
              ? uploadProgress && uploadProgress.total > 1
                ? `${t("uploading")} (${uploadProgress.done}/${uploadProgress.total})`
                : t("uploading")
              : `+ ${t("uploadGalleryImage")}`}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      {images.length === 0 ? (
        <p className="text-sm font-light text-stone-500">{t("noGalleryImages")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image) => (
            <div key={image.key} className="group relative overflow-hidden border border-stone-200 bg-clay-100">
              <img
                src={image.url}
                alt=""
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-ink/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  type="button"
                  variant="danger"
                  className="!px-3 !py-1.5 !text-[11px]"
                  onClick={() => {
                    setDeleteError("");
                    setDeleting(image);
                  }}
                >
                  {t("delete")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

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
    </div>
  );
}
