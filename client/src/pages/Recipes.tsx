import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Recipe } from "../api";
import { BrandHeading } from "../components/BrandHeading";
import { Button, CourseImage, ErrorNote, LinkedCourseLink, OrnamentalDivider, Spinner } from "../components/ui";
import { useI18n } from "../i18n";

export default function Recipes() {
  const { t, pick } = useI18n();
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const loadData = useCallback(() => {
    setLoadError(false);
    setRecipes(null);
    api
      .get<{ recipes: Recipe[] }>("/api/recipes")
      .then((d) => setRecipes(d.recipes))
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div>
      <section className="mx-auto max-w-3xl pt-10 pb-10 text-center sm:pt-16 sm:pb-14">
        <BrandHeading
          before={t("recipesTitleBefore")}
          name={t("recipesTitleName")}
          after={t("recipesTitleAfter")}
        />
        <OrnamentalDivider className="mt-10" />
      </section>

      {loadError ? (
        <div className="mx-auto max-w-md px-4 pb-10 text-center">
          <ErrorNote message={t("loadError")} />
          <Button className="mt-4" onClick={loadData}>
            {t("retry")}
          </Button>
        </div>
      ) : !recipes ? (
        <Spinner />
      ) : recipes.length === 0 ? (
        <p className="pb-10 text-center font-light text-stone-500">{t("noRecipes")}</p>
      ) : (
        <section className="grid gap-x-8 gap-y-14 pb-10 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <article key={recipe.id} className="group">
              <Link to={`/recipes/${recipe.id}`} className="block">
                <CourseImage
                  imageUrl={recipe.imageUrl}
                  color={recipe.color}
                  alt={pick(recipe, "title")}
                  className="mb-5 aspect-[4/3]"
                />
                <h3 className="mb-2 font-display text-2xl font-semibold leading-snug text-ink transition-colors group-hover:text-clay-700">
                  {pick(recipe, "title")}
                </h3>
                <p className="mb-4 text-[15px] font-light leading-relaxed text-stone-500 line-clamp-2">
                  {pick(recipe, "description")}
                </p>
              </Link>
              {recipe.course && (
                <LinkedCourseLink
                  courseId={recipe.course.id}
                  courseTitle={pick(recipe.course, "title")}
                />
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
