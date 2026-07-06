import { Link } from "react-router-dom";
import { Button, OrnamentalDivider } from "../components/ui";
import { useI18n } from "../i18n";
import { siteConfig } from "../site";

const highlights = [
  { title: "aboutHighlight1Title" as const, text: "aboutHighlight1Text" as const },
  { title: "aboutHighlight2Title" as const, text: "aboutHighlight2Text" as const },
  { title: "aboutHighlight3Title" as const, text: "aboutHighlight3Text" as const },
];

export default function About() {
  const { t } = useI18n();

  return (
    <div>
      <section className="mx-auto max-w-3xl pt-6 pb-8 text-center sm:pt-10 sm:pb-10">
        <h1 className="mb-4 font-display text-5xl font-medium leading-[1.08] text-ink sm:text-6xl">
          {t("aboutTitle")}
        </h1>
        <p className="mx-auto max-w-lg text-lg font-light leading-relaxed text-stone-500">
          {t("aboutIntro")}
        </p>
        <OrnamentalDivider className="mt-8" />
      </section>

      <section className="mx-auto grid max-w-5xl gap-10 pb-14 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:items-start sm:gap-14">
        <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-clay-200 via-clay-100 to-paper sm:sticky sm:top-28">
          <img
            src={siteConfig.about.imageUrl}
            alt={t("aboutPhotoAlt")}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>

        <div className="space-y-5 text-[15px] font-light leading-relaxed text-stone-600 sm:pt-2">
          <p>{t("aboutP1")}</p>
          <p>{t("aboutP2")}</p>
          <p>{t("aboutP3")}</p>
        </div>
      </section>

      <section className="border-t border-stone-200 bg-clay-50/40 px-1 py-12 sm:py-14">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-center font-display text-3xl font-semibold text-ink sm:text-4xl">
            {t("aboutHighlightsTitle")}
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {highlights.map((item) => (
              <div key={item.title} className="border border-stone-200 bg-white p-6">
                <h3 className="mb-2 font-display text-xl font-semibold text-ink">{t(item.title)}</h3>
                <p className="text-sm font-light leading-relaxed text-stone-500">{t(item.text)}</p>
              </div>
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
