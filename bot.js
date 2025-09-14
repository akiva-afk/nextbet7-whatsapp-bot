// NextBet7 WhatsApp Bot – Green API + GPT
// npm i express axios dotenv helmet express-rate-limit openai

const express = require("express");
const axios = require("axios");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { generateSmartReply } = require("./ai");
const { getPromos } = require("./promos");
const { faq } = require("./faq");

class Nextbet7GreenAPIBot {
  constructor() {
    // ===== Green API creds =====
    this.instanceId =
      process.env.GREEN_API_INSTANCE_ID ||
      process.env.GREENAPI_INSTANCE_ID ||
      ""; // למשל: 7105263900

    this.apiToken =
      process.env.GREEN_API_TOKEN ||
      process.env.GREENAPI_API_TOKEN ||
      ""; // טוקן ארוך של Green-API

    // Green API base URL
    this.apiUrl = `https://${this.instanceId}.api.greenapi.com/waInstance${this.instanceId}`;

    // ===== Config & State =====
    const depositEnv = process.env.DEPOSIT_TEAM_NUMBERS || "";
    this.depositTeamNumbers = depositEnv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (this.depositTeamNumbers.length === 0) {
      this.depositTeamNumbers = ["972524606685"]; // fallback
    }

    this.webhookSecret = process.env.WEBHOOK_SECRET || ""; // לא חובה, אבל מומלץ
    this.customers = new Map();

    // ===== Express =====
    this.app = express();
    this.app.disable("x-powered-by");
    this.app.use(helmet());
    this.app.use(
      rateLimit({
        windowMs: 60 * 1000,
        limit: 120,
      })
    );
    this.app.use(express.json({ limit: "200kb" }));

    this.setupRoutes();
    this.startServer();
  }

  startServer() {
    const port = process.env.PORT || 3000;
    this.app.listen(port, () =>
      console.log(`Nextbet7 bot listening on ${port}`)
    );
  }

  setupRoutes() {
    // בריאות
    this.app.get("/health", (req, res) => res.send("ok"));

    // סטטוס
    this.app.get("/status", (req, res) => {
      // אופציונלי: הגנת סטטוס בסיסמה (STATUS_TOKEN)
      const t = process.env.STATUS_TOKEN;
      if (t && req.headers["x-status-token"] !== t) {
        return res.status(403).json({ error: "forbidden" });
      }
      res.json({
        status: "NextBet7 Bot is running!",
        ts: new Date().toISOString(),
        activeCustomers: this.customers.size,
      });
    });

    // Webhook מה-Green API
    this.app.post("/webhook", async (req, res) => {
      // אימות סוד (אם הוגדר)
      if (this.webhookSecret) {
        const secret = req.headers["x-webhook-secret"];
        if (secret !== this.webhookSecret) {
          console.warn("🚨 Unauthorized webhook call");
          return res.status(403).send("Forbidden");
        }
      }

      // חשוב: להשיב מהר
      res.status(200).send("OK");

      try {
        const notification = req.body;
        if (
          notification?.typeWebhook === "incomingMessageReceived" ||
          notification?.messageData?.textMessageData
        ) {
          await this.handleIncomingMessage(notification);
        }
      } catch (error) {
        console.error("❌ שגיאה בטיפול בהודעה:", error);
      }
    });
  }

  // ===== שליחת הודעה ללקוח דרך Green API =====
  async sendMessage(chatId, message) {
    try {
      const url = `${this.apiUrl}/sendMessage/${this.apiToken}`;
      await axios.post(url, {
        chatId: String(chatId).endsWith("@c.us")
          ? chatId
          : `${chatId}@c.us`,
        message,
      });
    } catch (err) {
      console.error("sendMessage error:", err?.response?.data || err.message);
    }
  }

  // ===== לוגיקת קבלת הודעות =====
  async handleIncomingMessage(notification) {
    try {
      const text =
        notification?.messageData?.textMessageData?.textMessage?.trim();
      const from =
        notification?.senderData?.chatId ||
        notification?.senderData?.sender; // בד"כ "9725...@c.us"
      if (!text || !from) return;

      // זיהוי שפה: עברית אם יש תווים עבריים
      const lang = /[\u0590-\u05FF]/.test(text) ? "he" : "en";

      // ----- חוקים קצרים (לפני GPT) -----

      // תפריט
      if (/^menu|תפריט$/i.test(text)) {
        const msg =
          lang === "he"
            ? "📋 תפריט: • 'פתח' – פתיחת משתמש • 'מבצעים' – הצגת מבצעים • 'הפקדה' – מס' הפקדה • 'נציג' – חיבור לנציג"
            : "📋 Menu: • 'register' • 'promos' • 'deposit' • 'agent'";
        return this.sendMessage(from, msg);
      }

      // מבצעים
      if (/^מבצעים|promos?$/i.test(text)) {
        const promos = await getPromos();
        const list = promos
          .filter((p) => p.active)
          .map(
            (p) =>
              `• ${p.title} – ${p.short} ${p.code ? `(קוד: ${p.code})` : ""}${
                p.link ? ` — ${p.link}` : ""
              }`
          )
          .join("\n");
        return this.sendMessage(
          from,
          list ||
            (lang === "he"
              ? "אין כרגע מבצעים פעילים."
              : "No active promos now.")
        );
      }

      // פתיחת משתמש
      if (/^פתח|register|להירשם/i.test(text)) {
        return this.sendMessage(
          from,
          lang === "he"
            ? "מעולה! שלח/י: שם מלא + שם משתמש רצוי (בשורה אחת)."
            : "Great! Send: Full name + desired username (one line)."
        );
      }

      // הפקדה — החזרת מספרי ה-WhatsApp העדכניים מה-ENV
      if (/^(להפקיד|deposit|הפקדה)$/i.test(text)) {
        const list = this.depositTeamNumbers.map((n) => `• ${n}`).join("\n");
        const he =
          `בשמחה! כדי להתקדם עם הפקדה—שלח/י הודעה לאחד המספרים שלנו:\n${list}`;
        const en =
          `Sure! To proceed with a deposit—please message one of our WhatsApp numbers:\n${list}`;
        return this.sendMessage(from, lang === "he" ? he : en);
      }

      // ----- GPT + הקשר (מבצעים + FAQ) -----
      const promos = await getPromos();
      const aiText = await generateSmartReply({
        userText: text,
        language: lang,
        promos,
        userProfile: { phone: String(from).replace("@c.us", "") },
        faq,
      });

      await this.sendMessage(from, aiText);
    } catch (err) {
      console.error("handleIncomingMessage error:", err);
    }
  }
}

module.exports = new Nextbet7GreenAPIBot();
