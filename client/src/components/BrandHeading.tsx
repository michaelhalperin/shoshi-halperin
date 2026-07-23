import logo from "../assets/logo.png";
import { useI18n } from "../i18n";

/** Page hero with brand name: handwritten in English, logo in Hebrew. */
export function BrandHeading({
  before,
  name,
  after,
}: {
  before: string;
  name: string;
  after: string;
}) {
  const { lang } = useI18n();

  return (
    <h1 className="mb-6 font-display text-5xl font-medium leading-[1.08] text-ink sm:text-6xl">
      {before}
      {lang === "he" ? (
        <img
          src={logo}
          alt={name}
          className="mx-1 inline-block h-[1.9em] w-auto align-[-0.45em]"
        />
      ) : (
        <span className="font-hand text-[1.15em] font-semibold text-clay-700">{name}</span>
      )}
      {after}
    </h1>
  );
}
