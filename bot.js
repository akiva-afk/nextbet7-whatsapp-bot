this.app.post("/webhook", async (req, res) => {
  // שלב 1: החזרת תשובה מידית ל-Green API כדי למנוע timeout
  res.status(200).send("OK");

  try {
    // שלב 2: קריאת ה-Header ושליפת ה-Secret שנשלח
    const receivedSecret = req.headers["x-webhook-secret"];

    // הדפסת ה-Secret ללוגים (לעוד שלב בדיקה – תוכל להסיר אחר כך)
    console.log("🔑 Received secret:", receivedSecret);
    console.log("🔑 Expected secret:", process.env.WEBHOOK_SECRET);

    // שלב 3: השוואה מול מה שמוגדר ב-ENV
    if (!receivedSecret || receivedSecret.trim() !== process.env.WEBHOOK_SECRET.trim()) {
      console.warn("🚫 Webhook rejected – secret mismatch!");
      return; // יוצאים בלי להריץ את שאר הלוגיקה
    }

    // שלב 4: טיפול בהודעה במידה והאימות עבר בהצלחה
    const notification = req.body;
    if (
      notification?.typeWebhook === "incomingMessageReceived" ||
      notification?.messageData?.textMessageData
    ) {
      await this.handleIncomingMessage(notification);
    }
  } catch (err) {
    console.error("❌ שגיאה בטיפול ב-webhook:", err);
  }
});
