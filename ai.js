// GPT brain – falls back to rule-based if no OPENAI_API_KEY
const OpenAI = require("openai");

const SYS_HE = `אתה עוזר צ'אט של NextBet7. דבר/י קצר, מקצועי וחברותי. 
כששואלים על מבצעים – תן/י כותרת קצרה וקישור. כששואלים על הפקדות – פרט/י בקצרה (אשראי/Bit/העברה/PayBox) והצע/י נציג.
אל תבטיח/י דברים שלא קיימים. אם לא בטוח – הצע/י נציג.`;
const SYS_EN = `You are NextBet7's friendly support bot. Be brief, professional and helpful.
When asked about promos, list title + short note + link. For deposits, list methods (card/bank/Bit/PayBox) and offer an agent.
If unsure, offer to connect a human agent.`;

function promosToBullets(promos, lang) {
  const title = lang === "he" ? "🎁 מבצעים פעילים:" : "🎁 Active promos:";
  const lines = promos
    .filter((p) => p.active)
    .map(
      (p) =>
        `• ${p.title} – ${p.short}${p.link ? ` (${p.link})` : ""}${
          p.code ? ` [קוד: ${p.code}]` : ""
        }`
    );
  return [title, ...(lines.length ? lines : [lang === "he" ? "אין כרגע." : "None right now."])].join(
    "\n"
  );
}

function faqToBullets(faq, lang) {
  const title = lang === "he" ? "❓ שאלות נפוצות:" : "❓ FAQ:";
  const lines = faq.slice(0, 6).map((q) => `• ${q.q}`);
  return [title, ...lines].join("\n");
}

async function generateSmartReply({ userText, language, promos, faq, depositTeamNumbers, userProfile }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    // fallback rule-based
    const prefix = language === "he" ? "תודה! " : "Thanks! ";
    return (
      prefix +
      "קיבלתי את ההודעה שלך. הנה תקציר שימושי:\n\n" +
      promosToBullets(promos, language) +
      "\n\n" +
      faqToBullets(faq, language) +
      "\n\n" +
      (language === "he"
        ? `לשיחה עם נציג: ${depositTeamNumbers.map((n) => `https://wa.me/${n}`).join(", ")}`
        : `Talk to an agent: ${depositTeamNumbers.map((n) => `https://wa.me/${n}`).join(", ")}`)
    );
  }

  const openai = new OpenAI({ apiKey: key });

  const sys = language === "he" ? SYS_HE : SYS_EN;
  const context =
    promosToBullets(promos, language) +
    "\n\n" +
    faqToBullets(faq, language) +
    `\n\nUser phone: ${userProfile?.phone || "unknown"}`;

  const prompt =
    (language === "he"
      ? "ענה/י בעברית קצר ולעניין, עם טאץ' שירותי.\n\n"
      : "Reply in short, natural English with friendly tone.\n\n") +
    `User: "${userText}"\n\nContext:\n${context}\n\nRules: avoid over-promising; offer agent if needed.\n`;

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 280,
    });

    return resp.choices?.[0]?.message?.content?.trim() || "🙏";
  } catch (e) {
    console.error("OpenAI error:", e.message);
    // fallback
    return (
      (language === "he" ? "קיבלתי! " : "Got it! ") +
      (language === "he"
        ? "כרגע לא הצלחתי לגשת ל-AI. הנה מידע שימושי:\n"
        : "Couldn't reach AI right now. Useful info:\n") +
      "\n" +
      promosToBullets(promos, language) +
      "\n\n" +
      faqToBullets(faq, language)
    );
  }
}

module.exports = { generateSmartReply };
