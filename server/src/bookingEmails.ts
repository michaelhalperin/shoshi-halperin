import { sendBookingReminderEmail, sendThankYouEmail } from "./mail.js";
import { prisma } from "./prisma.js";

const HOUR_MS = 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

// Thank-you goes out the day after the workshop; older bookings are left alone so
// the first run after a deploy never mails a backlog.
const THANK_YOU_DELAY_MS = 18 * HOUR_MS;
const THANK_YOU_MAX_AGE_MS = 3 * 24 * HOUR_MS;

function toDetails(booking: {
  email: string | null;
  name: string;
  lang: string;
  slot: { startsAt: Date; endsAt: Date; course: { titleEn: string; titleHe: string } };
}) {
  return {
    to: booking.email!,
    name: booking.name,
    courseTitleEn: booking.slot.course.titleEn,
    courseTitleHe: booking.slot.course.titleHe,
    startsAt: booking.slot.startsAt,
    endsAt: booking.slot.endsAt,
    lang: booking.lang === "en" ? ("en" as const) : ("he" as const),
  };
}

export async function sendDueBookingEmails(now = new Date()) {
  const include = { slot: { include: { course: true } } };

  const reminders = await prisma.booking.findMany({
    where: {
      status: "confirmed",
      email: { not: null },
      reminderSentAt: null,
      slot: { startsAt: { gt: now, lte: new Date(now.getTime() + 24 * HOUR_MS) } },
    },
    include,
  });

  for (const booking of reminders) {
    // Booked less than a day ahead: the confirmation email already covers it.
    if (booking.createdAt.getTime() > booking.slot.startsAt.getTime() - 24 * HOUR_MS) {
      await prisma.booking.update({ where: { id: booking.id }, data: { reminderSentAt: now } });
      continue;
    }
    const sent = await sendBookingReminderEmail(toDetails(booking));
    if (sent) {
      await prisma.booking.update({ where: { id: booking.id }, data: { reminderSentAt: now } });
    }
  }

  const thankYous = await prisma.booking.findMany({
    where: {
      status: "confirmed",
      email: { not: null },
      thankYouSentAt: null,
      slot: {
        endsAt: {
          lte: new Date(now.getTime() - THANK_YOU_DELAY_MS),
          gt: new Date(now.getTime() - THANK_YOU_MAX_AGE_MS),
        },
      },
    },
    include,
  });

  for (const booking of thankYous) {
    const sent = await sendThankYouEmail(toDetails(booking));
    if (sent) {
      await prisma.booking.update({ where: { id: booking.id }, data: { thankYouSentAt: now } });
    }
  }
}

export function startBookingEmailScheduler() {
  const run = () =>
    sendDueBookingEmails().catch((err) => console.error("Booking email scheduler failed:", err));
  setTimeout(run, 30_000);
  setInterval(run, CHECK_INTERVAL_MS);
}
