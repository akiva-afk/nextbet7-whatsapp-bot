// NextBet7 WhatsApp Bot – Green API + GPT + FAQ/Promos

const express = require("express");
const axios = require("axios");
require("dotenv").config();

const { generateSmartReply } = require("./ai");
const { getPromos } = require("./promos");
const { faq } = require("./faq");

class Nextbet7GreenAPIBot {
  constructor() {
    this.instanceId = process.env.GREEN_API_INSTANCE_ID || "";
    this.apiToken = process.env.GREEN_API_TOKEN || "";
    this.apiUrl = `https://${this.instanceId}.api.greenapi.com/waInstance${this.instanceId}`;
    this.depositTeamNumbers = process.env.DEPOSIT_TEAM_NUMBERS
      ? process.env.DEPOSIT_TEAM_NUMBERS.split(",")
      : [];

    this.customers = new Map();
    this.app = express();
    this.app.use(express.json());

    this.setupWebhook();
    this.startServer();
  }

  startServer() {
    const port = process.env.PORT || 3000;
    this.app.listen(port, () =>
      console.log(`Nextbet7 bot listening on ${port}`)
    );
  }

  setupWebhook() {
    this.app.get("/health", (req, res) => res.send("ok"));

    this.app.post("/webhook", async (req, res) => {
      // --- אימות SECRET ---
      const sentSecret =
        req.headers["x-webhook-secret"] ||
        req.get("x-webhook-secret") ||
        req.query.token;

      if (!sentSecret || sentSecret !== process.env.WEBHOOK_SECRET) {
        console.warn("🚫 webhook נדחה: secret חסר/שגוי");
        return res.status(403).send("Forbidden");
      }

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

  async handleIncomingMessage(notification) {
    try {
      const text =
        notification?.messageData?.textMessageData?.textMessage?.trim();
      const from =
        notification?.senderData?.chatId ||
        notification?.senderData?.sender;
      if (!text || !from) return;

      const lang = /[\u0590-\u05FF]/.test(text) ? "he" : "en";

      // תפריט בסיסי
      if (/^menu|תפריט$/i.test(text)) {
        const msg =
          lang === "he"
            ? "📋 תפריט: • 'פתח' – פתיחת משתמש • 'מבצעים' – הצגת מבצעים • 'שאלות' – שאלות נפוצות"
            : "📋 Menu: • 'register' • 'promos' • 'faq'";
        return this.sendMessage(from, msg);
      }

      // רשימת מבצעים
      if (/^מבצעים|promos?$/i.test(text)) {
        const promos = await getPromos();
        const list = promos
          .filter((p) => p.active)
          .map((p) => `• ${p.title} – ${p.short} (קוד: ${p.code || "N/A"})`)
          .join("\n");
        return this.sendMessage(
          from,
          list || (lang === "he" ? "אין כרגע מבצעים פעילים." : "No active promos.")
        );
      }

      // שאלות נפוצות
      if (/^שאלות|faq$/i.test(text)) {
        const list = faq
          .map((q) => `❓ ${q.q}\n✅ ${q.a}`)
          .join("\n\n");
        return this.sendMessage(from, list);
      }

      if (/^פתח|register|להירשם/i.test(text)) {
        return this.sendMessage(
          from,
          lang === "he"
            ? "מעולה! שלח/י: שם מלא + שם משתמש רצוי (בשורה אחת)."
            : "Great! Send: Full name + desired username (one line)."
        );
      }

      // GPT
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
