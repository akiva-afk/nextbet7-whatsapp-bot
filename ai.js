// ai.js — שכבת ה-GPT והלוגיקה של ניסוח תשובות חכמות
const OpenAI = require("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

async function generateSmartReply({ userText, language, promos, userProfile, faq = [] }) {
  const depositNumbers = (process.env.DEPOSIT_TEAM_NUMBERS || "")
    .split(",").map(s => s.trim()).filter(Boolean);

  const activePromos = (promos || []).filter(p => p.active);
  const promoLines = activePromos.map((p, i) => {
    const code = p.code ? ` | קוד: ${p.code}` : "";
    const link = p.link ? ` | קישור: ${p.link}` : "";
    return `${i + 1}. ${p.title} — ${p.short}${code}${link}`;
  });

  const faqLinesHe = (faq || []).map((f,i)=>`${i+1}. שאלה: ${f.q}\n   תשובה: ${f.a}`).join("\n");
  const faqLinesEn = (faq || []).map((f,i)=>`${i+1}. Q: ${f.q_en || f.q}\n   A: ${f.a_en || f.a}`).join("\n");

  const sysHe = `
אתה בוט שירות לקוחות של NextBet7 בוואטסאפ.
דבר תמיד בטון שירותי, אנושי, ברור וקצר. אל תמציא עובדות.
אם השאלה קשורה להפקדה: הפנה למספרים המורשים בלבד: ${depositNumbers.join(", ")}.
מבצעים פעילים:
${promoLines.length ? promoLines.join("\n") : "אין כרגע מבצעים פעילים."}

שאלות תשובות נפוצות:
${faqLinesHe || "—"}

מספר הלקוח (אם צריך): ${userProfile?.phone || "לא ידוע"}.
`.trim();

  const sysEn = `
You are NextBet7's WhatsApp assistant.
Be friendly, concise, and accurate. Do not invent facts.
For deposits, direct users ONLY to: ${depositNumbers.join(", ")}.
Active promotions:
${promoLines.length ? promoLines.join("\n") : "No active promotions at the moment."}

Common Q&A:
${faqLinesEn || "—"}

Customer phone (if relevant): ${userProfile?.phone || "unknown"}.
`.trim();

  const system = language === "he" ? sysHe : sysEn;
  const userPrompt =
    language === "he"
      ? `פניית לקוח:\n"${userText}"\nענה בעברית, 2–5 שורות, ידידותי ומדויק.`
      : `User says:\n"${userText}"\nReply in English, 2–5 lines, friendly and precise.`;

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content: userPrompt }],
      temperature: 0.5,
      max_tokens: 350,
    });
    return (
      completion.choices?.[0]?.message?.content?.trim() ||
      (language === "he" ? "מצטער/ת, לא קלטתי לגמרי. אפשר לנסח שוב?" :
                           "Sorry, I didn’t catch that. Could you rephrase?")
    );
  } catch (err) {
    console.error("AI error:", err?.response?.data || err.message);
    return language === "he"
      ? "יש כרגע עומס במערכת. נסה/י שוב רגע מאוחר יותר 🙏"
      : "We’re a bit busy right now. Please try again shortly 🙏";
  }
}

module.exports = { generateSmartReply };
