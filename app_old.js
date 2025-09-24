const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// פונקציה לשליחת הודעות WhatsApp דרך Green API
async function sendWhatsAppMessage(to, message) {
  try {
    const instanceId = process.env.GREEN_API_INSTANCE_ID;
    const token = process.env.GREEN_API_TOKEN;
    
    if (!instanceId || !token) {
      console.error('Green API credentials not found');
      return;
    }

    const response = await fetch(`https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId: `${to}@c.us`,
        message: message
      })
    });

    if (response.ok) {
      console.log('WhatsApp message sent successfully to:', to);
    } else {
      console.error('Failed to send WhatsApp message:', response.statusText);
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
}

// פונקציה לקבלת תשובה מ-GPT
async function getChatGPTResponse(message) {
  try {
    // זמנית נשתמש בתשובה קבועה עד שנוסיף API key
    if (!process.env.OPENAI_API_KEY) {
      return `שלום! אני הסוכן הוירטואלי של Nextbet 🎰
      
קיבלתי את ההודעה שלך: "${message}"

איך אוכל לעזור לך היום? 
• פתיחת חשבון חדש
• שאלות על משחקים  
• בעיות טכניות
• כל דבר אחר!

אני כאן בשבילך 24/7 😊`;
    }
    
    const { Configuration, OpenAIApi } = require("openai");
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);
    
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system", 
          content: "אתה סוכן שירות לקוחות ידידותי וחברותי של Nextbet. ענה בעברית באופן חם ואנושי. עזור ללקוחות עם הימורים, משחקים וחשבון. תמיד היה אופטימי ותומך."
        },
        {
          role: "user", 
          content: message
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });
    
    return completion.data.choices[0].message.content;
  } catch (error) {
    console.error('Error with ChatGPT:', error);
    return "שלום! אני הסוכן הוירטואלי של Nextbet. איך אוכל לעזור לך היום? 😊";
  }
}

// Webhook endpoint - מקבל הודעות מ-WhatsApp ושולח תשובות
app.post('/webhook', async (req, res) => {
  try {
// Skip webhook verification
    console.log('Received webhook:', JSON.stringify(req.body, null, 2));
    
    // בדוק אם זה הודעה רגילה
    const message = req.body.messages?.[0]?.text?.body;
    const from = req.body.messages?.[0]?.from;
    
    if (message && from) {
      console.log(`Message from ${from}: ${message}`);
      
      // קבל תשובה מהבוט
      const botResponse = await getChatGPTResponse(message);
      console.log('Bot Response:', botResponse);
      
      // שלח את התשובה חזרה לווטסאפ
      await sendWhatsAppMessage(from, botResponse);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});

// דף בדיקה
app.get('/', (req, res) => {
  res.send(`
    <h1>Nextbet WhatsApp Bot is running! 🤖</h1>
    <p>Server Status: Active</p>
    <p>Port: ${port}</p>
    <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
  `);
});

// נתיב לבדיקת בריאות המערכת
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    port: port,
    greenApi: !!(process.env.GREEN_API_INSTANCE_ID && process.env.GREEN_API_TOKEN),
    openAi: !!process.env.OPENAI_API_KEY
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});