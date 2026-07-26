import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Course, type Slot } from "../api";
import { BrandHeading } from "../components/BrandHeading";
import DateSlider from "../components/DateSlider";
import { toDateKey } from "../components/SlotCalendar";
import { Button, CourseImage, ErrorNote, OrnamentalDivider, Spinner } from "../components/ui";
import { useI18n } from "../i18n";
import { withViewTransition } from "../viewTransition";

function isOpen(slot: Slot) {
  return slot.capacity - slot.booked > 0;
}

export default function Home() {
  const { t, pick, lang } = useI18n();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoadError(false);
    setCourses(null);
    setSlots(null);
    Promise.all([
      api.get<{ courses: Course[] }>("/api/courses"),
      api.get<{ slots: Slot[] }>("/api/slots"),
    ])
      .then(([coursesRes, slotsRes]) => {
        setCourses(coursesRes.courses);
        setSlots(slotsRes.slots);
      })
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openSlots = useMemo(() => (slots ?? []).filter(isOpen), [slots]);

  const upcomingDates = useMemo(() => {
    const dates = new Set<string>();
    for (const slot of openSlots) dates.add(toDateKey(slot.startsAt));
    return Array.from(dates).sort();
  }, [openSlots]);

  const courseIdsOnDate = useMemo(() => {
    if (!selectedDate) return null;
    const ids = new Set<string>();
    for (const slot of openSlots) {
      if (toDateKey(slot.startsAt) === selectedDate) ids.add(slot.courseId);
    }
    return ids;
  }, [openSlots, selectedDate]);

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    if (!courseIdsOnDate) return courses;
    return courses.filter((course) => courseIdsOnDate.has(course.id));
  }, [courses, courseIdsOnDate]);

  const courseLink = (courseId: string) =>
    selectedDate ? `/courses/${courseId}?date=${selectedDate}` : `/courses/${courseId}`;

  const handleSelectDate = useCallback((date: string | null) => {
    if (date === selectedDate) return;
    withViewTransition(() => setSelectedDate(date));
  }, [selectedDate]);

  return (
    <div>
      <section className="mx-auto max-w-3xl pt-0 pb-10 text-center sm:pb-14">
        <BrandHeading
          before={t("taglineBefore")}
          name={t("taglineName")}
          after={t("taglineAfter")}
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
      ) : !courses || !slots ? (
        <Spinner />
      ) : (
        <>
          {upcomingDates.length > 0 && (
            <div className="mb-10 px-1">
              <DateSlider
                dates={upcomingDates}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                lang={lang}
                allLabel={t("allDates")}
              />
            </div>
          )}

          <div className="home-courses-transition">
            {filteredCourses.length === 0 ? (
              <p className="pb-10 text-center font-light text-stone-500">{t("noCoursesMatch")}</p>
            ) : (
              <section className="flex flex-col gap-5 pb-10 sm:grid sm:grid-cols-2 sm:gap-x-8 sm:gap-y-14 lg:grid-cols-3">
                {filteredCourses.map((course) => (
                  <Link
                    key={course.id}
                    to={courseLink(course.id)}
                    className="group flex gap-4 border-b border-stone-200/80 pb-5 last:border-b-0 last:pb-0 sm:block sm:border-b-0 sm:pb-0"
                  >
                    <CourseImage
                      imageUrl={course.imageUrl}
                      color={course.color}
                      alt={pick(course, "title")}
                      className="aspect-square w-[6.75rem] shrink-0 sm:mb-5 sm:aspect-[4/3] sm:w-full"
                    />
                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <h3 className="mb-1 font-display text-xl font-semibold leading-snug text-ink transition-colors group-hover:text-clay-700 sm:mb-2 sm:text-2xl">
                        {pick(course, "title")}
                      </h3>
                      <p className="mb-2 text-sm font-light leading-relaxed text-stone-500 line-clamp-2 sm:mb-4 sm:text-[15px]">
                        {pick(course, "description")}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500 sm:gap-4 sm:text-xs">
                        <span className="text-clay-700">
                          {course.customPrice ? t("contactForPrice") : `₪${course.price}`}
                        </span>
                        <span className="text-stone-300 sm:hidden" aria-hidden>
                          ·
                        </span>
                        <span className="hidden h-3 w-px bg-stone-300 sm:block" aria-hidden />
                        <span>
                          {course.durationMin} {t("minutes")}
                        </span>
                        <span className="hidden h-3 w-px bg-stone-300 sm:block" aria-hidden />
                        <span className="hidden sm:inline">
                          {t("upToPeople")} {course.maxParticipants} {t("people")}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
