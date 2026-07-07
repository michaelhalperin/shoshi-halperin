import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const dictionaries = {
  en: {
    appName: "Shoshi Halperin",
    tagline: "Learn how to cook, at a time that suits you",
    heroText: "Browse our courses and book your spot in just a few clicks.",
    courses: "Courses",
    recipes: "Recipes",
    gallery: "Gallery",
    galleryTitle: "Moments from the kitchen",
    galleryHero: "A glimpse of workshops, dishes, and the joy of cooking together.",
    noGallery: "No photos yet. Check back soon!",
    galleryImageAlt: "Workshop photo",
    closeLightbox: "Close",
    previousImage: "Previous image",
    nextImage: "Next image",
    image: "Photo",
    uploadImage: "Upload photo",
    replaceImage: "Replace photo",
    removeImage: "Remove photo",
    confirmRemoveImage: "Remove this photo? You can upload a new one anytime.",
    uploading: "Uploading…",
    manageGallery: "Gallery",
    noGalleryImages: "No gallery photos yet. Upload your first image.",
    uploadGalleryImage: "Upload photos",
    recipesTitle: "Recipes to take home",
    recipesHero: "Clear, tested recipes from our workshops — cook them again anytime.",
    noRecipes: "No recipes published yet. Check back soon!",
    ingredients: "Ingredients",
    steps: "Steps",
    linkedCourse: "From workshop",
    viewRecipe: "View recipe",
    admin: "Admin",
    login: "Log in",
    logout: "Log out",
    hello: "Hello",
    email: "Email",
    emailOptional: "Email (optional)",
    password: "Password",
    name: "Full name",
    phone: "Phone",
    loginTitle: "Admin login",
    minutes: "min",
    price: "Price",
    duration: "Duration",
    maxParticipants: "Max participants",
    upToPeople: "Up to",
    people: "people",
    viewSlots: "View available times",
    availableTimes: "Available times",
    pickDate: "When",
    pickTime: "Time",
    dateTimePlaceholder: "Pick date & time",
    prevMonth: "Previous month",
    nextMonth: "Next month",
    allDates: "All",
    clearFilter: "Show all courses",
    noCoursesMatch: "No courses match this time. Try another date.",
    noSlots: "No upcoming times for this course yet. Check back soon!",
    noSlotsOnDay: "No times on this day.",
    spotsLeft: "spots left",
    full: "Full",
    book: "Book",
    bookNow: "Book now",
    bookingFormTitle: "Reserve your spot",
    bookingFormHint: "Leave your details and your spot is saved — no account needed.",
    bookedSuccess: "Your spot is booked! See you there.",
    cancelled: "Cancelled",
    confirmed: "Confirmed",
    cancel: "Cancel",
    cancelBooking: "Cancel booking",
    confirmCancel: "Cancel this booking?",
    addToCalendar: "Add to calendar",
    downloadIcs: "Download .ics",
    loading: "Loading…",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    confirmDelete: "Delete this? This cannot be undone.",
    dashboard: "Dashboard",
    manageCourses: "Courses",
    manageRecipes: "Recipes",
    manageSlots: "Time Slots",
    manageBookings: "Bookings",
    statCourses: "Active courses",
    statRecipes: "Active recipes",
    statUpcoming: "Upcoming bookings",
    statTotal: "Total bookings",
    newCourse: "New course",
    newRecipe: "New recipe",
    titleEn: "Title (English)",
    titleHe: "Title (Hebrew)",
    descriptionEn: "Description (English)",
    descriptionHe: "Description (Hebrew)",
    ingredientsEn: "Ingredients (English)",
    ingredientsHe: "Ingredients (Hebrew)",
    stepsEn: "Steps (English)",
    stepsHe: "Steps (Hebrew)",
    addIngredient: "Add ingredient",
    addStep: "Add step",
    removeItem: "Remove",
    ingredientPlaceholder: "e.g. 2 cups flour",
    stepPlaceholder: "Describe this step…",
    linkedCourseOptional: "Linked course (optional)",
    noLinkedCourse: "None",
    active: "Active",
    inactive: "Hidden",
    color: "Card color",
    imageUrl: "Image URL (optional)",
    newSlot: "New time slot",
    course: "Course",
    startTime: "Start time",
    endTime: "End time",
    capacity: "Capacity",
    bookedCount: "Booked",
    allCourses: "All courses",
    student: "Student",
    when: "When",
    status: "Status",
    footer: "Book your next course today.",
    about: "About",
    aboutTitle: "About me",
    aboutIntro: "Home cooking, shared with warmth — one workshop at a time.",
    aboutPhotoAlt: "Shoshi Halperin in the kitchen",
    aboutP1:
      "I'm Shoshi Halperin, and I believe the best meals start with confidence in your own kitchen. For years I've been teaching people of all levels to cook with joy — from first-time beginners to home cooks who want to sharpen their skills.",
    aboutP2:
      "My workshops are small, hands-on, and unhurried. We cook together, taste as we go, and leave plenty of room for questions. Every session is designed so you can recreate the dishes at home, using ingredients you already know and love.",
    aboutP3:
      "Whether you're learning the basics, diving into sourdough, or looking for personal guidance, I'd love to cook with you. Browse the courses below and pick a time that works for you.",
    aboutHighlightsTitle: "What to expect",
    aboutHighlight1Title: "Small groups",
    aboutHighlight1Text: "Intimate sessions so everyone gets personal attention and time at the stove.",
    aboutHighlight2Title: "Hands-on learning",
    aboutHighlight2Text: "You cook — not just watch. Every class is practical, relaxed, and full of tasting.",
    aboutHighlight3Title: "Take it home",
    aboutHighlight3Text: "Clear recipes and techniques you can repeat on your own, long after the workshop ends.",
    aboutCta: "Ready to get cooking?",
    aboutFollow: "Follow on Instagram",
    errorGeneric: "Something went wrong. Please try again.",
    notFoundTitle: "Page not found",
    notFoundMessage: "The page you're looking for doesn't exist or may have moved.",
    notFoundBackHome: "Back to home",
    switchLang: "עברית",
    openMenu: "Open menu",
    closeMenu: "Close menu",
  },
  he: {
    appName: "שושי הלפרין",
    tagline: "ללמוד לבשל, בזמן שנוח לך",
    heroText: "מצאו סדנה שמתאים לכם וקבעו מקום בכמה לחיצות.",
    courses: "סדנאות",
    recipes: "מתכונים",
    gallery: "גלריה",
    galleryTitle: "רגעים מהמטבח",
    galleryHero: "מבט קטן לסדנאות, למנות ולשמחה של בישול יחד.",
    noGallery: "אין עדיין תמונות. כדאי לבדוק שוב בקרוב!",
    galleryImageAlt: "תמונה מהסדנה",
    closeLightbox: "סגירה",
    previousImage: "תמונה קודמת",
    nextImage: "תמונה הבאה",
    image: "תמונה",
    uploadImage: "העלאת תמונה",
    replaceImage: "החלפת תמונה",
    removeImage: "הסרת תמונה",
    confirmRemoveImage: "להסיר את התמונה? אפשר להעלות תמונה חדשה בכל עת.",
    uploading: "מעלה…",
    manageGallery: "גלריה",
    noGalleryImages: "אין עדיין תמונות בגלריה. העלו את התמונה הראשונה.",
    uploadGalleryImage: "העלאת תמונות",
    recipesTitle: "מתכונים לקחת הביתה",
    recipesHero: "מתכונים ברורים ומנוסים מהסדנאות שלנו — תוכלו לבשל אותם שוב בכל עת.",
    noRecipes: "אין עדיין מתכונים. כדאי לבדוק שוב בקרוב!",
    ingredients: "מרכיבים",
    steps: "הוראות הכנה",
    linkedCourse: "מהסדנה",
    viewRecipe: "למתכון",
    admin: "ניהול",
    login: "התחברות",
    logout: "התנתקות",
    hello: "שלום",
    email: "אימייל",
    emailOptional: "אימייל (לא חובה)",
    password: "סיסמה",
    name: "שם מלא",
    phone: "טלפון",
    loginTitle: "כניסת מנהל",
    minutes: "דק'",
    price: "מחיר",
    duration: "משך",
    maxParticipants: "משתתפים מקסימום",
    upToPeople: "עד",
    people: "משתתפים",
    viewSlots: "לצפייה במועדים",
    availableTimes: "מועדים פנויים",
    pickDate: "מתי",
    pickTime: "שעה",
    dateTimePlaceholder: "בחרו תאריך ושעה",
    prevMonth: "חודש קודם",
    nextMonth: "חודש הבא",
    allDates: "הכל",
    clearFilter: "הצג את כל הסדנאות",
    noCoursesMatch: "אין סדנאות בזמן הזה. נסו תאריך אחר.",
    noSlots: "אין כרגע מועדים קרובים לסדנה הזה. כדאי לבדוק שוב בקרוב!",
    noSlotsOnDay: "אין מועדים ביום הזה.",
    spotsLeft: "מקומות נותרו",
    full: "מלא",
    book: "הזמנה",
    bookNow: "להזמין עכשיו",
    bookingFormTitle: "שמירת מקום",
    bookingFormHint: "משאירים פרטים והמקום שמור — בלי צורך בחשבון.",
    bookedSuccess: "המקום שלך שמור! נתראה שם.",
    cancelled: "בוטל",
    confirmed: "מאושר",
    cancel: "ביטול",
    cancelBooking: "ביטול הזמנה",
    confirmCancel: "לבטל את ההזמנה?",
    addToCalendar: "הוספה ליומן",
    downloadIcs: "הורדת .ics",
    loading: "טוען…",
    save: "שמירה",
    delete: "מחיקה",
    edit: "עריכה",
    confirmDelete: "למחוק? אי אפשר לשחזר אחר כך.",
    dashboard: "לוח בקרה",
    manageCourses: "סדנאות",
    manageRecipes: "מתכונים",
    manageSlots: "מועדים",
    manageBookings: "הזמנות",
    statCourses: "סדנאות פעילים",
    statRecipes: "מתכונים פעילים",
    statUpcoming: "הזמנות קרובות",
    statTotal: 'סה"כ הזמנות',
    newCourse: "סדנה חדשה",
    newRecipe: "מתכון חדש",
    titleEn: "כותרת (אנגלית)",
    titleHe: "כותרת (עברית)",
    descriptionEn: "תיאור (אנגלית)",
    descriptionHe: "תיאור (עברית)",
    ingredientsEn: "מרכיבים (אנגלית)",
    ingredientsHe: "מרכיבים (עברית)",
    stepsEn: "הוראות הכנה (אנגלית)",
    stepsHe: "הוראות הכנה (עברית)",
    addIngredient: "הוספת מרכיב",
    addStep: "הוספת שלב",
    removeItem: "הסרה",
    ingredientPlaceholder: "לדוגמה: 2 כוסות קמח",
    stepPlaceholder: "תיאור השלב…",
    linkedCourseOptional: "סדנה מקושרת (לא חובה)",
    noLinkedCourse: "ללא",
    active: "פעיל",
    inactive: "מוסתר",
    color: "צבע כרטיס",
    imageUrl: "קישור לתמונה (לא חובה)",
    newSlot: "מועד חדש",
    course: "סדנה",
    startTime: "שעת התחלה",
    endTime: "שעת סיום",
    capacity: "קיבולת",
    bookedCount: "הוזמנו",
    allCourses: "כל הסדנאות",
    student: "תלמיד/ה",
    when: "מתי",
    status: "סטטוס",
    footer: "קבעו את הסדנה הבאה שלכם עוד היום.",
    about: "אודות",
    aboutTitle: "קצת עליי",
    aboutIntro: "בישול ביתי, בחום — סדנה אחת בכל פעם.",
    aboutPhotoAlt: "שושי הלפרין במטבח",
    aboutP1:
      "אני שושי הלפרין, ואני מאמינה שהארוחות הכי טובות מתחילות בביטחון במטבח שלכם. כבר שנים אני מלמדת אנשים בכל הרמות לבשל מתוך הנאה — ממתחילים לגמרי ועד מבשלים ביתיים שרוצים לחדד את הכישורים.",
    aboutP2:
      "הסדנאות שלי קטנות, מעשיות וללא לחץ. אנחנו מבשלים יחד, טועמים תוך כדי, ומשאירים הרבה מקום לשאלות. כל מפגש בנוי כך שתוכלו לשחזר את המנות בבית, עם מרכיבים שאתם כבר מכירים ואוהבים.",
    aboutP3:
      "בין אם אתם לומדים את היסודות, צוללים לעולם המחמצת, או מחפשים ליווי אישי — אשמח לבשל איתכם. עיינו בסדנאות ובחרו מועד שנוח לכם.",
    aboutHighlightsTitle: "מה מחכה לכם",
    aboutHighlight1Title: "קבוצות קטנות",
    aboutHighlight1Text: "מפגשים אינטימיים שבהם לכל אחד ואחת יש תשומת לב אישית וזמן ליד הכיריים.",
    aboutHighlight2Title: "למידה מעשית",
    aboutHighlight2Text: "אתם מבשלים — לא רק צופים. כל שיעור מעשי, נינוח ומלא בטעימות.",
    aboutHighlight3Title: "לוקחים הביתה",
    aboutHighlight3Text: "מתכונים וטכניקות ברורות שתוכלו לחזור עליהן לבד, הרבה אחרי שהסדנה נגמרת.",
    aboutCta: "מוכנים להתחיל לבשל?",
    aboutFollow: "עקבו באינסטגרם",
    errorGeneric: "משהו השתבש. נסו שוב.",
    notFoundTitle: "הדף לא נמצא",
    notFoundMessage: "הדף שחיפשתם לא קיים או שהועבר למקום אחר.",
    notFoundBackHome: "חזרה לדף הבית",
    switchLang: "English",
    openMenu: "פתיחת תפריט",
    closeMenu: "סגירת תפריט",
  },
} as const;

export type Lang = keyof typeof dictionaries;
export type TKey = keyof (typeof dictionaries)["en"];

interface I18nContextValue {
  lang: Lang;
  t: (key: TKey) => string;
  setLang: (lang: Lang) => void;
  /** Pick the right language variant of a bilingual record field. */
  pick: (
    obj:
      | { titleEn: string; titleHe: string }
      | { descriptionEn: string; descriptionHe: string }
      | { ingredientsEn: string; ingredientsHe: string }
      | { stepsEn: string; stepsHe: string },
    field: "title" | "description" | "ingredients" | "steps"
  ) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() =>
    localStorage.getItem("lang") === "he" ? "he" : "en"
  );

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (l: Lang) => {
    localStorage.setItem("lang", l);
    setLangState(l);
  };

  const t = (key: TKey) => dictionaries[lang][key];
  const pick: I18nContextValue["pick"] = (obj, field) => {
    const record = obj as Record<string, string>;
    return record[field + (lang === "he" ? "He" : "En")];
  };

  return <I18nContext.Provider value={{ lang, t, setLang, pick }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export function formatDateTime(iso: string, lang: Lang) {
  return new Date(iso).toLocaleString(lang === "he" ? "he-IL" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso: string, lang: Lang) {
  return new Date(iso).toLocaleTimeString(lang === "he" ? "he-IL" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateChip(dateKey: string, lang: Lang) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(lang === "he" ? "he-IL" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatDateSlider(dateKey: string, lang: Lang) {
  const d = new Date(`${dateKey}T12:00:00`);
  const locale = lang === "he" ? "he-IL" : "en-GB";
  return {
    weekday: d.toLocaleDateString(locale, { weekday: "short" }),
    day: d.toLocaleDateString(locale, { day: "numeric" }),
    month: d.toLocaleDateString(locale, { month: "short" }),
  };
}
