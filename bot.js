// NextBet7 WhatsApp Bot — Green API + GPT + Secure Webhook
// npm i express axios dotenv helmet express-rate-limit

const express = require("express");
const axios = require("axios");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { generateSmartReply } = require("./ai");     // נשאר כמו שיש אצלך
const { getPromos } = require("./promos");          // נשאר כמו שיש אצלך
const { faq } = require("./faq");                   // אופציונלי: אם הוספת FAQ

class Nextbet7GreenAPIBot {
  constructor() {
    // ===== Green API creds =====
    this.instanceId =
      process.env.GREEN_API_INSTANCE_ID ||
      process.env.GREENAPI_INSTANCE_ID ||
      "";
    this.apiToken =
      process.env.GREEN_API_TOKEN ||
      process.env.GREENAPI_API_TOKEN ||
      "";

    // Green API base URL (שינוי הדומיין לפי Green API)
    this.apiUrl = `https://${this.instanceId}.api.greenapi.com/waInstance${this.instanceId}`;

    // ===== In-memory state =====
    this.depositTeamNumbers = (process.env.DEPOSIT_TEAM_NUMBERS || "972524606685")
      .split(",")
      .map((s) => s.trim());
    this.customers = new Map();

    // ===== Express server =====
    this.app = express();
    this.app.use(express.json());
    this.app.use(helmet());
    this.app.use(
      rateLimit({
        windowMs: 60 * 1000,
        limit: 60,
        standardHeaders: "draft-7",
        legacyHeaders: false,
      })
    );

    this.setupRoutes();
    this.startServer();
  }

  startServer() {
    const port = process.env.PORT || 3000;
    this.app.listen(port, () => console.log(`Nextbet7 bot listening on ${port}`));
  }

  setupRoutes() {
    // בריאות
    this.app.get("/health", (req, res) => res.send("ok"));

    // סטטוס
    this.app.get("/status", (req, res) => {
      res.json({
        status: "NextBet7 Bot is running!",
        ts: new Date().toISOString(),
        activeCustomers: this.customers.size,
      });
    });

    // ===== Webhook (מאובטח ב-secret) =====
    this.app.post("/webhook", async (req, res) => {
      // 1) אימות מפתח סודי בכותרת:
      const secret = req.headers["x-webhook-secret"];
if (!secret || secret !== process.env.WEBHOOK_SECRET) {
  console.warn("❌ כניסה לא מורשית ל-webhook!");
  return res.status(403).send("Forbidden");
}

      // 2) להחזיר מהר 200 כדי למנוע timeouts ב-Green API
      res.status(200).send("OK");

      // 3) לוגיקה
      try {
        const notification = req.body;

        // מטפלים רק בהודעת טקסט נכנסת
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

  // שליחת הודעה דרך Green API
  async sendMessage(chatId, message) {
    try {
      const url = `${this.apiUrl}/sendMessage/${this.apiToken}`;
      await axios.post(url, {
        chatId: String(chatId).endsWith("@c.us") ? chatId : `${chatId}@c.us`,
        message,
      });
    } catch (err) {
      console.error("sendMessage error:", err?.response?.data || err.message);
    }
  }

  // קבלת הודעות
  async handleIncomingMessage(notification) {
    try {
      const text =
        notification?.messageData?.textMessageData?.textMessage?.trim();
      const from =
        notification?.senderData?.chatId || notification?.senderData?.sender; // "9725...@c.us"
      if (!text || !from) return;

      const lang = /[\u0590-\u05FF]/.test(text) ? "he" : "en";

      // ===== חוקים קצרים =====
      if (/^menu|תפריט$/i.test(text)) {
        const msg =
          lang === "he"
            ? "📋 תפריט: • 'פתח' – פתיחת משתמש • 'מבצעים' – הצגת מבצעים • 'נציג' – חיבור לנציג • 'תקנון' • 'עזרה'"
            : "📋 Menu: • register • promos • agent • terms • help";
        return this.sendMessage(from, msg);
      }

      if (/^מבצעים|promos?$/i.test(text)) {
        const promos = await getPromos();
        const list = promos
          .filter((p) => p.active)
          .map(
            (p) =>
              `• ${p.title} – ${p.short}${p.code ? ` (קוד: ${p.code})` : ""}${
                p.url ? `\n  ${p.url}` : ""
              }`
          )
          .join("\n\n");
        return this.sendMessage(
          from,
          list ||
            (lang === "he" ? "אין כרגע מבצעים פעילים." : "No active promos now.")
        );
      }

      if (/^פתח|register|להירשם/i.test(text)) {
        return this.sendMessage(
          from,
          lang === "he"
            ? "מעולה! שלח/י: שם מלא + שם משתמש רצוי (בשורה אחת)."
            : "Great! Send: Full name + desired username (one line)."
        );
      }

      if (/^נציג|agent$/i.test(text)) {
        const nums = this.depositTeamNumbers.map((n) => `• wa.me/${n}`).join("\n");
        return this.sendMessage(
          from,
          lang === "he"
            ? `מחברים לנציג אנושי:\n${nums}`
            : `Connecting you to a human agent:\n${nums}`
        );
      }

      if (/^תקנון|terms|policy$/i.test(text)) {
        const url = process.env.TERMS_URL || "https://nextbet7.example/terms";
        return this.sendMessage(
          from,
          lang === "he"
            ? `תקנון האתר: ${url}`
            : `Terms & Conditions: ${url}`
        );
      }

      if (/^עזרה|help|faq$/i.test(text)) {
        const lines =
          lang === "he"
            ? (faq.he || faq.en).slice(0, 6)
            : (faq.en || faq.he).slice(0, 6);
        return this.sendMessage(from, lines.join("\n"));
      }

      // ===== תשובת GPT עם הקשר מבצעים =====
      const promos = await getPromos();
      const aiText = await generateSmartReply({
        userText: text,
        language: lang,
        promos,
        userProfile: { phone: String(from).replace("@c.us", "") },
      });
      await this.sendMessage(from, aiText);
    } catch (err) {
      console.error("handleIncomingMessage error:", err);
    }
  }
}

module.exports = new Nextbet7GreenAPIBot();
