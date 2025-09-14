// NextBet7 WhatsApp Bot – Green API + GPT + FAQ
// npm i express axios dotenv helmet express-rate-limit

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
    // ===== Credentials =====
    this.instanceId = process.env.GREEN_API_INSTANCE_ID || "";
    this.apiToken = process.env.GREEN_API_TOKEN || "";
    this.apiUrl = `https://${this.instanceId}.api.greenapi.com/waInstance${this.instanceId}`;

    // מספרי וואטסאפ מה-ENV
    this.depositTeamNumbers = process.env.DEPOSIT_NUMBERS
      ? process.env.DEPOSIT_NUMBERS.split(",")
      : ["972524606685"]; 

    this.customers = new Map();

    // ===== Express App =====
    this.app = express();
    this.app.use(express.json());
    this.app.use(helmet());
    this.app.use(rateLimit({ windowMs: 60 * 1000, max: 30 })); // 30 בקשות לדקה

    this.setupWebhook();
    this.startServer();
  }

  startServer() {
    const port = process.env.PORT || 3000;
    this.app.listen(port, () =>
      console.log(`✅ Nextbet7 bot running on port ${port}`)
    );
  }

  setupWebhook() {
    this.app.get("/health", (req, res) => res.send("ok"));
    this.app.get("/status", (req, res) =>
      res.json({
        status: "NextBet7 Bot is running!",
        ts: new Date().toISOString(),
        activeCustomers: this.customers.size,
      })
    );

    this.app.post("/webhook", async (req, res) => {
      const secret = req.headers["x-webhook-secret"];
      if (!secret || secret !== process.env.WEBHOOK_SECRET) {
        console.warn("⛔ ניסיון גישה לא מורשה ל-webhook!");
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
      } catch (err) {
        console.error("❌ שגיאה בטיפול בהודעה:", err);
      }
    });
  }

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

  async handleIncomingMessage(notification) {
    try {
      const text =
        notification?.messageData?.textMessageData?.textMessage?.trim();
      const from =
        notification?.senderData?.chatId ||
        notification?.senderData?.sender;
      if (!text || !from) return;

      const lang = /[\u0590-\u05FF]/.test(text) ? "he" : "en";

      // ===== FAQ: תשובות מובנות =====
      const faqMatch = faq.find((item) => item.q.test(text));
      if (faqMatch) {
        return this.sendMessage(from, faqMatch.a);
      }

      // ===== פקודות קבועות =====
      if (/^מבצעים|promos?$/i.test(text)) {
        const promos = await getPromos();
        const list = promos
          .filter((p) => p.active)
          .map(
            (p) =>
              `• ${p.title} – ${p.short}\n🔗 ${p.link || "ללא לינק"}`
          )
          .join("\n");
        return this.sendMessage(
          from,
          list || (lang === "he" ? "אין כרגע מבצעים פעילים." : "No active promos now.")
        );
      }

      if (/^פתח|register|להירשם/i.test(text)) {
        return this.sendMessage(
          from,
          lang === "he"
            ? `מעולה! שלח/י שם מלא + שם משתמש רצוי.\n📞 צוות ההפקדות: ${this.depositTeamNumbers.join(", ")}`
            : `Great! Send full name + username.\n📞 Deposit team: ${this.depositTeamNumbers.join(", ")}`
        );
      }

      // ===== GPT תשובה חכמה =====
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
