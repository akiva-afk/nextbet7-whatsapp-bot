// NextBet7 WhatsApp Bot – Green API + GPT
// npm i express axios dotenv

const express = require("express");
const axios = require("axios");
require("dotenv").config();

const { generateSmartReply } = require("./ai");
const { getPromos } = require("./promos");

class Nextbet7GreenAPIBot {
  constructor() {
    // ===== Green API creds (תוודא/י שה-env קיים בענן) =====
    this.instanceId =
      process.env.GREEN_API_INSTANCE_ID ||
      process.env.GREENAPI_INSTANCE_ID ||
      ""; // למשל: 7105263900

    this.apiToken =
      process.env.GREEN_API_TOKEN ||
      process.env.GREENAPI_API_TOKEN ||
      ""; // טוקן ארוך של Green-API

    // Green API base URL (פורמט דומיין לפי האינסטנס)
    this.apiUrl = `https://${this.instanceId}.api.greenapi.com/waInstance${this.instanceId}`;

    // ===== In-memory state =====
    this.depositTeamNumbers = ["972524606685"]; // דוגמה – אפשר לעדכן
    this.customers = new Map();

    // ===== Express server =====
    this.app = express();
    this.app.use(express.json());

    this.setupWebhook();
    this.startServer();
  }

  // ===== start server =====
  startServer() {
    const port = process.env.PORT || 3000;
    this.app.listen(port, () =>
      console.log(`Nextbet7 bot listening on ${port}`)
    );
  }

  // ===== webhook + health =====
  setupWebhook() {
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

    // Webhook מה-Green API
    this.app.post("/webhook", async (req, res) => {
      // חשוב: להחזיר מהר 200 כדי לא לקבל timeouts
      res.status(200).send("OK");

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

      // זיהוי שפה פשוט: עברית אם יש תווים עבריים
      const lang = /[\u0590-\u05FF]/.test(text) ? "he" : "en";

      // ----- חוקים קצרים (לפני GPT) -----
      if (/^menu|תפריט$/i.test(text)) {
        const msg =
          lang === "he"
            ? "📋 תפריט: • 'פתח' – פתיחת משתמש • 'מבצעים' – הצגת מבצעים • 'נציג' – חיבור לנציג"
            : "📋 Menu: • 'register' • 'promos' • 'agent'";
        return this.sendMessage(from, msg);
      }

      if (/^מבצעים|promos?$/i.test(text)) {
        const promos = await getPromos();
        const list = promos
          .filter((p) => p.active)
          .map(
            (p) => `• ${p.title} – ${p.short} (קוד: ${p.code || "N/A"})`
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

      if (/^פתח|register|להירשם/i.test(text)) {
        return this.sendMessage(
          from,
          lang === "he"
            ? "מעולה! שלח/י: שם מלא + שם משתמש רצוי (בשורה אחת)."
            : "Great! Send: Full name + desired username (one line)."
        );
      }

      // ----- GPT + הקשר מבצעים -----
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

// יצוא אובייקט (start.js עושה require על הקובץ הזה)
module.exports = new Nextbet7GreenAPIBot();
