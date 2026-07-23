import { useCallback, useEffect, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import { api, ApiError, type GalleryImage } from "../../api";
import { Button, ConfirmModal, ErrorNote, Modal, Spinner } from "../../components/ui";
import { VideoThumbnail } from "../../components/VideoThumbnail";
import { useI18n } from "../../i18n";
import {
  clampFocus,
  clampScale,
  isPosterFit,
  nudgePosterScale,
  POSTER_SCALE_MAX,
  POSTER_SCALE_MIN,
  POSTER_SCALE_STEP,
  posterFrameStyle,
  testimonialTileLayout,
} from "../../testimonialTiles";

function reorderItems<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function PosterArrangeModal({
  image,
  index,
  onClose,
  onSaved,
}: {
  image: GalleryImage;
  index: number;
  onClose: () => void;
  onSaved: (next: GalleryImage) => void;
}) {
  const { t } = useI18n();
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [focusX, setFocusX] = useState(clampFocus(image.posterFocusX ?? 50));
  const [focusY, setFocusY] = useState(clampFocus(image.posterFocusY ?? 50));
  const [scale, setScale] = useState(clampScale(image.posterScale ?? 1));
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fit = isPosterFit(scale);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!image.posterUrl) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: focusX,
      originY: focusY,
    };
    setDragging(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const frame = frameRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !frame) return;

    const rect = frame.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const nextX = clampFocus(drag.originX - ((event.clientX - drag.startX) / rect.width) * 100);
    const nextY = clampFocus(drag.originY - ((event.clientY - drag.startY) / rect.height) * 100);
    setFocusX(nextX);
    setFocusY(nextY);
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  };

  const nudgeScale = (delta: number) => {
    setScale((current) => nudgePosterScale(current, delta));
  };

  const save = async () => {
    if (!image.posterUrl) return;
    setSaving(true);
    setError("");
    try {
      await api.put("/api/admin/testimonials/poster", {
        key: image.key,
        posterUrl: image.posterUrl,
        focusX,
        focusY,
        scale,
      });
      onSaved({
        ...image,
        posterFocusX: focusX,
        posterFocusY: focusY,
        posterScale: scale,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("errorGeneric"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={t("arrangeVideoPreview")} onClose={onClose} disableClose={saving}>
      <p className="mb-4 text-sm font-light leading-relaxed text-stone-500">
        {t("arrangeVideoPreviewHelp")}
      </p>

      <div className="mx-auto grid w-full max-w-md auto-rows-[72px] grid-cols-4 gap-2">
        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={`relative touch-none overflow-hidden border border-stone-300 bg-[#f0ece6] ${
            dragging ? "cursor-grabbing" : "cursor-grab"
          } ${testimonialTileLayout(index)}`}
        >
          {image.posterUrl && (
            <img
              src={image.posterUrl}
              alt=""
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full select-none"
              style={posterFrameStyle(focusX, focusY, scale)}
            />
          )}
          <span
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/15"
            aria-hidden
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-md">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M7 5.5v9l7-4.5-7-4.5z" />
              </svg>
            </span>
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
          {t("previewZoom")}
        </span>
        <button
          type="button"
          aria-label={t("minimizePreview")}
          disabled={saving || scale <= POSTER_SCALE_MIN}
          onClick={() => nudgeScale(-POSTER_SCALE_STEP)}
          className="flex h-9 w-9 items-center justify-center border border-stone-300 text-lg text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        <span className="min-w-[3.5rem] text-center text-sm font-medium tabular-nums text-ink">
          {fit ? t("previewFit") : `${Math.round(scale * 100)}%`}
        </span>
        <button
          type="button"
          aria-label={t("maximizePreview")}
          disabled={saving || scale >= POSTER_SCALE_MAX}
          onClick={() => nudgeScale(POSTER_SCALE_STEP)}
          className="flex h-9 w-9 items-center justify-center border border-stone-300 text-lg text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </button>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorNote message={error} />
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving} className="w-full sm:w-auto">
          {t("cancel")}
        </Button>
        <Button type="button" onClick={() => void save()} disabled={saving} className="w-full sm:w-auto">
          {saving ? t("saving") : t("save")}
        </Button>
      </div>
    </Modal>
  );
}

export default function AdminTestimonials() {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<GalleryImage[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<GalleryImage | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const [reorderError, setReorderError] = useState("");
  const [posterTarget, setPosterTarget] = useState<GalleryImage | null>(null);
  const [posterBusy, setPosterBusy] = useState(false);
  const [removingPoster, setRemovingPoster] = useState<GalleryImage | null>(null);
  const [arranging, setArranging] = useState<{ image: GalleryImage; index: number } | null>(null);

  const load = useCallback(() => {
    api
      .get<{ images: GalleryImage[] }>("/api/testimonials")
      .then((data) => setImages(data.images));
  }, []);

  useEffect(load, [load]);

  const saveOrder = async (nextImages: GalleryImage[]) => {
    setReordering(true);
    setReorderError("");
    try {
      await api.put("/api/admin/testimonials/order", {
        keys: nextImages.map((image) => image.key),
      });
    } catch (err) {
      setReorderError(err instanceof ApiError ? err.message : t("errorGeneric"));
      load();
    } finally {
      setReordering(false);
    }
  };

  const handleDrop = (toIndex: number) => {
    if (dragIndex === null || dragIndex === toIndex || !images) return;

    const nextImages = reorderItems(images, dragIndex, toIndex);
    setImages(nextImages);
    setDragIndex(null);
    setDropIndex(null);
    void saveOrder(nextImages);
  };

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
        formData.append("folder", "testimonials");
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

  const uploadPoster = async (file: File, video: GalleryImage) => {
    setError("");
    setPosterBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "testimonial-posters");
      const uploaded = await api.upload<{ url: string }>("/api/admin/upload", formData);
      await api.put("/api/admin/testimonials/poster", {
        key: video.key,
        posterUrl: uploaded.url,
        focusX: 50,
        focusY: 50,
        scale: 1,
      });
      const data = await api.get<{ images: GalleryImage[] }>("/api/testimonials");
      setImages(data.images);
      const index = data.images.findIndex((item) => item.key === video.key);
      const updated = index >= 0 ? data.images[index] : null;
      if (updated?.posterUrl) {
        setArranging({ image: updated, index: Math.max(index, 0) });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("errorGeneric"));
    } finally {
      setPosterBusy(false);
      setPosterTarget(null);
      if (posterInputRef.current) posterInputRef.current.value = "";
    }
  };

  const confirmRemovePoster = async () => {
    if (!removingPoster) return;
    setPosterBusy(true);
    setDeleteError("");
    try {
      await api.put("/api/admin/testimonials/poster", {
        key: removingPoster.key,
        posterUrl: null,
      });
      setRemovingPoster(null);
      load();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : t("errorGeneric"));
    } finally {
      setPosterBusy(false);
    }
  };

  const confirmRemove = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await api.deleteWithQuery("/api/admin/testimonials", { key: deleting.key });
      setDeleting(null);
      load();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : t("errorGeneric"));
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!images) return <Spinner />;

  const busy = uploading || reordering || posterBusy;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-clay-600">
          {t("manageTestimonials")}
        </h2>
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length > 0) void uploadFiles(files);
            }}
          />
          <input
            ref={posterInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file && posterTarget) void uploadPoster(file, posterTarget);
            }}
          />
          <Button disabled={busy} onClick={() => inputRef.current?.click()}>
            {uploading
              ? uploadProgress && uploadProgress.total > 1
                ? `${t("uploading")} (${uploadProgress.done}/${uploadProgress.total})`
                : t("uploading")
              : `+ ${t("uploadTestimonialsMedia")}`}
          </Button>
        </div>
      </div>

      {(error || reorderError) && (
        <div className="mb-4 space-y-3">
          {error && <ErrorNote message={error} />}
          {reorderError && <ErrorNote message={reorderError} />}
        </div>
      )}

      {(reordering || posterBusy) && (
        <p className="mb-4 text-sm font-light text-stone-500">
          {posterBusy ? t("uploading") : t("saving")}
        </p>
      )}

      {images.length === 0 ? (
        <p className="text-sm font-light text-stone-500">{t("noTestimonialsImages")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => {
            const isDragging = dragIndex === index;
            const isDropTarget = dropIndex === index && dragIndex !== null && dragIndex !== index;
            const hasPoster = Boolean(image.posterUrl);
            const posterStyle = posterFrameStyle(
              image.posterFocusX,
              image.posterFocusY,
              image.posterScale
            );

            return (
              <div
                key={image.key}
                draggable={!busy && !arranging}
                onDragStart={(event: DragEvent<HTMLDivElement>) => {
                  setDragIndex(index);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", image.key);
                }}
                onDragOver={(event: DragEvent<HTMLDivElement>) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  if (dragIndex !== null && dragIndex !== index) {
                    setDropIndex(index);
                  }
                }}
                onDragLeave={() => {
                  if (dropIndex === index) setDropIndex(null);
                }}
                onDrop={(event: DragEvent<HTMLDivElement>) => {
                  event.preventDefault();
                  handleDrop(index);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDropIndex(null);
                }}
                className={`group relative overflow-hidden border bg-clay-100 transition ${
                  isDragging ? "cursor-grabbing opacity-50" : "cursor-grab"
                } ${
                  isDropTarget ? "border-clay-500 ring-2 ring-clay-500" : "border-stone-200"
                }`}
              >
                <div
                  className="absolute end-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-ink/75 text-white shadow-sm backdrop-blur-sm"
                  aria-hidden
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 5.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 5.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm8-11a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 5.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 5.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
                  </svg>
                </div>
                {image.type === "video" ? (
                  <>
                    {hasPoster ? (
                      <img
                        src={image.posterUrl!}
                        alt=""
                        loading="lazy"
                        draggable={false}
                        className="pointer-events-none aspect-square w-full"
                        style={posterStyle}
                      />
                    ) : (
                      <VideoThumbnail
                        src={image.url}
                        draggable={false}
                        className="pointer-events-none aspect-square w-full object-cover"
                      />
                    )}
                    <span
                      className="pointer-events-none absolute start-2 top-2 rounded bg-ink/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                      aria-hidden
                    >
                      {t("galleryVideo")}
                    </span>
                    <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1 bg-gradient-to-t from-ink/80 via-ink/50 to-transparent p-2 pt-8">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(event) => {
                          event.stopPropagation();
                          setPosterTarget(image);
                          posterInputRef.current?.click();
                        }}
                        className="rounded bg-white/95 px-2 py-1 text-[11px] font-medium text-ink shadow-sm active:scale-[0.98] disabled:opacity-60"
                      >
                        {hasPoster ? t("changeVideoPreview") : t("setVideoPreview")}
                      </button>
                      {hasPoster && (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={(event) => {
                              event.stopPropagation();
                              setArranging({ image, index });
                            }}
                            className="rounded bg-white/95 px-2 py-1 text-[11px] font-medium text-ink shadow-sm active:scale-[0.98] disabled:opacity-60"
                          >
                            {t("arrangeVideoPreview")}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteError("");
                              setRemovingPoster(image);
                            }}
                            className="rounded bg-white/80 px-2 py-1 text-[11px] font-medium text-red-700 shadow-sm active:scale-[0.98] disabled:opacity-60"
                          >
                            {t("removeVideoPreview")}
                          </button>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <img
                    src={image.url}
                    alt=""
                    loading="lazy"
                    draggable={false}
                    className="pointer-events-none aspect-square w-full object-cover"
                  />
                )}
                <button
                  type="button"
                  aria-label={t("delete")}
                  onClick={(event) => {
                    event.stopPropagation();
                    setDeleteError("");
                    setDeleting(image);
                  }}
                  className={`absolute end-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-red-600 shadow-sm active:scale-95 ${
                    image.type === "video" ? "top-12" : "bottom-2"
                  }`}
                >
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                    <path d="M4 6h12M7 6V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M8 6v9m4-9v9M6 6l.5 10a1 1 0 0 0 1 .9h5a1 1 0 0 0 1-.9L14 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            );
          })}
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

      {removingPoster && (
        <ConfirmModal
          title={t("removeVideoPreview")}
          message={t("confirmRemoveVideoPreview")}
          confirmLabel={t("removeVideoPreview")}
          onClose={() => setRemovingPoster(null)}
          onConfirm={confirmRemovePoster}
          busy={posterBusy}
          error={deleteError}
        />
      )}

      {arranging && (
        <PosterArrangeModal
          image={arranging.image}
          index={arranging.index}
          onClose={() => setArranging(null)}
          onSaved={(next) => {
            setImages((current) =>
              current
                ? current.map((item) => (item.key === next.key ? next : item))
                : current
            );
          }}
        />
      )}
    </div>
  );
}
