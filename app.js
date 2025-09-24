const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// מאגר זיכרון לקוחות (במציאות יהיה במסד נתונים)
const customerMemory = new Map();

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

// זיהוי סוג לקוח ומצב רגשי
function analyzeCustomer(message, customerHistory) {
  const urgentWords = ['דחוף', 'מיידי', 'עכשיו', 'בעיה', 'לא עובד', 'תקוע'];
  const angerWords = ['כועס', 'זעם', 'מתנרבן', 'חרא', 'גרוע', 'נורא'];
  const newUserWords = ['חדש', 'ראשון', 'התחלה', 'מתחיל', 'איך'];
  const vipWords = ['vip', 'משקיע', 'גדול', 'חשוב'];

  let customerType = 'regular';
  let mood = 'neutral';
  let urgency = 'normal';

  // זיהוי מצב רגשי
  if (angerWords.some(word => message.includes(word))) {
    mood = 'angry';
  }
  
  if (urgentWords.some(word => message.includes(word))) {
    urgency = 'high';
  }

  // זיהוי סוג לקוח
  if (newUserWords.some(word => message.includes(word)) || !customerHistory.length) {
    customerType = 'new';
  } else if (vipWords.some(word => message.includes(word)) || customerHistory.length > 10) {
    customerType = 'vip';
  }

  return { customerType, mood, urgency };
}

// פונקציה מתקדמת לקבלת תשובה מ-GPT עם התאמה אישית
async function getProfessionalChatGPTResponse(message, from) {
  try {
    // שליפת היסטוריה
    let customerHistory = customerMemory.get(from) || [];
    
    // ניתוח לקוח
    const analysis = analyzeCustomer(message, customerHistory);
    
    // בניית prompt מותאם
    let systemPrompt = `אתה נציג שירות לקוחות מקצועי של Nextbet - אתר הימורים מוביל בישראל.

עקרונות תפעול:
- דבר בעברית חמה וידידותית
- השתמש בדוגריות ישראלית (ישיר וכנה)
- תמיד הציע פתרונות מעשיים
- זכור שההימורים צריכים להיות בכיף ובאחריות

פרטי הלקוח הנוכחי:
- סוג לקוח: ${analysis.customerType}
- מצב רגשי: ${analysis.mood}
- רמת דחיפות: ${analysis.urgency}

התנהגות לפי סוג לקוח:`;

    if (analysis.customerType === 'new') {
      systemPrompt += `
- הלקוח חדש - הסבר הכל בפשטות
- הצע הדרכה שלב אחר שלב
- דגיש בטיחות והימורים אחראיים
- השתמש במילים: "בואו נתחיל", "זה פשוט", "אני אדריך אותך"`;
    } else if (analysis.customerType === 'vip') {
      systemPrompt += `
- הלקוח VIP - יחס מכבד ומקצועי
- הצע שירותים מתקדמים
- הזכר יתרונות VIP
- השתמש במילים: "כמובן", "בוודאי", "נטפל בזה מיד"`;
    }

    if (analysis.mood === 'angry') {
      systemPrompt += `
- הלקוח כועס - הראה הבנה ואמפתיה
- הכר בתסכול שלו
- הציע פתרון מיידי
- השתמש במילים: "אני מבין", "בואו נפתור", "זה באמת מעצבן"`;
    }

    systemPrompt += `

נושאים עיקריים שאתה יודע לטפל בהם:
- פתיחת חשבון והרשמה
- הפקדות ומשיכות
- הסבר משחקים (ספורט, קזינו, פוקר)
- בעיות טכניות
- בונוסים ומבצעים
- הימורים אחראיים

כלל זהב: תמיד סיים עם שאלה או הצעה לעזרה נוספת.`;

    // שליחה ל-ChatGPT
    if (!process.env.OPENAI_API_KEY) {
      return generateFallbackResponse(analysis, message);
    }
    
    const { Configuration, OpenAIApi } = require("openai");
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);
    
    // בניית הודעות עם היסטוריה
    const messages = [
      { role: "system", content: systemPrompt },
      ...customerHistory.slice(-6), // 6 הודעות אחרונות
      { role: "user", content: message }
    ];
    
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: messages,
      max_tokens: 500,
      temperature: 0.7
    });
    
    const response = completion.data.choices[0].message.content;
    
    // שמירת השיחה בזיכרון
    customerHistory.push({ role: "user", content: message });
    customerHistory.push({ role: "assistant", content: response });
    customerMemory.set(from, customerHistory);
    
    return response;
    
  } catch (error) {
    console.error('Error with ChatGPT:', error);
    return generateFallbackResponse(analyzeCustomer(message, []), message);
  }
}

// תשובות גיבוי מקצועיות כשGPT לא זמין
function generateFallbackResponse(analysis, message) {
  const responses = {
    new: {
      neutral: "שלום ובאזר לאתר Nextbet! אני כאן לעזור לך להתחיל. מה תרצה לדעת - איך נרשמים, איך מפקידים או איך מתחילים להמר? בואו נעשה את זה יחד צעד אחר צעד.",
      angry: "אני מבין שמשהו לא עובד כמו שצריך. בתור לקוח חדש, חשוב לי שתקבל חוויה מושלמת. בואו נפתור את זה מיד - מה בדיוק הבעיה?",
      high: "אני רואה שזה דחוף! אני כאן לעזור מיד. מה קרה ואיך אני יכול לפתור לך את זה עכשיו?"
    },
    vip: {
      neutral: "שלום! תודה שבחרת ב-Nextbet. כמובן שכלקוח VIP אתה מקבל יחס מועדף. איך אוכל לסייע לך היום?",
      angry: "אני מתנצל על אי הנוחות. כלקוח VIP שלנו, זה לא המקובל. אני אטפל בזה אישית ומיד. מה הבעיה בדיוק?",
      high: "מבין שזה דחוף. כVIP אתה מקבל טיפול מיידי. אני כאן ונטפל בזה עכשיו."
    },
    regular: {
      neutral: "שלום! איך אוכל לעזור לך היום? אני כאן לכל שאלה על הימורים, חשבון או משהו טכני.",
      angry: "אני מבין את התסכול שלך וזה לגיטימי לגמרי. בואו נפתור את זה יחד - מה הבעיה?",
      high: "אני רואה שזה דחוף בשבילך. אני כאן לעזור מיד - מה קורה?"
    }
  };

  return responses[analysis.customerType][analysis.mood] || responses.regular.neutral;
}

// Webhook endpoint - מקבל הודעות מ-WhatsApp ושולח תשובות מקצועיות
app.post('/webhook', async (req, res) => {
  try {
    // Skip webhook verification for now
    console.log('Received webhook:', JSON.stringify(req.body, null, 2));
    
    const message = req.body.messages?.[0]?.text?.body;
    const from = req.body.messages?.[0]?.from;
    
    if (message && from) {
      console.log(`Message from ${from}: ${message}`);
      
      // קבל תשובה מקצועית מהבוט
      const botResponse = await getProfessionalChatGPTResponse(message, from);
      console.log('Professional Response:', botResponse);
      
      // שלח את התשובה חזרה לווטסאפ
      await sendWhatsAppMessage(from, botResponse);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});

// דף בדיקה מתקדם
app.get('/', (req, res) => {
  res.send(`
    <h1>Nextbet Professional WhatsApp Bot</h1>
    <h2>System Status</h2>
    <p><strong>Port:</strong> ${port}</p>
    <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
    <p><strong>Active Customers:</strong> ${customerMemory.size}</p>
    
    <h2>Features</h2>
    <ul>
      <li>Customer Type Recognition</li>
      <li>Emotional Intelligence</li>
      <li>Conversation Memory</li>
      <li>Hebrew Cultural Adaptation</li>
      <li>Responsible Gambling Protocols</li>
    </ul>
  `);
});

// נתיב לבדיקת בריאות המערכת המתקדם
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    port: port,
    customerMemory: customerMemory.size,
    features: {
      greenApi: !!(process.env.GREEN_API_INSTANCE_ID && process.env.GREEN_API_TOKEN),
      openAi: !!process.env.OPENAI_API_KEY,
      customerTracking: true,
      emotionalIntelligence: true,
      hebrewSupport: true
    }
  });
});

app.listen(port, () => {
  console.log(`Professional Nextbet Bot running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Dashboard: http://localhost:${port}`);
});
