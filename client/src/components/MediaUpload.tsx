import { useRef, useState, type DragEvent } from "react";
import { api, ApiError } from "../api";
import { useI18n } from "../i18n";

export type MediaUploadProgress = {
  total: number;
  current: number;
  fileName: string;
  filePercent: number;
  overallPercent: number;
};

export type PendingMedia = {
  id: string;
  name: string;
  previewUrl: string | null;
};

function fileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function revokePreview(item: PendingMedia | undefined) {
  if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
}

export function useMediaUploads(folder: string, onLoaded: () => void) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<MediaUploadProgress | null>(null);
  const [pending, setPending] = useState<PendingMedia[]>([]);
  const [error, setError] = useState("");

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setError("");
    setPending(
      files.map((file) => ({
        id: fileKey(file),
        name: file.name,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      }))
    );

    const failures: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = fileKey(file);
      const update = (filePercent: number) => {
        setProgress({
          total: files.length,
          current: i + 1,
          fileName: file.name,
          filePercent,
          overallPercent: Math.round(((i + filePercent / 100) / files.length) * 100),
        });
      };

      update(0);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);
        await api.upload("/api/admin/upload", formData, update);
        onLoaded();
      } catch (err) {
        const message = err instanceof ApiError ? err.message : t("errorGeneric");
        failures.push(`${file.name}: ${message}`);
      }

      setPending((current) => {
        const item = current.find((entry) => entry.id === id);
        revokePreview(item);
        return current.filter((entry) => entry.id !== id);
      });
    }

    setProgress(null);
    if (failures.length > 0) setError(failures.join(" · "));
    if (inputRef.current) inputRef.current.value = "";
  };

  return {
    inputRef,
    progress,
    pending,
    error,
    setError,
    uploading: Boolean(progress),
    uploadFiles,
  };
}

export function MediaUploadStatus({ progress }: { progress: MediaUploadProgress }) {
  const { t } = useI18n();
  const label = t("uploadingProgress")
    .replace("{current}", String(progress.current))
    .replace("{total}", String(progress.total));

  return (
    <div className="mb-4" role="status" aria-live="polite">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-medium text-ink">{progress.fileName}</span>
        <span className="shrink-0 tabular-nums text-stone-500">
          {label} · {progress.overallPercent}%
        </span>
      </div>
      <div className="mt-2 h-1 bg-stone-200">
        <div
          className="h-full bg-clay-600 transition-[width] duration-200 ease-out"
          style={{ width: `${progress.overallPercent}%` }}
        />
      </div>
    </div>
  );
}

export function PendingMediaTile({
  item,
  active,
  filePercent,
}: {
  item: PendingMedia;
  active: boolean;
  filePercent: number;
}) {
  const width = active ? filePercent : 0;
  return (
    <div className="relative aspect-square overflow-hidden border border-dashed border-stone-300 bg-clay-50">
      {item.previewUrl ? (
        <img src={item.previewUrl} alt="" className="h-full w-full object-cover opacity-50" />
      ) : (
        <div className="flex h-full items-center justify-center p-3 text-center text-xs text-stone-500">
          {item.name}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-ink/70 px-2 py-2">
        <div className="h-0.5 bg-white/25">
          <div className="h-full bg-white transition-[width] duration-200 ease-out" style={{ width: `${width}%` }} />
        </div>
      </div>
    </div>
  );
}

export function onMediaFilesDrop(event: DragEvent, uploadFiles: (files: File[]) => void) {
  const files = Array.from(event.dataTransfer.files ?? []);
  if (files.length === 0) return;
  event.preventDefault();
  void uploadFiles(files);
}
