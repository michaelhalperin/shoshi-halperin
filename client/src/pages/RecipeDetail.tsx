import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type Recipe } from "../api";
import { CourseImage, LinkedCourseLink, OrnamentalDivider, Spinner } from "../components/ui";
import { useI18n } from "../i18n";
import NotFound from "./NotFound";

function formatLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, pick } = useI18n();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setRecipe(null);
    setNotFound(false);
    api
      .get<{ recipe: Recipe }>(`/api/recipes/${id}`)
      .then((d) => setRecipe(d.recipe))
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) return <NotFound />;
  if (!recipe) return <Spinner />;

  const ingredients = formatLines(pick(recipe, "ingredients"));
  const ingredientColumns = chunk(ingredients, 8);
  const steps = formatLines(pick(recipe, "steps"));

  return (
    <div className="mx-auto max-w-4xl">
      <section className="mb-16 grid items-center gap-8 py-6 md:grid-cols-2 md:gap-14">
        <CourseImage
          imageUrl={recipe.imageUrl}
          color={recipe.color}
          alt={pick(recipe, "title")}
          className="group aspect-[4/3] md:aspect-[4/5]"
        />
        <div>
          {recipe.course && (
            <LinkedCourseLink
              courseId={recipe.course.id}
              courseTitle={pick(recipe.course, "title")}
              className="mb-4 tracking-[0.3em]"
            />
          )}
          <h1 className="mb-5 font-display text-4xl font-medium leading-[1.1] text-ink sm:text-5xl">
            {pick(recipe, "title")}
          </h1>
          <p className="text-[17px] font-light leading-relaxed text-stone-600">
            {pick(recipe, "description")}
          </p>
        </div>
      </section>

      <section className="pb-10">
        <h2 className="mb-2 text-center font-display text-3xl font-medium text-ink">
          {t("ingredients")}
        </h2>
        <OrnamentalDivider className="mb-8 mt-4" />
        <div className="mx-auto flex max-w-4xl flex-row flex-wrap justify-center gap-x-12 gap-y-8">
          {ingredientColumns.map((column, colIndex) => (
            <ul
              key={colIndex}
              className="min-w-[10rem] flex-1 space-y-2 text-[17px] font-light leading-relaxed text-stone-600 sm:max-w-xs"
            >
              {column.map((line, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay-500" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      <section className="pb-10">
        <h2 className="mb-2 text-center font-display text-3xl font-medium text-ink">{t("steps")}</h2>
        <OrnamentalDivider className="mb-8 mt-4" />
        <ol className="mx-auto max-w-xl space-y-5 text-[17px] font-light leading-relaxed text-stone-600">
          {steps.map((line, i) => (
            <li key={i} className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-clay-100 text-sm font-semibold text-clay-700">
                {i + 1}
              </span>
              <span className="pt-0.5">{line.replace(/^\d+\.\s*/, "")}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
