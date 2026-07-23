import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Course, type Slot } from "../api";
import logo from "../assets/logo.png";
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
      <section className="mx-auto max-w-3xl pt-10 pb-10 text-center sm:pt-16 sm:pb-14">
        <h1 className="mb-6 font-display text-5xl font-medium leading-[1.08] text-ink sm:text-6xl">
          {t("taglineBefore")}
          {lang === "he" ? (
            <img
              src={logo}
              alt={t("taglineName")}
              className="mx-1 inline-block h-[1.9em] w-auto align-[-0.45em]"
            />
          ) : (
            <span className="font-hand text-[1.15em] font-semibold text-clay-700">
              {t("taglineName")}
            </span>
          )}
          {t("taglineAfter")}
        </h1>
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
              <section className="grid gap-x-8 gap-y-14 pb-10 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCourses.map((course) => (
                  <Link key={course.id} to={courseLink(course.id)} className="group block">
                    <CourseImage
                      imageUrl={course.imageUrl}
                      color={course.color}
                      alt={pick(course, "title")}
                      className="mb-5 aspect-[4/3]"
                    />
                    <h3 className="mb-2 font-display text-2xl font-semibold leading-snug text-ink transition-colors group-hover:text-clay-700">
                      {pick(course, "title")}
                    </h3>
                    <p className="mb-4 text-[15px] font-light leading-relaxed text-stone-500 line-clamp-2">
                      {pick(course, "description")}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                      <span className="text-clay-700">
                        {course.customPrice ? t("contactForPrice") : `₪${course.price}`}
                      </span>
                      <span className="h-3 w-px bg-stone-300" />
                      <span>
                        {course.durationMin} {t("minutes")}
                      </span>
                      <span className="h-3 w-px bg-stone-300" />
                      <span>
                        {t("upToPeople")} {course.maxParticipants} {t("people")}
                      </span>
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
