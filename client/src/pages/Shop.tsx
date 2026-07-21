import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type ShopLink } from "../api";
import { Button, CourseImage, ErrorNote, OrnamentalDivider, Spinner } from "../components/ui";
import { useI18n } from "../i18n";

interface ShopGroup {
  categoryEn: string;
  categoryHe: string;
  shopName: string;
  items: ShopLink[];
}

export default function Shop() {
  const { t, pick } = useI18n();
  const [links, setLinks] = useState<ShopLink[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const loadData = useCallback(() => {
    setLoadError(false);
    setLinks(null);
    api
      .get<{ links: ShopLink[] }>("/api/shop-links")
      .then((d) => setLinks(d.links))
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const grouped = useMemo(() => {
    if (!links) return [];
    const map = new Map<string, ShopGroup>();
    for (const link of links) {
      const key = `${link.categoryEn}|||${link.categoryHe}|||${link.shopName}`;
      const existing = map.get(key);
      if (existing) {
        existing.items.push(link);
      } else {
        map.set(key, {
          categoryEn: link.categoryEn,
          categoryHe: link.categoryHe,
          shopName: link.shopName,
          items: [link],
        });
      }
    }
    return [...map.values()];
  }, [links]);

  return (
    <div>
      <section className="mx-auto max-w-3xl pt-8 pb-8 text-center sm:pt-16 sm:pb-14">
        <h1 className="mb-4 font-display text-4xl font-medium leading-[1.08] text-ink sm:mb-6 sm:text-5xl lg:text-6xl">
          {t("shopTitle")}
        </h1>
        <p className="mx-auto max-w-md px-1 text-base font-light leading-relaxed text-stone-500 sm:text-lg">
          {t("shopHero")}
        </p>
        <OrnamentalDivider className="mt-8 sm:mt-10" />
      </section>

      {loadError ? (
        <div className="mx-auto max-w-md px-4 pb-10 text-center">
          <ErrorNote message={t("loadError")} />
          <Button className="mt-4" onClick={loadData}>
            {t("retry")}
          </Button>
        </div>
      ) : !links ? (
        <Spinner />
      ) : links.length === 0 ? (
        <p className="pb-10 text-center font-light text-stone-500">{t("noShopProducts")}</p>
      ) : (
        <div className="space-y-10 pb-10 sm:space-y-16">
          {grouped.map((group) => (
            <section key={`${group.categoryEn}-${group.shopName}`}>
              <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-14 lg:grid-cols-3">
                {group.items.map((product) => (
                  <article key={product.id} className="group flex min-w-0 flex-col">
                    <a
                      href={product.attributedUrl ?? product.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block min-w-0 flex-1"
                      aria-label={`${pick(product, "title")} — ${t("viewProduct")}`}
                    >
                      <CourseImage
                        imageUrl={product.imageUrl}
                        color="teal"
                        alt={pick(product, "title")}
                        className="mb-4 aspect-square sm:mb-5"
                      />
                      <h3 className="mb-2 line-clamp-3 font-display text-xl font-semibold leading-snug text-ink transition-colors group-hover:text-clay-700 sm:text-2xl">
                        {pick(product, "title")}
                      </h3>
                      {product.price != null && (
                        <p className="mb-3 font-display text-lg font-semibold text-clay-700 sm:mb-4 sm:text-xl">
                          ₪{product.price}
                        </p>
                      )}
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-clay-600 transition-colors group-hover:text-clay-800 sm:text-[13px]">
                        {t("viewProduct")}
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          aria-hidden
                        >
                          <path d="M7 4h9v9M16 4 4 16" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </a>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
