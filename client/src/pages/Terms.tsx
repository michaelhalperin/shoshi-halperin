import { useI18n } from "../i18n";
import { siteConfig } from "../site";

interface Section {
  title: string;
  body: string[];
}

const he: Section[] = [
  {
    title: "כללי",
    body: [
      "האתר מופעל על ידי שושנה הלפרין, עוסק מורשה {id}{address}. האתר מאפשר להירשם ולשלם עבור סדנאות.",
      "ההרשמה והתשלום באתר מהווים הסכמה לתקנון זה.",
    ],
  },
  {
    title: "גיל מינימלי",
    body: ["ההשתתפות בסדנאות וביצוע הזמנה באתר מותרים מגיל 16 ומעלה."],
  },
  {
    title: "הרשמה ותשלום",
    body: [
      "המחיר המוצג לכל סדנה כולל מע״מ ככל שחל, והוא סופי. התשלום מתבצע באתר באמצעות חברת הסליקה Grow, בכרטיס אשראי או באמצעי תשלום נוספים שיוצעו בדף התשלום.",
      "המקום נשמר עם השלמת התשלום, ואישור הרשמה נשלח לכתובת האימייל שהוזנה. פרטי כרטיס האשראי אינם נשמרים באתר ואינם עוברים דרכו.",
      "סדנאות שמחירן נקבע בהתאם לפנייה אישית אינן כרוכות בתשלום באתר.",
    ],
  },
  {
    title: "ביטול והחזר כספי",
    body: [
      "ביטול עד יומיים (48 שעות) לפני מועד הסדנה: החזר כספי מלא.",
      "ביטול בתוך פחות מיומיים לפני הסדנה, או אי-הגעה: אין החזר כספי, והמקום נשמר להשתתפות בסדנה הבאה.",
      "לביטול יש לפנות דרך עמוד יצירת הקשר באתר או בוואטסאפ. החזר יינתן באמצעי התשלום המקורי.",
      "שושנה הלפרין רשאית לבטל או לדחות סדנה, ובמקרה כזה יוצע למשתתפים מועד חלופי או החזר כספי מלא.",
    ],
  },
  {
    title: "אספקה",
    body: [
      "האתר מציע סדנאות בלבד ואינו מוכר מוצרים פיזיים, ולכן אין משלוחים. אישור ההזמנה נשלח באימייל לאחר השלמת התשלום, והסדנה מתקיימת במועד ובמקום שנקבעו.",
    ],
  },
  {
    title: "אחריות",
    body: [
      "התכנים והמתכונים באתר ובסדנאות הם לצורכי הדרכה והעשרה בלבד ואינם מהווים ייעוץ תזונתי או רפואי. על המשתתפים להודיע מראש על אלרגיות ורגישויות למזון.",
      "האחריות על בריאות המשתתף והתאמתו לפעילות היא על המשתתף.",
    ],
  },
  {
    title: "פרטיות",
    body: [
      "הפרטים שנמסרים בהרשמה (שם, טלפון ואימייל) משמשים ליצירת קשר ולניהול ההרשמה בלבד, ואינם מועברים לצד שלישי, למעט חברת הסליקה לצורך ביצוע התשלום.",
      "ניתן לבקש לעיין בפרטים או למחוק אותם בפנייה דרך עמוד יצירת הקשר.",
    ],
  },
];

const en: Section[] = [
  {
    title: "General",
    body: [
      "This site is operated by Shoshana Halperin, licensed dealer no. {id}{address}. It lets you sign up and pay for workshops.",
      "Signing up and paying on the site means you accept these terms.",
    ],
  },
  { title: "Minimum age", body: ["You must be 16 or older to attend a workshop or place a booking."] },
  {
    title: "Booking and payment",
    body: [
      "The price shown for each workshop is final and includes VAT where applicable. Payment is made on the site through the Grow payment provider, by credit card or other methods offered on the payment page.",
      "Your spot is reserved once payment is complete, and a confirmation is emailed to the address you entered. Card details are never stored on or pass through this site.",
      "Workshops priced on request are not paid for on the site.",
    ],
  },
  {
    title: "Cancellation and refunds",
    body: [
      "Cancel up to two days (48 hours) before the workshop: full refund.",
      "Cancel less than two days before, or no-show: no refund, and your place is held for the next workshop.",
      "To cancel, use the contact page or WhatsApp. Refunds go to the original payment method.",
      "Shoshana Halperin may cancel or postpone a workshop; participants are then offered another date or a full refund.",
    ],
  },
  {
    title: "Delivery",
    body: [
      "The site offers workshops only and sells no physical goods, so nothing is shipped. Your booking is confirmed by email once payment is complete, and the workshop takes place at the agreed time and place.",
    ],
  },
  {
    title: "Liability",
    body: [
      "Content and recipes on the site and in workshops are for instruction and enrichment only and are not dietary or medical advice. Participants must tell us about food allergies and sensitivities in advance.",
      "Participants are responsible for their own health and suitability for the activity.",
    ],
  },
  {
    title: "Privacy",
    body: [
      "The details you give when booking (name, phone, email) are used only to contact you and manage your booking, and are not shared with third parties other than the payment provider for processing payment.",
      "You can ask to see or delete your details through the contact page.",
    ],
  },
];

export default function Terms() {
  const { t, lang } = useI18n();
  const { licensedDealerNumber, address } = siteConfig.business;
  const sections = lang === "he" ? he : en;
  const fill = (text: string) =>
    text
      .replace("{id}", licensedDealerNumber)
      .replace("{address}", address ? (lang === "he" ? `, ${address}` : `, ${address}`) : "");

  return (
    <div className="mx-auto max-w-2xl py-6">
      <h1 className="mb-8 text-center font-display text-3xl font-medium text-ink">{t("termsTitle")}</h1>
      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="mb-2 font-display text-xl font-semibold text-ink">{section.title}</h2>
            <div className="space-y-2 font-light leading-relaxed text-stone-600">
              {section.body.map((p) => (
                <p key={p}>{fill(p)}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
