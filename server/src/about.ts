import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export interface AboutContentData {
  titleEn: string;
  titleHe: string;
  introEn: string;
  introHe: string;
  paragraphsEn: string[];
  paragraphsHe: string[];
}

export const DEFAULT_ABOUT_CONTENT: AboutContentData = {
  titleEn: "About me",
  titleHe: "קצת עליי",
  introEn: "Home cooking, shared with warmth — one workshop at a time.",
  introHe: "בישול ביתי, בחום — סדנה אחת בכל פעם.",
  paragraphsEn: [
    "I'm Shoshi Halperin, and I believe the best meals start with confidence in your own kitchen. For years I've been teaching people of all levels to cook with joy — from first-time beginners to home cooks who want to sharpen their skills.",
    "My workshops are small, hands-on, and unhurried. We cook together, taste as we go, and leave plenty of room for questions. Every session is designed so you can recreate the dishes at home, using ingredients you already know and love.",
    "Whether you're learning the basics, diving into sourdough, or looking for personal guidance, I'd love to cook with you. Browse the courses below and pick a time that works for you.",
  ],
  paragraphsHe: [
    "אני שושי הלפרין, ואני מאמינה שהארוחות הכי טובות מתחילות בביטחון במטבח שלכם. כבר שנים אני מלמדת אנשים בכל הרמות לבשל מתוך הנאה — ממתחילים לגמרי ועד מבשלים ביתיים שרוצים לחדד את הכישורים.",
    "הסדנאות שלי קטנות, מעשיות וללא לחץ. אנחנו מבשלים יחד, טועמים תוך כדי, ומשאירים הרבה מקום לשאלות. כל מפגש בנוי כך שתוכלו לשחזר את המנות בבית, עם מרכיבים שאתם כבר מכירים ואוהבים.",
    "בין אם אתם לומדים את היסודות, צוללים לעולם המחמצת, או מחפשים ליווי אישי — אשמח לבשל איתכם. עיינו בסדנאות ובחרו מועד שנוח לכם.",
  ],
};

function toPrismaData(data: AboutContentData): Omit<Prisma.AboutContentCreateInput, "id"> {
  return {
    titleEn: data.titleEn,
    titleHe: data.titleHe,
    introEn: data.introEn,
    introHe: data.introHe,
    paragraphsEn: data.paragraphsEn as Prisma.InputJsonValue,
    paragraphsHe: data.paragraphsHe as Prisma.InputJsonValue,
  };
}

export function parseAboutContent(record: {
  id: string;
  titleEn: string;
  titleHe: string;
  introEn: string;
  introHe: string;
  paragraphsEn: unknown;
  paragraphsHe: unknown;
  updatedAt: Date;
}) {
  return {
    id: record.id,
    titleEn: record.titleEn,
    titleHe: record.titleHe,
    introEn: record.introEn,
    introHe: record.introHe,
    paragraphsEn: record.paragraphsEn as string[],
    paragraphsHe: record.paragraphsHe as string[],
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function getAboutContent() {
  const existing = await prisma.aboutContent.findUnique({ where: { id: "default" } });
  if (existing) return parseAboutContent(existing);

  const created = await prisma.aboutContent.create({
    data: { id: "default", ...toPrismaData(DEFAULT_ABOUT_CONTENT) },
  });
  return parseAboutContent(created);
}

export async function saveAboutContent(data: AboutContentData) {
  const saved = await prisma.aboutContent.upsert({
    where: { id: "default" },
    create: { id: "default", ...toPrismaData(data) },
    update: toPrismaData(data),
  });
  return parseAboutContent(saved);
}

export async function seedAboutContent() {
  const saved = await prisma.aboutContent.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", ...toPrismaData(DEFAULT_ABOUT_CONTENT) },
  });
  return parseAboutContent(saved);
}
