// NextBet7 WhatsApp Bot – Green API + GPT + FAQ/Promos
// env required: GREEN_API_INSTANCE_ID, GREEN_API_TOKEN, OPENAI_API_KEY, WEBHOOK_SECRET
// optional: DEPOSIT_TEAM_NUMBERS (comma separated), PORT

const express = require("express");
const axios = require("axios");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { generateSmartReply } = require("./ai");
const { getPromosText, promos } = require("./promos");
const { faq, getFaqText, matchFaq } = require("./faq");

class Nextbet7GreenAPIBot {
  constructor() {
    // === Green API creds ===
    this.instanceId =
      process.env.GREEN_API_INSTANCE_ID ||
      process.env.GREENAPI_INSTANCE_ID ||
      "";

    this.apiToken =
      process.env.GREEN_API_TOKEN ||
      process.env.GREENAPI_API_TOKEN ||
      "";

    // API base URL (שימו לב לפורמט)
    this.apiUrl = `https://${this.instanceId}.api.greenapi.com/waInstance${this.instanceId}`;

    // === In-memory state ===
    this.depositTeamNumbers =
      (process.env.DEPOSIT_TEAM_NUMBERS || "972524606685")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    this.customers = new Map();

    // === Express ===
    this.app = express();
    this.app.use(helmet());
    this.app.use(express.json({ limit: "1mb" }));

    // basic DDoS protection
    const limiter = rateLimit({
      windowMs: 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

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
    // health
    this.app.get("/", (_req, res) => res.send("NextBet7 Bot is online."));
    this.app.get("/health", (_req, res) => res.send("ok"));
    this.app.get("/status", (_req, res) => {
      res.json({
        status: "NextBet7 Bot is running!",
        ts: new Date().toISOString(),
        activeCustomers: this.customers.size,
        depositTeamNumbers: this.depositTeamNumbers,
      });
    });

    // secured webhook
    this.app.post("/webhook", async (req, res) => {
      const secret = req.headers["x-webhook-secret"];
      if (!secret || secret !== process.env.WEBHOOK_SECRET) {
        console.warn("🚫 סיסמה לא תואמת – webhook נדחה!");
        return res.status(403).send("Forbidden");
      }

      // מיידית 200 כדי למנוע timeouts
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

  // המוח של קבלת הודעות
  async handleIncomingMessage(notification) {
    try {
      const text =
        notification?.messageData?.textMessageData?.textMessage?.trim();
      const from =
        notification?.senderData?.chatId ||
        notification?.senderData?.sender; // בד"כ "9725...@c.us"
      if (!text || !from) return;

      const phone = String(from).replace("@c.us", "");

      // זיהוי שפה פשוט
      const lang = /[\u0590-\u05FF]/.test(text) ? "he" : "en";

      // ===== חוקים קצרים =====
      if (/^menu|תפריט$/i.test(text)) {
        const msg =
          lang === "he"
            ? [
                "📋 *תפריט מהיר*",
                "• כתבו *מבצעים* לקבלת כל המבצעים עם קישורים",
                "• כתבו *פתח* לפתיחת משתמש חדש",
                "• כתבו *הפקדה* לכל דרכי ההפקדה",
                "• כתבו *תקנון* ללינק לתקנון",
                "• כתבו *נציג* לשיחה עם נציג",
                "• או פשוט שאלו כל שאלה 👇",
              ].join("\n")
            : [
                "📋 *Quick Menu*",
                "• Type *promos* for all promotions",
                "• Type *register* to open a new account",
                "• Type *deposit* for all deposit methods",
                "• Type *terms* for site T&C",
                "• Type *agent* to talk with a human",
                "• Or just ask your question 👇",
              ].join("\n");
        return this.sendMessage(from, msg);
      }

      // מבצעים
      if (/^מבצעים$|^promo(s)?$/i.test(text)) {
        return this.sendMessage(from, getPromosText(lang));
      }

      // פתיחת משתמש
      if (/^פתח|register|להירשם/i.test(text)) {
        const regText =
          lang === "he"
            ? [
                "מעולה! כדי לפתוח משתמש חדש:",
                "שלח/י *שם מלא* + *שם משתמש רצוי* (בשורה אחת).",
                "לדוגמה: _נועם כהן nextwin_",
              ].join("\n")
            : [
                "Great! To open a new account:",
                "Send your *Full name* + *Desired username* in one line.",
                "Example: _John Doe nextwin_",
              ].join("\n");
        return this.sendMessage(from, regText);
      }

      // דרכי הפקדה
      if (/^הפקדה|deposit(s)?$/i.test(text)) {
        const depText =
          lang === "he"
            ? [
                "💳 *דרכי הפקדה זמינות*",
                "• כרטיס אשראי, Bit, העברה בנקאית, PayBox.",
                "• לקבלת סיוע בהפקדה, כתבו *נציג* או צרו קשר: ",
                ...this.depositTeamNumbers.map((n) => ` wa.me/${n}`),
              ].join("\n")
            : [
                "💳 *Available deposit methods*",
                "• Credit card, bank transfer, Bit, PayBox.",
                "• For help type *agent* or contact: ",
                ...this.depositTeamNumbers.map((n) => ` wa.me/${n}`),
              ].join("\n");
        return this.sendMessage(from, depText);
      }

      // תקנון
      if (/^תקנון|terms?$/i.test(text)) {
        const t =
          lang === "he"
            ? "📄 תקנון האתר: https://nextbet7.com/terms"
            : "📄 Terms: https://nextbet7.com/terms";
        return this.sendMessage(from, t);
      }

      // נציג
      if (/^נציג|agent$/i.test(text)) {
        const t =
          lang === "he"
            ? [
                "בשמחה! מעביר/ה אותך לנציג אנושי.",
                ...this.depositTeamNumbers.map((n) => `• https://wa.me/${n}`),
              ].join("\n")
            : [
                "Sure! Connecting you to a human agent.",
                ...this.depositTeamNumbers.map((n) => `• https://wa.me/${n}`),
              ].join("\n");
        return this.sendMessage(from, t);
      }

      // התאמה ל-FAQ
      const faqHit = matchFaq(text);
      if (faqHit) {
        return this.sendMessage(from, faqHit);
      }

      // ===== GPT + הקשר מבצעים/FAQ =====
      const aiText = await generateSmartReply({
        userText: text,
        language: lang,
        promos,
        faq,
        depositTeamNumbers: this.depositTeamNumbers,
        userProfile: { phone },
      });

      await this.sendMessage(from, aiText);
    } catch (err) {
      console.error("handleIncomingMessage error:", err);
    }
  }
}

module.exports = new Nextbet7GreenAPIBot();
