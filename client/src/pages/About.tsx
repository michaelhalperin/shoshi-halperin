import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type AboutContent } from "../api";
import { Button, OrnamentalDivider, Spinner } from "../components/ui";
import { useI18n, type Lang } from "../i18n";
import { siteConfig } from "../site";

const highlights = [
  { title: "aboutHighlight1Title" as const, text: "aboutHighlight1Text" as const },
  { title: "aboutHighlight2Title" as const, text: "aboutHighlight2Text" as const },
  { title: "aboutHighlight3Title" as const, text: "aboutHighlight3Text" as const },
];

function aboutField(content: AboutContent, field: string, lang: Lang) {
  return content[`${field}${lang === "he" ? "He" : "En"}` as keyof AboutContent] as string;
}

export default function About() {
  const { lang, t } = useI18n();
  const [content, setContent] = useState<AboutContent | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ content: AboutContent; imageUrl: string | null }>("/api/about")
      .then((data) => {
        setContent(data.content);
        setImageUrl(data.imageUrl);
      })
      .catch(() => {
        setContent(null);
        setImageUrl(null);
      });
  }, []);

  if (!content) return <Spinner />;

  const paragraphs = lang === "he" ? content.paragraphsHe : content.paragraphsEn;

  return (
    <div>
      <section className="mx-auto max-w-3xl pt-6 pb-8 text-center sm:pt-10 sm:pb-10">
        <h1 className="mb-4 font-display text-5xl font-medium leading-[1.08] text-ink sm:text-6xl">
          {aboutField(content, "title", lang)}
        </h1>
        <p className="mx-auto max-w-lg text-lg font-light leading-relaxed text-stone-500">
          {aboutField(content, "intro", lang)}
        </p>
        <OrnamentalDivider className="mt-8" />
      </section>

      <section className="mx-auto grid max-w-5xl gap-10 pb-14 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:items-start sm:gap-14">
        <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-clay-200 via-clay-100 to-paper sm:sticky sm:top-28">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={t("aboutPhotoAlt")}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
        </div>

        <div className="space-y-5 text-[15px] font-light leading-relaxed text-stone-600 sm:pt-2">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="border-t border-stone-200 bg-gradient-to-b from-clay-50/70 via-clay-50/30 to-paper px-1 py-14 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              {t("aboutHighlightsTitle")}
            </h2>
            <OrnamentalDivider className="mt-6" />
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-3 sm:gap-6">
            {highlights.map((item, index) => (
              <article
                key={item.title}
                className="group relative overflow-hidden border border-stone-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md sm:p-7"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-clay-400 via-clay-500 to-clay-300"
                  aria-hidden
                />
                <span className="mb-4 block font-display text-4xl font-medium leading-none text-clay-200 transition-colors group-hover:text-clay-300">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mb-3 font-display text-xl font-semibold leading-snug text-ink">
                  {t(item.title)}
                </h3>
                <p className="text-sm font-light leading-relaxed text-stone-500">
                  {t(item.text)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-2xl py-14 text-center sm:py-16">
        <p className="mb-6 font-display text-2xl font-medium leading-snug text-ink sm:text-3xl">
          {t("aboutCta")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/">
            <Button>{t("courses")}</Button>
          </Link>
          {siteConfig.social.instagram && (
            <a
              href={siteConfig.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-semibold uppercase tracking-[0.12em] text-clay-700 transition-colors hover:text-clay-900"
            >
              {t("aboutFollow")}
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
