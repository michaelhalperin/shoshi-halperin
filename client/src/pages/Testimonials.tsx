import { useCallback, useEffect, useRef, useState } from "react";
import { api, type GalleryImage } from "../api";
import { FadeInImage, OrnamentalDivider, Spinner } from "../components/ui";
import { VideoThumbnail } from "../components/VideoThumbnail";
import { useI18n } from "../i18n";

const tileLayouts = [
  "col-span-2 row-span-2",
  "col-span-2 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-2 row-span-1",
  "col-span-2 row-span-1",
] as const;

function TestimonialTile({ item, alt }: { item: GalleryImage; alt: string }) {
  if (item.type === "video") {
    return (
      <>
        <VideoThumbnail
          src={item.url}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/20"
          aria-hidden
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-ink shadow-md">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M7 5.5v9l7-4.5-7-4.5z" />
            </svg>
          </span>
        </span>
      </>
    );
  }

  return (
    <FadeInImage
      src={item.url}
      alt={alt}
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
    />
  );
}

export default function Testimonials() {
  const { t } = useI18n();
  const [images, setImages] = useState<GalleryImage[] | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    api
      .get<{ images: GalleryImage[] }>("/api/testimonials")
      .then((data) => setImages(data.images))
      .catch(() => setImages([]));
  }, []);

  const close = useCallback(() => setSelectedIndex(null), []);

  const goPrev = useCallback(() => {
    setSelectedIndex((index) =>
      images && index !== null ? (index - 1 + images.length) % images.length : null
    );
  }, [images]);

  const goNext = useCallback(() => {
    setSelectedIndex((index) =>
      images && index !== null ? (index + 1) % images.length : null
    );
  }, [images]);

  useEffect(() => {
    if (selectedIndex === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      videoRef.current?.pause();
    };
  }, [selectedIndex, close, goPrev, goNext]);

  const selected = selectedIndex !== null && images ? images[selectedIndex] : null;
  const selectedAlt =
    selected?.type === "video" ? t("testimonialsVideoAlt") : t("testimonialsImageAlt");

  return (
    <div>
      <section className="mx-auto max-w-3xl pt-10 pb-10 text-center sm:pt-16 sm:pb-14">
        <h1 className="mb-6 font-display text-5xl font-medium leading-[1.08] text-ink sm:text-6xl">
          {t("testimonialsTitle")}
        </h1>
        <p className="mx-auto text-lg font-light leading-relaxed text-stone-500">
          {t("testimonialsHero")}
        </p>
        <OrnamentalDivider className="mt-10" />
      </section>

      {!images ? (
        <Spinner />
      ) : images.length === 0 ? (
        <p className="pb-10 text-center font-light text-stone-500">{t("noTestimonials")}</p>
      ) : (
        <section className="grid grid-flow-dense auto-rows-[120px] grid-cols-2 gap-2.5 pb-10 sm:auto-rows-[140px] sm:gap-3 md:grid-cols-4 md:auto-rows-[155px]">
          {images.map((image, index) => (
            <button
              key={image.key}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`group relative min-h-0 overflow-hidden border border-stone-200 bg-[#f0ece6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-500 ${tileLayouts[index % tileLayouts.length]}`}
            >
              <TestimonialTile
                item={image}
                alt={
                  image.type === "video" ? t("testimonialsVideoAlt") : t("testimonialsImageAlt")
                }
              />
              <span
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                aria-hidden
              />
            </button>
          ))}
        </section>
      )}

      {selected && selectedIndex !== null && images && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4 backdrop-blur-sm"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={selectedAlt}
        >
          <button
            type="button"
            onClick={close}
            className="absolute end-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label={t("closeLightbox")}
          >
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goPrev();
                }}
                className="absolute start-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:start-4 sm:h-12 sm:w-12"
                aria-label={t("previousImage")}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goNext();
                }}
                className="absolute end-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:end-4 sm:h-12 sm:w-12"
                aria-label={t("nextImage")}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          )}

          {selected.type === "video" ? (
            <video
              ref={videoRef}
              key={selected.key}
              src={selected.url}
              controls
              autoPlay
              playsInline
              className="max-h-[85vh] max-w-full"
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <img
              src={selected.url}
              alt={selectedAlt}
              className="max-h-[85vh] max-w-full object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  );
}
