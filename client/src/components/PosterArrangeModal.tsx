import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { api, ApiError, type GalleryImage } from "../api";
import { useI18n } from "../i18n";
import {
  clampFocus,
  clampScale,
  isPosterFit,
  nudgePosterScale,
  POSTER_SCALE_MAX,
  POSTER_SCALE_MIN,
  POSTER_SCALE_STEP,
  posterFrameStyle,
} from "../testimonialTiles";
import { Button, ErrorNote, Modal, ModalActions } from "./ui";

export function PosterArrangeModal({
  image,
  tileClassName,
  posterEndpoint,
  onClose,
  onSaved,
}: {
  image: GalleryImage;
  tileClassName: string;
  posterEndpoint: "/api/admin/testimonials/poster" | "/api/admin/gallery/poster";
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

  const frameSrc = image.posterUrl ?? image.url;

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!frameSrc) return;
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
    if (!frameSrc) return;
    setSaving(true);
    setError("");
    try {
      await api.put(posterEndpoint, {
        key: image.key,
        posterUrl: frameSrc,
        focusX,
        focusY,
        scale,
      });
      onSaved({
        ...image,
        posterUrl: frameSrc,
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
          } ${tileClassName}`}
        >
          {frameSrc && (
            <img
              src={frameSrc}
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

      <ModalActions>
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving} className="w-full sm:w-auto">
          {t("cancel")}
        </Button>
        <Button type="button" onClick={() => void save()} disabled={saving} className="w-full sm:w-auto">
          {saving ? t("saving") : t("save")}
        </Button>
      </ModalActions>
    </Modal>
  );
}
