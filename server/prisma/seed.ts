import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ADMIN_EMAIL, ADMIN_INITIAL_PASSWORD } from "../src/adminConfig.js";
import { seedAboutContent } from "../src/about.js";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.deleteMany({ where: { email: "admin@example.com" } });

  const passwordHash = await bcrypt.hash(ADMIN_INITIAL_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { email: ADMIN_EMAIL, name: "Admin", role: "admin", mustSetPassword: false },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      name: "Admin",
      role: "admin",
      mustSetPassword: false,
    },
  });

  console.log(`Admin user: ${admin.email} (password: ${ADMIN_INITIAL_PASSWORD})`);

  if ((await prisma.course.count()) > 0) {
    console.log("Courses already exist, skipping sample course data.");
  } else {
    const courseSeedData = [
    {
      titleEn: "Beginner Cooking Course",
      titleHe: "סדנת בישול למתחילים",
      descriptionEn:
        "Learn the basics of home cooking in a fun, hands-on session. Perfect for beginners — you will leave with three dishes you can make on your own.",
      descriptionHe:
        "לומדים את יסודות הבישול הביתי בסדנה מהנה ומעשית. מושלם למתחילים — תצאו עם שלוש מנות שתוכלו להכין בעצמכם.",
      price: 180,
      durationMin: 120,
      maxParticipants: 8,
      color: "amber",
      imageUrl:
        "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=900&q=80&auto=format&fit=crop",
    },
    {
      titleEn: "Sourdough Baking Class",
      titleHe: "שיעור אפיית מחמצת",
      descriptionEn:
        "From starter to crusty loaf — everything you need to bake beautiful sourdough bread at home.",
      descriptionHe:
        "מהמחמצת ועד הכיכר הפריכה — כל מה שצריך כדי לאפות לחם מחמצת מושלם בבית.",
      price: 220,
      durationMin: 180,
      maxParticipants: 6,
      color: "rose",
      imageUrl:
        "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=900&q=80&auto=format&fit=crop",
    },
    {
      titleEn: "Private Consultation",
      titleHe: "פגישת ייעוץ אישית",
      descriptionEn:
        "A one-on-one session tailored to your goals. Bring your questions and get personal guidance.",
      descriptionHe:
        "מפגש אישי אחד על אחד המותאם למטרות שלך. מגיעים עם שאלות ומקבלים ליווי אישי.",
      price: 150,
      durationMin: 60,
      maxParticipants: 1,
      color: "teal",
      imageUrl:
        "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=900&q=80&auto=format&fit=crop",
    },
  ];

    const courses = await Promise.all(
      courseSeedData.map((data) => prisma.course.create({ data }))
    );

    // Sample future slots: next 14 days, morning + evening options.
    const now = new Date();
    for (const [i, course] of courses.entries()) {
      const slotCapacity = courseSeedData[i].maxParticipants;
      for (let d = 1; d <= 14; d += 2 + i) {
        const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
        for (const hour of [10, 18]) {
          const startsAt = new Date(day);
          startsAt.setHours(hour, 0, 0, 0);
          const endsAt = new Date(startsAt.getTime() + course.durationMin * 60 * 1000);
          await prisma.timeSlot.create({
            data: { courseId: course.id, startsAt, endsAt, capacity: slotCapacity },
          });
        }
      }
    }

    console.log(`Seeded ${courses.length} courses with sample time slots.`);
  }

  if ((await prisma.recipe.count()) === 0) {
    const courses = await prisma.course.findMany({ orderBy: { createdAt: "asc" }, take: 3 });
    const recipeSeedData = [
      {
        titleEn: "Classic Challah",
        titleHe: "חלה קלאסית",
        descriptionEn: "A soft, golden braided bread — perfect for Shabbat or any special table.",
        descriptionHe: "חלה רכה וזהובה — מושלמת לשבת או לכל שולחן מיוחד.",
        ingredientsEn:
          "500g bread flour\n7g dry yeast\n60g sugar\n10g salt\n2 eggs + 1 for glaze\n80ml vegetable oil\n200ml warm water\nSesame seeds (optional)",
        ingredientsHe:
          "500 גרם קמח לחם\n7 גרם שמרים יבשים\n60 גרם סוכר\n10 גרם מלח\n2 ביצים + 1 לציפוי\n80 מ\"ל שמן צמחי\n200 מ\"ל מים פושרים\nשומשום (לא חובה)",
        stepsEn:
          "1. Mix warm water, yeast, and a pinch of sugar. Let sit 10 minutes until foamy.\n2. Combine flour, remaining sugar, and salt. Add eggs, oil, and yeast mixture.\n3. Knead 8–10 minutes until smooth and elastic.\n4. Cover and rise 1–1.5 hours until doubled.\n5. Divide into 3 strands, braid, and place on a lined tray.\n6. Rise 30 minutes. Brush with beaten egg and sprinkle sesame seeds.\n7. Bake at 180°C for 25–30 minutes until deep golden.",
        stepsHe:
          "1. מערבבים מים פושרים, שמרים וקורט סוכר. ממתינים 10 דקות עד שמתקצף.\n2. מערבבים קמח, שאר הסוכר ומלח. מוסיפים ביצים, שמן ותערובת השמרים.\n3. לשים 8–10 דקות עד שהבצק חלק ואלסטי.\n4. מכסים וממתינים להתפחה של שעה–שעה וחצי.\n5. מחלקים ל-3 גדילים, קושרים חלה ומניחים על תבנית.\n6. מתפחים 30 דקות. מורחים ביצה טרופה ומפזרים שומשום.\n7. אופים ב-180 מעלות 25–30 דקות עד צבע זהוב עמוק.",
        color: "amber",
        imageUrl:
          "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?w=900&q=80&auto=format&fit=crop",
        courseId: courses[1]?.id ?? null,
      },
      {
        titleEn: "Mediterranean Mezze Platter",
        titleHe: "מגש מזה ים תיכוני",
        descriptionEn: "Hummus, roasted vegetables, and fresh salads — a colourful spread for sharing.",
        descriptionHe: "חומוס, ירקות קלויים וסלטים טריים — מגש צבעוני לשיתוף.",
        ingredientsEn:
          "1 can chickpeas\n3 tbsp tahini\n2 cloves garlic\nJuice of 1 lemon\nOlive oil\nCherry tomatoes\nCucumber\nRed onion\nFresh parsley\nPita bread",
        ingredientsHe:
          "1 קופסת חומוס\n3 כפות טחינה\n2 שיני שום\nמיץ לימון 1\nשמן זית\nעגבניות שרי\nמלפפון\nבצל סגול\nפטרוזיליה טרייה\nפיתות",
        stepsEn:
          "1. Blend chickpeas, tahini, garlic, lemon juice, and olive oil until smooth.\n2. Season hummus with salt and a drizzle of olive oil.\n3. Dice cucumber, halve tomatoes, and thinly slice onion.\n4. Toss vegetables with olive oil, lemon, salt, and parsley.\n5. Arrange hummus in the centre of a platter, surround with salads.\n6. Serve warm pita on the side.",
        stepsHe:
          "1. מטחנים חומוס, טחינה, שום, מיץ לימון ושמן זית עד למרקם חלק.\n2. מתבלים את החומוס במלח ושמן זית.\n3. חותכים מלפפון לקוביות, חוצים עגבניות ופורסים בצל דק.\n4. מערבבים ירקות עם שמן זית, לימון, מלח ופטרוזיליה.\n5. מניחים חומוס במרכז המגש ומקיפים בסלטים.\n6. מגישים עם פיתות חמות.",
        color: "teal",
        imageUrl:
          "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=900&q=80&auto=format&fit=crop",
        courseId: courses[0]?.id ?? null,
      },
      {
        titleEn: "Weeknight Pasta Aglio e Olio",
        titleHe: "פסטה אג'יו א אוליו",
        descriptionEn: "Five ingredients, twenty minutes — garlic, olive oil, and chili in perfect harmony.",
        descriptionHe: "חמישה מרכיבים, עשרים דקות — שום, שמן זית וצ'ילי בהרמוניה מושלמת.",
        ingredientsEn:
          "400g spaghetti\n6 cloves garlic, thinly sliced\n1/2 tsp red chili flakes\n80ml extra virgin olive oil\nFresh parsley\nSalt",
        ingredientsHe:
          "400 גרם ספגטי\n6 שיני שום, פרוסות דקות\nחצי כפית פלפל צ'ילי\n80 מ\"ל שמן זית כתית\nפטרוזיליה טרייה\nמלח",
        stepsEn:
          "1. Cook pasta in well-salted boiling water until al dente. Reserve 1 cup pasta water.\n2. Warm olive oil over medium-low heat. Add garlic and chili, cook until fragrant (not brown).\n3. Add drained pasta to the pan with a splash of pasta water.\n4. Toss vigorously 1–2 minutes until glossy and emulsified.\n5. Finish with parsley and a drizzle of olive oil. Serve immediately.",
        stepsHe:
          "1. מבשלים פסטה במים רותחים מומלחים עד al dente. שומרים כוס ממי הבישול.\n2. מחממים שמן זית על אש בינונית-נמוכה. מוסיפים שום וצ'ילי עד שמסריחים (לא משחימים).\n3. מוסיפים פסטה מסוננת למחבת עם מעט מי בישול.\n4. מערבבים באנרגיה דקה-שתיים עד למרקם מבריק.\n5. מסיימים בפטרוזיליה ושמן זית. מגישים מיד.",
        color: "rose",
        imageUrl:
          "https://images.unsplash.com/photo-1473093290773-02a1b8a4e6b9?w=900&q=80&auto=format&fit=crop",
      },
    ];

    await Promise.all(recipeSeedData.map((data) => prisma.recipe.create({ data })));
    console.log(`Seeded ${recipeSeedData.length} recipes.`);
  }

  await seedAboutContent();
  console.log("About page content ready.");

  if ((await prisma.shopLink.count()) === 0) {
    const categoryEn = "Kitchen Accessories";
    const categoryHe = "אביזרי מטבח";
    const shopSeedData = [
      {
        titleEn: "Scoopi 6-in-1 Machine — Black",
        titleHe: "Scoopi 6 ב-1 — צבע שחור",
        productUrl:
          "https://batshi-home.co.il/product/%d7%9e%d7%9b%d7%95%d7%a0%d7%aa-%d7%92%d7%9c%d7%99%d7%93%d7%94-%d7%91%d7%a8%d7%93-%d7%95%d7%9e%d7%a9%d7%a7%d7%90%d7%95%d7%aa-%d7%a7%d7%a4%d7%95%d7%90%d7%99%d7%9d-scoopi-%d7%a9%d7%97%d7%95%d7%a8/",
        imageUrl: "https://batshi-home.co.il/wp-content/uploads/2026/07/0-7.jpg",
        price: 999,
        sortOrder: 0,
      },
      {
        titleEn: "Glass Storage Jar 2000ml SEAL IT",
        titleHe: 'איחסונית זכוכית 2000 מ"ל SEAL IT',
        productUrl:
          "https://batshi-home.co.il/product/%d7%90%d7%99%d7%97%d7%a1%d7%95%d7%a0%d7%99%d7%aa-%d7%96%d7%9b%d7%95%d7%9b%d7%99%d7%aa-2000-%d7%9e%d7%9c-%d7%9e%d7%9b%d7%a1%d7%94-%d7%a2%d7%a5-seal-it-%d7%9e%d7%91%d7%99%d7%aa-food-appeal/",
        imageUrl: "https://batshi-home.co.il/wp-content/uploads/2026/05/2088.jpg",
        price: 29,
        sortOrder: 1,
      },
      {
        titleEn: "Glass Storage Jar 2800ml SEAL IT",
        titleHe: 'איחסונית זכוכית 2800 מ"ל SEAL IT',
        productUrl:
          "https://batshi-home.co.il/product/%d7%90%d7%99%d7%97%d7%a1%d7%95%d7%a0%d7%99%d7%aa-%d7%96%d7%9b%d7%95%d7%9b%d7%99%d7%aa-2800-%d7%9e%d7%9c-%d7%9e%d7%9b%d7%a1%d7%94-%d7%a2%d7%a5-seal-it-%d7%9e%d7%91%d7%99%d7%aa-food-appeal/",
        imageUrl: "https://batshi-home.co.il/wp-content/uploads/2026/05/2800.jpg",
        price: 39,
        sortOrder: 2,
      },
      {
        titleEn: "Glass Storage Jar 260ml SEAL IT",
        titleHe: 'איחסונית זכוכית 260 מ"ל SEAL IT',
        productUrl:
          "https://batshi-home.co.il/product/%d7%90%d7%99%d7%97%d7%a1%d7%95%d7%a0%d7%99%d7%aa-%d7%96%d7%9b%d7%95%d7%9b%d7%99%d7%aa-260-%d7%9e%d7%9c-%d7%9e%d7%9b%d7%a1%d7%94-%d7%a2%d7%a5-%d7%9e%d7%aa%d7%91%d7%a8%d7%92-seal-it-%d7%9e%d7%91%d7%99/",
        imageUrl: "https://batshi-home.co.il/wp-content/uploads/2026/05/260.jpg",
        price: 15,
        sortOrder: 3,
      },
      {
        titleEn: "Glass Storage Jar 600ml SEAL IT",
        titleHe: 'איחסונית זכוכית 600 מ"ל SEAL IT',
        productUrl:
          "https://batshi-home.co.il/product/%d7%90%d7%99%d7%97%d7%a1%d7%95%d7%a0%d7%99%d7%aa-%d7%96%d7%9b%d7%95%d7%9b%d7%99%d7%aa-600-%d7%9e%d7%9c-%d7%9e%d7%9b%d7%a1%d7%94-%d7%a2%d7%a5-%d7%9e%d7%aa%d7%91%d7%a8%d7%92-seal-it-%d7%9e%d7%91%d7%99/",
        imageUrl: "https://batshi-home.co.il/wp-content/uploads/2026/05/0-4.jpg",
        price: 25,
        sortOrder: 4,
      },
      {
        titleEn: "Acrylic Organizer with Lid",
        titleHe: "ארגונית אקריל עם מכסה",
        productUrl:
          "https://batshi-home.co.il/product/%d7%90%d7%a8%d7%92%d7%95%d7%a0%d7%99%d7%aa-%d7%90%d7%a7%d7%a8%d7%99%d7%9c-%d7%9e%d7%9b%d7%a1%d7%94-30-30-5-10-5/",
        imageUrl: "https://batshi-home.co.il/wp-content/uploads/2026/05/5656-1.jpeg",
        price: 39,
        sortOrder: 5,
      },
      {
        titleEn: "Acacia Wood Cutting Board",
        titleHe: "בוצ'ר עץ ACACIA",
        productUrl:
          "https://batshi-home.co.il/product/%d7%91%d7%95%d7%a6%d7%a8-%d7%a2%d7%a5-%d7%9c%d7%97%d7%99%d7%aa%d7%95%d7%9a-%d7%94%d7%92%d7%a9%d7%94-%d7%99%d7%95%d7%a7%d7%a8%d7%aa%d7%99-acacia-%d7%9e%d7%91%d7%99%d7%aa-%d7%a4%d7%95%d7%93/",
        imageUrl:
          "https://batshi-home.co.il/wp-content/uploads/2026/06/WhatsApp-Image-2026-06-22-at-14.03.00.jpeg",
        price: 69,
        sortOrder: 6,
      },
      {
        titleEn: "Solid Birch Wood Cutting Board",
        titleHe: "בוצ'ר עץ שיטה מלא",
        productUrl:
          "https://batshi-home.co.il/product/%d7%91%d7%95%d7%a6%d7%b3%d7%a8-%d7%a2%d7%a5-%d7%a9%d7%99%d7%98%d7%94-%d7%90%d7%9e%d7%99%d7%aa%d7%99-%d7%9e%d7%9c%d7%90-%d7%95%d7%a2%d7%91%d7%94-%d7%91%d7%9e%d7%99%d7%95%d7%97%d7%93-%d7%91%d7%9e%d7%99%d7%95%d7%97%d7%93/",
        imageUrl:
          "https://batshi-home.co.il/wp-content/uploads/2026/07/WhatsApp-Image-2026-07-13-at-15.42.16.jpeg",
        price: 99,
        sortOrder: 7,
      },
      {
        titleEn: "Hydro Twist Bottle 600ml — Pink",
        titleHe: 'בקבוק Hydro Twist 600 מ"ל — ורוד',
        productUrl:
          "https://batshi-home.co.il/product/%d7%91%d7%a7%d7%91%d7%95%d7%a7-600-%d7%9e%d7%9c-hydro-twist-%d7%a6%d7%91%d7%a2-%d7%95%d7%a8%d7%95%d7%93-smash-by-food-appeal/",
        imageUrl:
          "https://batshi-home.co.il/wp-content/uploads/2026/07/7290122470888_1408202514052613031.jpg",
        price: 10,
        sortOrder: 8,
      },
      {
        titleEn: "Hydro Twist Bottle 600ml — Mint",
        titleHe: 'בקבוק Hydro Twist 600 מ"ל — מנטה',
        productUrl:
          "https://batshi-home.co.il/product/%d7%91%d7%a7%d7%91%d7%95%d7%a7-600-%d7%9e%d7%9c-hydro-twist-%d7%a6%d7%91%d7%a2-%d7%9e%d7%a0%d7%98%d7%94-%d7%99%d7%a8%d7%95%d7%a7-food-appeal-by-smash/",
        imageUrl:
          "https://batshi-home.co.il/wp-content/uploads/2026/07/7290122470895_1408202514023913035.jpg",
        price: 10,
        sortOrder: 9,
      },
    ];

    await Promise.all(
      shopSeedData.map((data) =>
        prisma.shopLink.create({
          data: {
            ...data,
            categoryEn,
            categoryHe,
            shopName: "Batshi Home",
            utmSource: "shoshi_halperin",
            utmMedium: "referral",
            utmCampaign: "kitchen_accessories",
          },
        })
      )
    );
    console.log(`Seeded ${shopSeedData.length} shop links.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
