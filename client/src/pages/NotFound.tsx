import { Link } from "react-router-dom";
import { Button, OrnamentalDivider } from "../components/ui";
import { useI18n } from "../i18n";

export default function NotFound() {
  const { t } = useI18n();

  return (
    <section className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
      <p className="mb-2 font-display text-7xl font-medium leading-none text-clay-300 sm:text-8xl" aria-hidden>
        404
      </p>
      <h1 className="mb-4 font-display text-4xl font-medium leading-tight text-ink sm:text-5xl">
        {t("notFoundTitle")}
      </h1>
      <p className="mb-8 max-w-sm text-lg font-light leading-relaxed text-stone-500">
        {t("notFoundMessage")}
      </p>
      <OrnamentalDivider className="mb-8" />
      <Link to="/">
        <Button>{t("notFoundBackHome")}</Button>
      </Link>
    </section>
  );
}
