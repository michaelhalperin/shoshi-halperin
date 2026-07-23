import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function getFromAddress() {
  return process.env.RESEND_FROM ?? "Shoshi Halperin <onboarding@resend.dev>";
}

async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
  logLabel: string;
  devFallback?: string;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn(`RESEND_API_KEY not configured — ${options.logLabel} was not sent.`);
    if (process.env.NODE_ENV !== "production" && options.devFallback) {
      console.log(`${options.logLabel}: ${options.devFallback}`);
    }
    return false;
  }

  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to: [options.to],
    subject: options.subject,
    text: options.text,
    html: options.html,
  });

  if (error) {
    console.error(`Resend email error (${options.logLabel}):`, error);
    return false;
  }

  return true;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: "Reset your admin password",
    text: `Use this link to reset your password (valid for 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
    html: `<p>Use this link to reset your password (valid for 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
    logLabel: "password reset email",
    devFallback: resetUrl,
  });
}

export interface BookingEmailDetails {
  to: string;
  name: string;
  courseTitleEn: string;
  courseTitleHe: string;
  startsAt: Date;
  endsAt: Date;
  lang?: "en" | "he";
}

export interface BookingConfirmationDetails extends BookingEmailDetails {
  price: number;
  customPrice?: boolean;
  originalPrice?: number | null;
  finalPrice?: number | null;
  discountAmount?: number | null;
  couponCode?: string | null;
}

function formatBookingWhen(startsAt: Date, endsAt: Date, lang: "en" | "he") {
  const locale = lang === "he" ? "he-IL" : "en-GB";
  const date = startsAt.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const startTime = startsAt.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const endTime = endsAt.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  return { date, time: `${startTime}–${endTime}` };
}

function formatPrice(amount: number) {
  return `₪${amount.toFixed(0)}`;
}

export async function sendBookingConfirmationEmail(
  details: BookingConfirmationDetails
): Promise<boolean> {
  const lang = details.lang ?? "en";
  const courseTitle = lang === "he" ? details.courseTitleHe : details.courseTitleEn;
  const { date, time } = formatBookingWhen(details.startsAt, details.endsAt, lang);

  const paid = details.finalPrice ?? details.price;
  const hasDiscount =
    !details.customPrice &&
    details.couponCode &&
    details.originalPrice != null &&
    details.discountAmount != null &&
    details.finalPrice != null;

  const copy =
    lang === "he"
      ? {
          subject: `אישור הזמנה — ${courseTitle}`,
          greeting: `שלום ${details.name},`,
          intro: "המקום שלך שמור! הנה פרטי ההזמנה:",
          course: "סדנה",
          when: "מתי",
          price: "מחיר",
          customPrice: "מחיר בהתאמה אישית — נא ליצור קשר",
          originalPrice: "מחיר מקורי",
          discount: "הנחה",
          finalPrice: "לתשלום",
          coupon: "קופון",
          footer: "נתראה שם! אם יש שאלות, אפשר ליצור קשר.",
          app: "Shoshi Halperin",
        }
      : {
          subject: `Booking confirmed — ${courseTitle}`,
          greeting: `Hi ${details.name},`,
          intro: "Your spot is booked! Here are your booking details:",
          course: "Course",
          when: "When",
          price: "Price",
          customPrice: "Custom price — please contact us",
          originalPrice: "Original price",
          discount: "Discount",
          finalPrice: "Total",
          coupon: "Coupon",
          footer: "See you there! If you have any questions, feel free to get in touch.",
          app: "Shoshi Halperin",
        };

  const priceLines = details.customPrice
    ? [`${copy.price}: ${copy.customPrice}`]
    : hasDiscount
      ? [
          `${copy.originalPrice}: ${formatPrice(details.originalPrice!)}`,
          `${copy.discount} (${details.couponCode}): -${formatPrice(details.discountAmount!)}`,
          `${copy.finalPrice}: ${formatPrice(details.finalPrice!)}`,
        ]
      : [`${copy.price}: ${formatPrice(paid)}`];

  const text = [
    copy.greeting,
    "",
    copy.intro,
    "",
    `${copy.course}: ${courseTitle}`,
    `${copy.when}: ${date}, ${time}`,
    ...priceLines,
    "",
    copy.footer,
    copy.app,
  ].join("\n");

  const priceHtml = details.customPrice
    ? `<p><strong>${copy.price}:</strong> ${copy.customPrice}</p>`
    : hasDiscount
      ? `<p>${copy.originalPrice}: ${formatPrice(details.originalPrice!)}</p>
       <p>${copy.discount} (${details.couponCode}): -${formatPrice(details.discountAmount!)}</p>
       <p><strong>${copy.finalPrice}: ${formatPrice(details.finalPrice!)}</strong></p>`
      : `<p><strong>${copy.price}: ${formatPrice(paid)}</strong></p>`;

  const html = `
    <div style="font-family: Georgia, serif; color: #1c1917; line-height: 1.6; max-width: 520px;">
      <p>${copy.greeting}</p>
      <p>${copy.intro}</p>
      <div style="margin: 24px 0; padding: 20px; border: 1px solid #e7e5e4; border-radius: 12px; background: #fafaf9;">
        <p style="margin: 0 0 8px;"><strong>${copy.course}:</strong> ${courseTitle}</p>
        <p style="margin: 0 0 8px;"><strong>${copy.when}:</strong> ${date}<br>${time}</p>
        ${priceHtml}
      </div>
      <p>${copy.footer}</p>
      <p style="color: #78716c; font-size: 14px;">${copy.app}</p>
    </div>
  `;

  return sendEmail({
    to: details.to,
    subject: copy.subject,
    text,
    html,
    logLabel: "booking confirmation email",
    devFallback: `${details.name} — ${courseTitle} on ${date} at ${time}`,
  });
}

export async function sendBookingCancellationEmail(
  details: BookingEmailDetails
): Promise<boolean> {
  const lang = details.lang ?? "he";
  const courseTitle = lang === "he" ? details.courseTitleHe : details.courseTitleEn;
  const { date, time } = formatBookingWhen(details.startsAt, details.endsAt, lang);

  const copy =
    lang === "he"
      ? {
          subject: `ההזמנה בוטלה — ${courseTitle}`,
          greeting: `שלום ${details.name},`,
          intro: "ההזמנה שלך לסדנה הבאה בוטלה:",
          course: "סדנה",
          when: "מתי",
          footer: "אם יש שאלות או שברצונך להזמין מועד אחר, אפשר ליצור קשר.",
          app: "Shoshi Halperin",
        }
      : {
          subject: `Booking cancelled — ${courseTitle}`,
          greeting: `Hi ${details.name},`,
          intro: "Your booking for the following course has been cancelled:",
          course: "Course",
          when: "When",
          footer: "If you have any questions or would like to book another time, feel free to get in touch.",
          app: "Shoshi Halperin",
        };

  const text = [
    copy.greeting,
    "",
    copy.intro,
    "",
    `${copy.course}: ${courseTitle}`,
    `${copy.when}: ${date}, ${time}`,
    "",
    copy.footer,
    copy.app,
  ].join("\n");

  const html = `
    <div style="font-family: Georgia, serif; color: #1c1917; line-height: 1.6; max-width: 520px;">
      <p>${copy.greeting}</p>
      <p>${copy.intro}</p>
      <div style="margin: 24px 0; padding: 20px; border: 1px solid #e7e5e4; border-radius: 12px; background: #fafaf9;">
        <p style="margin: 0 0 8px;"><strong>${copy.course}:</strong> ${courseTitle}</p>
        <p style="margin: 0;"><strong>${copy.when}:</strong> ${date}<br>${time}</p>
      </div>
      <p>${copy.footer}</p>
      <p style="color: #78716c; font-size: 14px;">${copy.app}</p>
    </div>
  `;

  return sendEmail({
    to: details.to,
    subject: copy.subject,
    text,
    html,
    logLabel: "booking cancellation email",
    devFallback: `${details.name} — ${courseTitle} on ${date} at ${time}`,
  });
}
