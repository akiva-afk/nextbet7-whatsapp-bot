// רשימת מבצעים + פונקציה להדפסה

const promos = [
  {
    id: "welcome100",
    title: "בונוס הצטרפות 100%",
    short: "כפול על הפקדה ראשונה עד 400₪",
    code: "WELCOME100",
    link: "https://nextbet7.com/promos/welcome",
    active: true,
  },
  {
    id: "vip-cashback",
    title: "Cashback VIP",
    short: "החזר שבועי עד 12%",
    code: null,
    link: "https://nextbet7.com/promos/vip",
    active: true,
  },
  {
    id: "refer",
    title: "חבר מביא חבר",
    short: "בונוס על כל חבר שנרשם ומפקיד",
    code: null,
    link: "https://nextbet7.com/promos/refer",
    active: true,
  },
];

function getPromosText(lang = "he") {
  const header = lang === "he" ? "🎁 *מבצעים פעילים:*" : "🎁 *Active promos:*";
  const lines = promos
    .filter((p) => p.active)
    .map(
      (p) =>
        `• ${p.title} – ${p.short}${p.link ? ` (${p.link})` : ""}${
          p.code ? ` [קוד: ${p.code}]` : ""
        }`
    );
  return [header, ...(lines.length ? lines : [lang === "he" ? "אין כרגע." : "None right now."])].join(
    "\n"
  );
}

module.exports = { promos, getPromosText };
