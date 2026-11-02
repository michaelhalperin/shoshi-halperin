import { Resend } from "resend";
import { ADMIN_EMAIL } from "./adminConfig.js";

type Lang = "en" | "he";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function getFromAddress() {
  return process.env.RESEND_FROM ?? "Shoshi Halperin <onboarding@resend.dev>";
}

export function clientBaseUrl() {
  const url = (process.env.CLIENT_URL ?? "http://localhost:5173").split(",")[0]?.trim();
  return url?.replace(/\/$/, "") ?? "http://localhost:5173";
}

function adminAddress() {
  return process.env.ADMIN_NOTIFY_EMAIL ?? ADMIN_EMAIL;
}

async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
  logLabel: string;
  devFallback?: string;
  replyTo?: string;
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
    ...(options.replyTo ? { replyTo: options.replyTo } : {}),
  });

  if (error) {
    console.error(`Resend email error (${options.logLabel}):`, error);
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Shared branded layout
// ---------------------------------------------------------------------------

const palette = {
  outer: "#efe9e1",
  paper: "#faf8f4",
  ink: "#211d19",
  body: "#3a332d",
  muted: "#8a7d72",
  clay50: "#faf4ef",
  clay100: "#f3e4d9",
  clay200: "#e6c9b5",
  clay400: "#c48a63",
  clay600: "#9a5d3c",
  clay700: "#7d4a31",
};

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface EmailButton {
  label: string;
  url: string;
  outline?: boolean;
}

interface EmailContent {
  lang: Lang;
  heading: string;
  intro: string;
  rows?: Array<[label: string, value: string]>;
  buttons?: EmailButton[];
  note?: string;
}

function renderEmail({ lang, heading, intro, rows = [], buttons = [], note }: EmailContent) {
  const dir = lang === "he" ? "rtl" : "ltr";
  const align = lang === "he" ? "right" : "left";
  const endAlign = lang === "he" ? "left" : "right";
  const sans = "Assistant, 'Segoe UI', Arial, sans-serif";
  const serif = "'Cormorant Garamond', 'Frank Ruhl Libre', Georgia, serif";

  const rowsHtml = rows.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;background:${palette.clay50};border:1px solid ${palette.clay100};border-radius:10px;">
        ${rows
          .map(
            ([label, value], i) => `<tr>
          <td style="padding:10px 14px;font:13px ${sans};color:${palette.clay600};text-align:${align};${i < rows.length - 1 ? `border-bottom:1px dashed ${palette.clay200};` : ""}">${esc(label)}</td>
          <td style="padding:10px 14px;font:600 13px ${sans};color:${palette.ink};text-align:${endAlign};${i < rows.length - 1 ? `border-bottom:1px dashed ${palette.clay200};` : ""}">${esc(value)}</td>
        </tr>`
          )
          .join("")}
      </table>`
    : "";

  const buttonsHtml = buttons
    .map((b) => {
      const style = b.outline
        ? `background:transparent;color:${palette.clay700};border:1.5px solid ${palette.clay400};`
        : `background:${palette.clay600};color:#ffffff;border:1.5px solid ${palette.clay600};`;
      return `<a href="${esc(b.url)}" style="display:block;margin:10px 0 0;padding:12px 18px;border-radius:999px;text-align:center;text-decoration:none;font:600 14px ${sans};${style}">${esc(b.label)}</a>`;
    })
    .join("");

  const noteHtml = note
    ? `<p style="margin:18px 0 0;font:12px/1.5 ${sans};color:${palette.muted};text-align:${align};">${esc(note)}</p>`
    : "";

  const html = `<!doctype html>
<html lang="${lang}" dir="${dir}">
<body style="margin:0;padding:0;background:${palette.outer};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${palette.outer};">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="${dir}" style="max-width:480px;background:${palette.paper};border:1px solid ${palette.clay200};border-radius:12px;">
        <tr><td align="center" style="padding:26px 20px 4px;">
          <img src="${clientBaseUrl()}/email-logo.png" width="112" alt="Shoshi Halperin" style="display:block;width:112px;height:auto;border:0;">
        </td></tr>
        <tr><td style="padding:14px 26px 28px;text-align:${align};">
          <h1 style="margin:0 0 10px;font:600 28px/1.15 ${serif};color:${palette.ink};text-align:${align};">${esc(heading)}</h1>
          <p style="margin:0;font:15px/1.65 ${sans};color:${palette.body};text-align:${align};">${esc(intro)}</p>
          ${rowsHtml}
          ${buttonsHtml}
          ${noteHtml}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    heading,
    "",
    intro,
    ...(rows.length ? ["", ...rows.map(([l, v]) => `${l}: ${v}`)] : []),
    ...buttons.flatMap((b) => ["", `${b.label}: ${b.url}`]),
    ...(note ? ["", note] : []),
  ].join("\n");

  return { html, text };
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const TIME_ZONE = "Asia/Jerusalem";

function formatWhen(startsAt: Date, endsAt: Date, lang: Lang) {
  const locale = lang === "he" ? "he-IL" : "en-GB";
  const date = startsAt.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  });
  const hm = { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE } as const;
  const time = `${startsAt.toLocaleTimeString(locale, hm)}–${endsAt.toLocaleTimeString(locale, hm)}`;
  return { date, time, full: `${date}, ${time}` };
}

function formatPrice(amount: number) {
  return `₪${amount.toFixed(0)}`;
}

function courseTitleFor(details: { courseTitleEn: string; courseTitleHe: string }, lang: Lang) {
  return lang === "he" ? details.courseTitleHe : details.courseTitleEn;
}

function googleCalendarUrl(title: string, startsAt: Date, endsAt: Date) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${stamp(startsAt)}/${stamp(endsAt)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BookingEmailDetails {
  to: string;
  name: string;
  courseTitleEn: string;
  courseTitleHe: string;
  startsAt: Date;
  endsAt: Date;
  lang?: Lang;
}

export interface BookingConfirmationDetails extends BookingEmailDetails {
  price: number;
  customPrice?: boolean;
  originalPrice?: number | null;
  finalPrice?: number | null;
  discountAmount?: number | null;
  couponCode?: string | null;
}

// ---------------------------------------------------------------------------
// 1. Booking confirmation (visitor)
// ---------------------------------------------------------------------------

export async function sendBookingConfirmationEmail(
  details: BookingConfirmationDetails
): Promise<boolean> {
  const lang = details.lang ?? "en";
  const courseTitle = courseTitleFor(details, lang);
  const when = formatWhen(details.startsAt, details.endsAt, lang);

  const paid = details.finalPrice ?? details.price;
  const hasDiscount =
    !details.customPrice &&
    details.couponCode &&
    details.originalPrice != null &&
    details.discountAmount != null &&
    details.finalPrice != null;

  const t =
    lang === "he"
      ? {
          subject: `אישור הזמנה — ${courseTitle}`,
          heading: "המקום שלך שמור",
          intro: `שלום ${details.name}, ממש שמחה שתצטרפי אלינו.`,
          course: "סדנה",
          when: "מתי",
          price: "מחיר",
          customPrice: "מחיר בהתאמה אישית — נא ליצור קשר",
          originalPrice: "מחיר מקורי",
          discount: "הנחה",
          finalPrice: "לתשלום",
          calendar: "הוספה ליומן",
          note: "לא מתאים? אפשר לענות למייל הזה.",
        }
      : {
          subject: `Booking confirmed — ${courseTitle}`,
          heading: "Your spot is saved",
          intro: `Hi ${details.name}, so glad you are joining us.`,
          course: "Workshop",
          when: "When",
          price: "Price",
          customPrice: "Custom price — please contact us",
          originalPrice: "Original price",
          discount: "Discount",
          finalPrice: "Total",
          calendar: "Add to calendar",
          note: "Can't make it? Just reply to this email.",
        };

  const priceRows: Array<[string, string]> = details.customPrice
    ? [[t.price, t.customPrice]]
    : hasDiscount
      ? [
          [t.originalPrice, formatPrice(details.originalPrice!)],
          [`${t.discount} (${details.couponCode})`, `-${formatPrice(details.discountAmount!)}`],
          [t.finalPrice, formatPrice(details.finalPrice!)],
        ]
      : [[t.finalPrice, formatPrice(paid)]];

  const { html, text } = renderEmail({
    lang,
    heading: t.heading,
    intro: t.intro,
    rows: [[t.course, courseTitle], [t.when, when.full], ...priceRows],
    buttons: [{ label: t.calendar, url: googleCalendarUrl(courseTitle, details.startsAt, details.endsAt) }],
    note: t.note,
  });

  return sendEmail({
    to: details.to,
    subject: t.subject,
    text,
    html,
    logLabel: "booking confirmation email",
    devFallback: `${details.name} — ${courseTitle} on ${when.full}`,
  });
}

// ---------------------------------------------------------------------------
// 1b. Booking request received, waiting for approval (visitor)
// ---------------------------------------------------------------------------

export async function sendBookingRequestEmail(details: BookingEmailDetails): Promise<boolean> {
  const lang = details.lang ?? "he";
  const courseTitle = courseTitleFor(details, lang);
  const when = formatWhen(details.startsAt, details.endsAt, lang);

  const t =
    lang === "he"
      ? {
          subject: `הבקשה התקבלה — ${courseTitle}`,
          heading: "הבקשה התקבלה",
          intro: `שלום ${details.name}, קיבלתי את הבקשה שלך לשמור מקום. אחזור אליך עם אישור בקרוב.`,
          course: "סדנה",
          when: "מתי",
          note: "המקום יאושר רק לאחר שתקבלי מייל אישור.",
        }
      : {
          subject: `Request received — ${courseTitle}`,
          heading: "Request received",
          intro: `Hi ${details.name}, I got your request to save a spot. I'll confirm it soon.`,
          course: "Workshop",
          when: "When",
          note: "Your spot is confirmed only once you get a confirmation email.",
        };

  const { html, text } = renderEmail({
    lang,
    heading: t.heading,
    intro: t.intro,
    rows: [[t.course, courseTitle], [t.when, when.full]],
    note: t.note,
  });

  return sendEmail({
    to: details.to,
    subject: t.subject,
    text,
    html,
    logLabel: "booking request email",
    devFallback: `${details.name} — ${courseTitle} on ${when.full}`,
  });
}

// ---------------------------------------------------------------------------
// 2. Booking cancelled (visitor)
// ---------------------------------------------------------------------------

export async function sendBookingCancellationEmail(
  details: BookingEmailDetails
): Promise<boolean> {
  const lang = details.lang ?? "he";
  const courseTitle = courseTitleFor(details, lang);
  const when = formatWhen(details.startsAt, details.endsAt, lang);

  const t =
    lang === "he"
      ? {
          subject: `ההזמנה בוטלה — ${courseTitle}`,
          heading: "ההזמנה בוטלה",
          intro: `שלום ${details.name}, ההזמנה שלך לסדנה בוטלה.`,
          course: "סדנה",
          when: "מועד שבוטל",
          button: "לבחירת מועד חדש",
          note: "אשמח לראות אותך בתאריך אחר.",
        }
      : {
          subject: `Booking cancelled — ${courseTitle}`,
          heading: "Booking cancelled",
          intro: `Hi ${details.name}, your booking was cancelled.`,
          course: "Workshop",
          when: "Cancelled slot",
          button: "Pick a new date",
          note: "I would love to see you another time.",
        };

  const { html, text } = renderEmail({
    lang,
    heading: t.heading,
    intro: t.intro,
    rows: [[t.course, courseTitle], [t.when, when.full]],
    buttons: [{ label: t.button, url: clientBaseUrl(), outline: true }],
    note: t.note,
  });

  return sendEmail({
    to: details.to,
    subject: t.subject,
    text,
    html,
    logLabel: "booking cancellation email",
    devFallback: `${details.name} — ${courseTitle} on ${when.full}`,
  });
}

// ---------------------------------------------------------------------------
// 3. Password reset (admin)
// ---------------------------------------------------------------------------

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  lang: Lang = "he"
): Promise<boolean> {
  const t =
    lang === "he"
      ? {
          subject: "איפוס סיסמה",
          heading: "איפוס סיסמה",
          intro: "קיבלנו בקשה לאפס את סיסמת הניהול. הקישור תקף לשעה אחת.",
          button: "איפוס סיסמה",
          note: "לא ביקשת? אפשר להתעלם מהמייל.",
        }
      : {
          subject: "Reset your admin password",
          heading: "Reset your password",
          intro: "We got a request to reset your admin password. The link works for one hour.",
          button: "Reset password",
          note: "Didn't ask for this? You can ignore this email.",
        };

  const { html, text } = renderEmail({
    lang,
    heading: t.heading,
    intro: t.intro,
    buttons: [{ label: t.button, url: resetUrl }],
    note: t.note,
  });

  return sendEmail({
    to,
    subject: t.subject,
    text,
    html,
    logLabel: "password reset email",
    devFallback: resetUrl,
  });
}

// ---------------------------------------------------------------------------
// 4. New booking alert (admin)
// ---------------------------------------------------------------------------

export interface AdminBookingAlertDetails {
  name: string;
  phone: string;
  email?: string | null;
  courseTitleHe: string;
  startsAt: Date;
  endsAt: Date;
  spotsLeft: number;
}

export async function sendAdminNewBookingEmail(details: AdminBookingAlertDetails): Promise<boolean> {
  const when = formatWhen(details.startsAt, details.endsAt, "he");
  const rows: Array<[string, string]> = [
    ["סדנה", details.courseTitleHe],
    ["מועד", when.full],
    ["טלפון", details.phone],
    ...(details.email ? ([["אימייל", details.email]] as Array<[string, string]>) : []),
    ["נשארו", `${Math.max(details.spotsLeft, 0)} מקומות`],
  ];

  const { html, text } = renderEmail({
    lang: "he",
    heading: "בקשת הזמנה חדשה",
    intro: `${details.name} ביקשה לשמור מקום בסדנה. הבקשה ממתינה לאישור שלך.`,
    rows,
    buttons: [{ label: "לאישור בניהול", url: `${clientBaseUrl()}/admin/bookings`, outline: true }],
  });

  return sendEmail({
    to: adminAddress(),
    subject: `בקשת הזמנה — ${details.name}, ${details.courseTitleHe}`,
    text,
    html,
    logLabel: "new booking alert email",
    devFallback: `${details.name} — ${details.courseTitleHe} on ${when.full}`,
  });
}

// ---------------------------------------------------------------------------
// 5. Reminder, 24h before (visitor)
// ---------------------------------------------------------------------------

export async function sendBookingReminderEmail(details: BookingEmailDetails): Promise<boolean> {
  const lang = details.lang ?? "he";
  const courseTitle = courseTitleFor(details, lang);
  const when = formatWhen(details.startsAt, details.endsAt, lang);

  const t =
    lang === "he"
      ? {
          subject: `מחר נפגשים — ${courseTitle}`,
          heading: "מחר נפגשים",
          intro: `שלום ${details.name}, תזכורת קטנה לסדנה שלך מחר.`,
          course: "סדנה",
          date: "תאריך",
          time: "שעה",
          note: "לא מתאים? אפשר לענות למייל הזה.",
        }
      : {
          subject: `See you tomorrow — ${courseTitle}`,
          heading: "See you tomorrow",
          intro: `Hi ${details.name}, a small reminder about your workshop tomorrow.`,
          course: "Workshop",
          date: "Date",
          time: "Time",
          note: "Can't make it? Just reply to this email.",
        };

  const { html, text } = renderEmail({
    lang,
    heading: t.heading,
    intro: t.intro,
    rows: [[t.course, courseTitle], [t.date, when.date], [t.time, when.time]],
    note: t.note,
  });

  return sendEmail({
    to: details.to,
    subject: t.subject,
    text,
    html,
    logLabel: "booking reminder email",
    devFallback: `${details.name} — ${courseTitle} on ${when.full}`,
  });
}

// ---------------------------------------------------------------------------
// 6. Time changed (visitor)
// ---------------------------------------------------------------------------

export interface SlotChangedDetails extends BookingEmailDetails {
  oldStartsAt: Date;
  oldEndsAt: Date;
}

export async function sendSlotChangedEmail(details: SlotChangedDetails): Promise<boolean> {
  const lang = details.lang ?? "he";
  const courseTitle = courseTitleFor(details, lang);
  const before = formatWhen(details.oldStartsAt, details.oldEndsAt, lang);
  const after = formatWhen(details.startsAt, details.endsAt, lang);

  const t =
    lang === "he"
      ? {
          subject: `עדכון במועד הסדנה — ${courseTitle}`,
          heading: "המועד השתנה",
          intro: `שלום ${details.name}, חל שינוי בזמן הסדנה שלך.`,
          was: "היה",
          now: "עכשיו",
          button: "הוספה ליומן",
          note: "לא מתאים? ענו למייל ונסדר.",
        }
      : {
          subject: `Update to your workshop — ${courseTitle}`,
          heading: "The time has changed",
          intro: `Hi ${details.name}, there is a change to your workshop time.`,
          was: "Was",
          now: "Now",
          button: "Add the new time to calendar",
          note: "Doesn't work? Reply and we will sort it out.",
        };

  const { html, text } = renderEmail({
    lang,
    heading: t.heading,
    intro: t.intro,
    rows: [[t.was, before.full], [t.now, after.full]],
    buttons: [{ label: t.button, url: googleCalendarUrl(courseTitle, details.startsAt, details.endsAt) }],
    note: t.note,
  });

  return sendEmail({
    to: details.to,
    subject: t.subject,
    text,
    html,
    logLabel: "slot changed email",
    devFallback: `${details.name} — ${courseTitle}: ${before.full} → ${after.full}`,
  });
}

// ---------------------------------------------------------------------------
// 7. Thank you (visitor)
// ---------------------------------------------------------------------------

export async function sendThankYouEmail(details: BookingEmailDetails): Promise<boolean> {
  const lang = details.lang ?? "he";
  const courseTitle = courseTitleFor(details, lang);

  const t =
    lang === "he"
      ? {
          subject: `תודה שבאת, ${details.name}`,
          heading: "תודה שבאת",
          intro: "היה כיף לארח אותך. מוזמנת לראות את המתכונים שלי, ואת המועדים הבאים.",
          recipes: "למתכונים",
          next: "לסדנאות הבאות",
        }
      : {
          subject: `Thank you for coming, ${details.name}`,
          heading: "Thank you for coming",
          intro: "It was a joy to host you. Have a look at my recipes, and the next dates.",
          recipes: "See the recipes",
          next: "Next workshops",
        };

  const { html, text } = renderEmail({
    lang,
    heading: t.heading,
    intro: t.intro,
    buttons: [
      { label: t.recipes, url: `${clientBaseUrl()}/recipes` },
      { label: t.next, url: clientBaseUrl(), outline: true },
    ],
  });

  return sendEmail({
    to: details.to,
    subject: t.subject,
    text,
    html,
    logLabel: "thank you email",
    devFallback: `${details.name} — ${courseTitle}`,
  });
}

// ---------------------------------------------------------------------------
// 8. Contact form message (admin)
// ---------------------------------------------------------------------------

export interface ContactMessageDetails {
  name: string;
  email: string;
  phone?: string | null;
  message: string;
}

export async function sendContactMessageEmail(details: ContactMessageDetails): Promise<boolean> {
  const rows: Array<[string, string]> = [["אימייל", details.email]];
  if (details.phone) rows.push(["טלפון", details.phone]);

  const { html, text } = renderEmail({
    lang: "he",
    heading: `הודעה חדשה מ${details.name}`,
    intro: details.message,
    rows,
    buttons: [{ label: `מענה ל${details.name}`, url: `mailto:${details.email}`, outline: true }],
  });

  return sendEmail({
    to: adminAddress(),
    subject: `פנייה מהאתר — ${details.name}`,
    text,
    html,
    replyTo: details.email,
    logLabel: "contact message email",
    devFallback: `${details.name} <${details.email}>: ${details.message}`,
  });
}
