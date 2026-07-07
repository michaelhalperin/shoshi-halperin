import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Recipe } from "../api";
import { CourseImage, LinkedCourseLink, OrnamentalDivider, Spinner } from "../components/ui";
import { useI18n } from "../i18n";

export default function Recipes() {
  const { t, pick } = useI18n();
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);

  useEffect(() => {
    api.get<{ recipes: Recipe[] }>("/api/recipes").then((d) => setRecipes(d.recipes));
  }, []);

  return (
    <div>
      <section className="mx-auto max-w-3xl pt-10 pb-10 text-center sm:pt-16 sm:pb-14">
        <h1 className="mb-6 font-display text-5xl font-medium leading-[1.08] text-ink sm:text-6xl">
          {t("recipesTitle")}
        </h1>
        <p className="mx-auto max-w-md text-lg font-light leading-relaxed text-stone-500">
          {t("recipesHero")}
        </p>
        <OrnamentalDivider className="mt-10" />
      </section>

      {!recipes ? (
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
