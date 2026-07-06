import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      passwordHash: await bcrypt.hash("admin123", 10),
      name: "Admin",
      role: "admin",
    },
  });
  console.log(`Admin user: ${admin.email} (password: admin123)`);

  if ((await prisma.course.count()) > 0) {
    console.log("Courses already exist, skipping sample data.");
    return;
  }

  const courseSeedData = [
    {
      titleEn: "Beginner Cooking Workshop",
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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
