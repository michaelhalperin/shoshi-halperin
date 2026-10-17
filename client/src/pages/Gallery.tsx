import { useCallback, useEffect, useRef, useState } from "react";
import { api, type GalleryImage } from "../api";
import { FadeInImage, OrnamentalDivider, Spinner } from "../components/ui";
import { useI18n } from "../i18n";
import { posterFrameStyle } from "../testimonialTiles";

function GalleryVideoTile({
  item,
  active,
}: {
  item: GalleryImage;
  active: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!active) {
      video.pause();
      return;
    }

    const play = () => {
      void video.play().catch(() => {
        /* Autoplay can be blocked; keep poster/first frame. */
      });
    };

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      play();
    } else {
      video.addEventListener("loadeddata", play, { once: true });
      video.load();
    }

    return () => {
      video.removeEventListener("loadeddata", play);
      video.pause();
    };
  }, [active, item.url]);

  return (
    <>
      <video
        ref={videoRef}
        src={item.url}
        poster={item.posterUrl ?? undefined}
        muted
        loop
        playsInline
        preload={active ? "auto" : "metadata"}
        aria-hidden
        className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          active ? "scale-100" : "group-hover:scale-[1.04] group-focus-visible:scale-[1.04]"
        }`}
      />
      <span
        className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/20 transition-opacity duration-300 ${
          active ? "opacity-0" : "opacity-100"
        }`}
        aria-hidden
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-paper/95 text-ink shadow-[0_8px_28px_rgba(33,29,25,0.28)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 sm:h-14 sm:w-14">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M7 5.5v9l7-4.5-7-4.5z" />
          </svg>
        </span>
      </span>
    </>
  );
}

function GalleryTile({
  item,
  alt,
  active,
}: {
  item: GalleryImage;
  alt: string;
  active: boolean;
}) {
  if (item.type === "video") {
    return <GalleryVideoTile item={item} active={active} />;
  }

  const framed = Boolean(item.posterUrl);

  return (
    <span className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] group-focus-visible:scale-[1.04]">
      <FadeInImage
        src={item.url}
        alt={alt}
        style={framed ? posterFrameStyle(item.posterFocusX, item.posterFocusY, item.posterScale) : undefined}
        className={`absolute inset-0 h-full w-full ${framed ? "" : "object-cover"}`}
      />
    </span>
  );
}

function nearestCardIndex(strip: HTMLElement) {
  const cards = Array.from(strip.querySelectorAll<HTMLElement>("[data-gallery-card]"));
  if (cards.length === 0) return 0;

  const stripRect = strip.getBoundingClientRect();
  const mid = stripRect.left + stripRect.width / 2;
  let nearest = 0;
  let nearestDist = Infinity;

  cards.forEach((card, index) => {
    const rect = card.getBoundingClientRect();
    const dist = Math.abs(rect.left + rect.width / 2 - mid);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = index;
    }
  });

  return nearest;
}

export default function Gallery() {
  const { t } = useI18n();
  const [images, setImages] = useState<GalleryImage[] | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<{ images: GalleryImage[] }>("/api/gallery")
      .then((data) => setImages(data.images))
      .catch(() => setImages([]));
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const updateStripState = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;

    setFocusedIndex(nearestCardIndex(el));

    const cards = el.querySelectorAll<HTMLElement>("[data-gallery-card]");
    if (cards.length === 0 || el.scrollWidth <= el.clientWidth + 2) {
      setCanScrollPrev(false);
      setCanScrollNext(false);
      return;
    }
    const strip = el.getBoundingClientRect();
    const first = cards[0].getBoundingClientRect();
    const last = cards[cards.length - 1].getBoundingClientRect();
    const rtl = getComputedStyle(el).direction === "rtl";
    if (rtl) {
      setCanScrollPrev(first.right < strip.right - 4);
      setCanScrollNext(last.left < strip.left + 4);
    } else {
      setCanScrollPrev(first.left < strip.left - 4);
      setCanScrollNext(last.right > strip.right + 4);
    }
  }, []);

  useEffect(() => {
    const el = stripRef.current;
    if (!el || !images?.length) return;
    updateStripState();
    el.addEventListener("scroll", updateStripState, { passive: true });
    window.addEventListener("resize", updateStripState);
    return () => {
      el.removeEventListener("scroll", updateStripState);
      window.removeEventListener("resize", updateStripState);
    };
  }, [images, updateStripState]);

  const scrollStrip = useCallback((direction: "prev" | "next") => {
    const el = stripRef.current;
    if (!el) return;
    const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-gallery-card]"));
    if (cards.length === 0) return;

    const nearest = nearestCardIndex(el);
    const targetIndex =
      direction === "next"
        ? Math.min(cards.length - 1, nearest + 1)
        : Math.max(0, nearest - 1);
    cards[targetIndex]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
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
    selected?.type === "video" ? t("galleryVideoAlt") : t("galleryImageAlt");
  const showStripNav = canScrollPrev || canScrollNext;

  return (
    <div className="pb-4">
      <section className="mx-auto max-w-3xl pt-10 pb-8 text-center sm:pt-14 sm:pb-10">
        <h1 className="mb-5 font-display text-5xl font-medium leading-[1.08] text-ink sm:text-6xl">
          {t("galleryTitle")}
        </h1>
        <p className="mx-auto max-w-xl text-[clamp(0.85rem,2.8vw,1.125rem)] font-light leading-relaxed text-stone-500">
          {t("galleryHero")}
        </p>
        <OrnamentalDivider className="mt-8" />
      </section>

      {!images ? (
        <Spinner />
      ) : images.length === 0 ? (
        <p className="pb-10 text-center font-light text-stone-500">{t("noGallery")}</p>
      ) : (
        <section className="relative pb-8" aria-label={t("galleryTitle")}>
          {showStripNav && (
            <>
              <button
                type="button"
                onClick={() => scrollStrip("prev")}
                disabled={!canScrollPrev}
                className="absolute start-1 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-paper/95 text-ink shadow-sm transition-opacity hover:border-clay-300 hover:bg-clay-50 disabled:pointer-events-none disabled:opacity-0 md:flex lg:start-2"
                aria-label={t("previousImage")}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="rtl:rotate-180" aria-hidden>
                  <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => scrollStrip("next")}
                disabled={!canScrollNext}
                className="absolute end-1 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-paper/95 text-ink shadow-sm transition-opacity hover:border-clay-300 hover:bg-clay-50 disabled:pointer-events-none disabled:opacity-0 md:flex lg:end-2"
                aria-label={t("nextImage")}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="rtl:rotate-180" aria-hidden>
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          )}

          <div
            ref={stripRef}
            className="gallery-strip -mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:gap-3 sm:px-6 md:mx-0 md:gap-3.5 md:px-14 lg:px-16"
          >
            {images.map((image, index) => {
              const alt = image.type === "video" ? t("galleryVideoAlt") : t("galleryImageAlt");
              const active =
                !reduceMotion &&
                selectedIndex === null &&
                focusedIndex === index &&
                image.type === "video";

              return (
                <button
                  key={image.key}
                  type="button"
                  data-gallery-card
                  onClick={() => setSelectedIndex(index)}
                  aria-label={alt}
                  className="gallery-strip-card group relative shrink-0 snap-center overflow-hidden rounded-sm border border-stone-200/90 bg-clay-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-500"
                >
                  <GalleryTile item={image} alt={alt} active={active} />

                  <span
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100"
                    aria-hidden
                  />

                  <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 text-paper sm:p-4">
                    <span className="font-display text-lg font-medium tracking-tight sm:text-xl">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {image.type === "video" && (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-paper/85">
                        {t("galleryVideo")}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {selected && selectedIndex !== null && images && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/92 p-4 backdrop-blur-[2px]"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={selectedAlt}
        >
          <button
            type="button"
            onClick={close}
            className="absolute end-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-paper/10 text-paper transition-colors hover:bg-paper/20"
            aria-label={t("closeLightbox")}
          >
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>

          <p className="pointer-events-none absolute start-4 top-5 font-display text-sm tracking-wide text-paper/70 sm:start-6 sm:text-base">
            {String(selectedIndex + 1).padStart(2, "0")}
            <span className="mx-2 text-paper/35">/</span>
            {String(images.length).padStart(2, "0")}
          </p>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goPrev();
                }}
                className="absolute start-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper/10 text-paper transition-colors hover:bg-paper/20 sm:start-4 sm:h-12 sm:w-12"
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
                className="absolute end-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper/10 text-paper transition-colors hover:bg-paper/20 sm:end-4 sm:h-12 sm:w-12"
                aria-label={t("nextImage")}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          )}

          <div
            className="relative max-h-[85vh] max-w-full overflow-hidden rounded-sm shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            {selected.type === "video" ? (
              <video
                ref={videoRef}
                key={selected.key}
                src={selected.url}
                poster={selected.posterUrl ?? undefined}
                controls
                autoPlay
                playsInline
                className="max-h-[85vh] max-w-full"
              />
            ) : (
              <img
                src={selected.url}
                alt={selectedAlt}
                className="max-h-[85vh] max-w-full object-contain"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
