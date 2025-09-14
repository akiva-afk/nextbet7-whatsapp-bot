// promos.js — מקור המבצעים (כרגע לוקלי)
const promos = [
  {
    id: "welcome-100",
    title: "בונוס פתיחה 100%",
    short: "הפקדה ראשונה? בונוס 100% עד 500₪.",
    code: "WELCOME100",
    link: "https://nextbet7.example.com/promotions/welcome-100",
    active: true,
    detailsHe: "בונוס חד-פעמי על ההפקדה הראשונה, עד 500₪. בכפוף לתקנון.",
    detailsEn: "One-time 100% bonus on first deposit, up to 500₪. T&C apply.",
  },
  {
    id: "cashback-10",
    title: "Cashback 10%",
    short: "קאשבק שבועי 10% על הפסדים נטו.",
    code: "CASHBACK10",
    link: "https://nextbet7.example.com/promotions/cashback-10",
    active: true,
    detailsHe: "החזר כספי שבועי של 10% על הפסדים נטו. בכפוף לתקנון.",
    detailsEn: "Weekly 10% cashback on net losses. T&C apply.",
  },
  {
    id: "vip-club",
    title: "מועדון VIP",
    short: "הטבות מצטברות ומנהל לקוח אישי.",
    code: "",
    link: "https://nextbet7.example.com/vip",
    active: true,
    detailsHe: "הצטרפות למועדון עם צ'ופרים וקדימויות. בכפוף לתקנון.",
    detailsEn: "VIP club perks and personal manager. T&C apply.",
  },
];

async function getPromos() { return promos; }
module.exports = { getPromos, promos };
