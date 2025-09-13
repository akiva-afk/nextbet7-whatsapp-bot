// NextBet7 WhatsApp Bot - Green API Version
// npm install express axios dotenv

const express = require('express');
const axios = require('axios');
require('dotenv').config();

class NextBet7GreenAPIBot {
    constructor() {
        // הגדרות Green API
        this.instanceId = process.env.GREEN_API_INSTANCE_ID || '7105263900';
        this.apiToken = process.env.GREEN_API_TOKEN || '8007f17af4724025be26fc0968d50f9eeb36896063644458681';
        this.apiUrl = `https://api.green-api.com/waInstance${this.instanceId}`;
        
        // מספר משרד הפקדות ומשיכות
        this.depositTeamNumbers = [
            '972524066085' // משרד הפקדות ומשיכות NextBet7
        ];
        
        // מאגר נתוני לקוחות
        this.customers = new Map();
        
        // הגדרת Express server
        this.app = express();
        this.app.use(express.json());
        
        this.setupWebhook();
        this.startServer();
    }

    setupWebhook() {
        // Webhook שמקבל הודעות מ-Green API
        this.app.post('/webhook', async (req, res) => {
            try {
                const notification = req.body;
                
                // בדיקה שזו הודעה נכנסת
                if (notification.typeWebhook === 'incomingMessageReceived') {
                    await this.handleIncomingMessage(notification);
                }
                
                res.status(200).send('OK');
            } catch (error) {
                console.error('❌ שגיאה בטיפול בהודעה:', error);
                res.status(500).send('Error');
            }
        });

        // דף בדיקת סטטוס
        this.app.get('/status', (req, res) => {
            res.json({
                status: 'NextBet7 Bot is running! 🎰',
                timestamp: new Date().toISOString(),
                activeCustomers: this.customers.size
            });
        });
    }

    async handleIncomingMessage(notification) {
        const messageData = notification.messageData;
        const senderData = notification.senderData;
        
        // התעלם מהודעות קבוצתיות
        if (senderData.chatId.includes('@g.us')) return;
        
        const customerNumber = senderData.chatId.replace('@c.us', '');
        const messageText = messageData.textMessageData?.textMessage || '';
        
        console.log(`📱 הודעה מ-${customerNumber}: ${messageText}`);
        
        // טיפול בהודעה
        await this.processMessage(customerNumber, messageText, senderData.chatId);
    }

    async processMessage(customerNumber, messageText, chatId) {
        // בדיקה אם זה לקוח קיים
        let customer = this.customers.get(customerNumber);
        
        if (!customer) {
            // לקוח חדש
            customer = {
                phone: customerNumber,
                chatId: chatId,
                stage: 'welcome',
                data: {},
                language: this.detectLanguage(messageText),
                lastActivity: new Date()
            };
            this.customers.set(customerNumber, customer);
        }
        
        customer.lastActivity = new Date();
        await this.processCustomerStage(customer, messageText);
    }

    detectLanguage(text) {
        const hebrewPattern = /[\u0590-\u05FF]/;
        const arabicPattern = /[\u0600-\u06FF]/;
        const russianPattern = /[\u0400-\u04FF]/;
        
        if (hebrewPattern.test(text)) return 'he';
        if (arabicPattern.test(text)) return 'ar';
        if (russianPattern.test(text)) return 'ru';
        if (text.toLowerCase().includes('bonjour') || text.toLowerCase().includes('merci')) return 'fr';
        
        return 'he'; // ברירת מחדל
    }

    async processCustomerStage(customer, messageText) {
        const messages = this.getMessages(customer.language);
        
        switch (customer.stage) {
            case 'welcome':
                await this.sendWelcomeMessage(customer, messages);
                break;
                
            case 'get_name':
                await this.handleNameInput(customer, messageText, messages);
                break;
                
            case 'check_existing_user':
                await this.handleExistingUserCheck(customer, messageText, messages);
                break;
                
            case 'get_username':
                await this.handleUsernameInput(customer, messageText, messages);
                break;
                
            case 'choose_service':
                await this.handleServiceChoice(customer, messageText, messages);
                break;
                
            case 'deposit_process':
                await this.handleDepositProcess(customer, messages);
                break;
                
            case 'technical_support':
                await this.handleTechnicalSupport(customer, messageText, messages);
                break;
        }
        
        // שמירה ב-CRM
        await this.saveToCRM(customer);
    }

    async sendMessage(chatId, message) {
        try {
            const response = await axios.post(
                `${this.apiUrl}/sendMessage/${this.apiToken}`,
                {
                    chatId: chatId,
                    message: message
                }
            );
            
            console.log(`✅ הודעה נשלחה ל-${chatId}`);
            return response.data;
        } catch (error) {
            console.error(`❌ שגיאה בשליחת הודעה ל-${chatId}:`, error.response?.data || error.message);
        }
    }

    async sendWelcomeMessage(customer, messages) {
        const welcomeMsg = `${messages.welcome} NextBet7! 🎰

${messages.intro}

${messages.askName}`;

        await this.sendMessage(customer.chatId, welcomeMsg);
        customer.stage = 'get_name';
    }

    async handleNameInput(customer, messageText, messages) {
        customer.data.name = messageText.trim();
        
        const nameConfirmMsg = `${messages.niceToMeet} ${customer.data.name}! 

${messages.existingUser}

1️⃣ ${messages.existingYes}
2️⃣ ${messages.existingNo}`;

        await this.sendMessage(customer.chatId, nameConfirmMsg);
        customer.stage = 'check_existing_user';
    }

    async handleExistingUserCheck(customer, messageText, messages) {
        const choice = messageText.trim();
        
        if (choice === '1' || choice.includes(messages.yes)) {
            customer.data.isExisting = true;
            await this.sendMessage(customer.chatId, messages.askUsername);
            customer.stage = 'get_username';
        } else if (choice === '2' || choice.includes(messages.no)) {
            customer.data.isExisting = false;
            await this.showServiceMenu(customer, messages);
        } else {
            await this.sendMessage(customer.chatId, messages.invalidChoice);
        }
    }

    async handleUsernameInput(customer, messageText, messages) {
        customer.data.username = messageText.trim();
        
        await this.sendMessage(customer.chatId, `${messages.usernameReceived} ${customer.data.username}`);
        await this.showServiceMenu(customer, messages);
    }

    async showServiceMenu(customer, messages) {
        const serviceMenu = `${messages.howCanHelp}

1️⃣ ${messages.newRegistration}
2️⃣ ${messages.deposit}
3️⃣ ${messages.withdrawal}
4️⃣ ${messages.bonusInfo}
5️⃣ ${messages.technicalSupport}
6️⃣ ${messages.humanAgent}`;

        await this.sendMessage(customer.chatId, serviceMenu);
        customer.stage = 'choose_service';
    }

    async handleServiceChoice(customer, messageText, messages) {
        const choice = messageText.trim();
        
        switch (choice) {
            case '1':
                await this.handleNewRegistration(customer, messages);
                break;
            case '2':
                await this.handleDepositProcess(customer, messages);
                break;
            case '3':
                await this.handleWithdrawal(customer, messages);
                break;
            case '4':
                await this.handleBonusInfo(customer, messages);
                break;
            case '5':
                customer.stage = 'technical_support';
                await this.sendMessage(customer.chatId, messages.describeProblem);
                break;
            case '6':
                await this.transferToHuman(customer, messages);
                break;
            default:
                await this.sendMessage(customer.chatId, messages.invalidChoice);
                await this.showServiceMenu(customer, messages);
        }
    }

    async handleDepositProcess(customer, messages) {
        const depositMsg = `${messages.depositProcess}

${messages.contactingDepositTeam}`;

        await this.sendMessage(customer.chatId, depositMsg);
        
        // שליחת פרטי הלקוח לצוות הפקדות
        await this.notifyDepositTeam(customer, messages);
        
        customer.stage = 'completed';
    }

    async notifyDepositTeam(customer, messages) {
        const notification = `🔔 לקוח חדש להפקדה - NextBet7:

👤 שם: ${customer.data.name}
📱 טלפון: ${customer.phone}
🔐 משתמש קיים: ${customer.data.isExisting ? 'כן' : 'לא'}
${customer.data.username ? `🆔 שם משתמש: ${customer.data.username}` : ''}
🌐 שפה: ${customer.language}
⏰ זמן: ${new Date().toLocaleString('he-IL')}

אנא צרו קשר עם הלקוח בהקדם האפשרי! 🚀`;

        // שליחה לכל חברי צוות ההפקדות
        for (const teamNumber of this.depositTeamNumbers) {
            const teamChatId = `${teamNumber}@c.us`;
            await this.sendMessage(teamChatId, notification);
            console.log(`📤 התראה נשלחה לצוות: ${teamNumber}`);
        }
    }

    async handleNewRegistration(customer, messages) {
        const registrationMsg = `${messages.newRegistrationProcess}

🔗 קישור לרישום: https://nextbet7.com/register
📱 או צרו קשר עם הצוות שלנו לעזרה בתהליך`;

        await this.sendMessage(customer.chatId, registrationMsg);
        customer.stage = 'completed';
    }

    async handleWithdrawal(customer, messages) {
        const withdrawalMsg = `${messages.withdrawalProcess}

צוות המשיכות שלנו יצור איתך קשר בקרוב.`;

        await this.sendMessage(customer.chatId, withdrawalMsg);
        customer.stage = 'completed';
    }

    async handleBonusInfo(customer, messages) {
        const bonusMsg = `🎁 הבונוסים הזמינים היום:

💰 בונוס הפקדה ראשונה - עד 100%!
🎯 בונוס ללקוחות קיימים - 50%
🔄 קשבק שבועי - עד 20%

לפרטים מלאים - צרו קשר עם הצוות שלנו!`;

        await this.sendMessage(customer.chatId, bonusMsg);
        customer.stage = 'completed';
    }

    async handleTechnicalSupport(customer, messageText, messages) {
        customer.data.technicalIssue = messageText;
        
        const techResponseMsg = `${messages.technicalReceived}

הצוות הטכני שלנו יטפל בבעיה ויחזור אליך בהקדם.`;

        await this.sendMessage(customer.chatId, techResponseMsg);
        customer.stage = 'completed';
    }

    async transferToHuman(customer, messages) {
        await this.sendMessage(customer.chatId, messages.transferToHuman);
        
        // התראה לצוות על העברה לנציג
        const humanTransferNotification = `👨‍💼 העברה לנציג אנושי:

👤 שם: ${customer.data.name}
📱 טלפון: ${customer.phone}
⏰ זמן: ${new Date().toLocaleString('he-IL')}

הלקוח ביקש לדבר עם נציג אנושי.`;

        for (const teamNumber of this.depositTeamNumbers) {
            const teamChatId = `${teamNumber}@c.us`;
            await this.sendMessage(teamChatId, humanTransferNotification);
        }
        
        customer.stage = 'human_transfer';
    }

    getMessages(language) {
        const messages = {
            'he': {
                welcome: 'שלום וברוכים הבאים ל',
                intro: 'אני הבוט החכם שלנו ואני כאן לעזור לכם בכל שאלה או בקשה.',
                askName: 'איך קוראים לך?',
                niceToMeet: 'נעים להכיר',
                existingUser: 'האם יש לך כבר חשבון משתמש אצלנו?',
                existingYes: 'כן, יש לי חשבון',
                existingNo: 'לא, אני חדש כאן',
                yes: 'כן',
                no: 'לא',
                askUsername: 'מה שם המשתמש שלך?',
                usernameReceived: 'תודה! קיבלתי את פרטי המשתמש:',
                howCanHelp: 'איך אוכל לעזור לך היום?',
                newRegistration: '🆕 רישום חדש',
                deposit: '💰 הפקדה',
                withdrawal: '💳 משיכה',
                bonusInfo: '🎁 מידע על בונוסים',
                technicalSupport: '🔧 תמיכה טכנית',
                humanAgent: '👨‍💼 נציג אנושי',
                invalidChoice: 'אנא בחר אפשרות תקינה מהרשימה.',
                depositProcess: '💰 נהדר! אנחנו נדאג שצוות ההפקדות שלנו יצור איתך קשר בהקדם.',
                contactingDepositTeam: 'הצוות שלנו פעיל 24/7 ויחזור אליך תוך דקות ספורות!',
                describeProblem: 'אנא תאר את הבעיה הטכנית ואנחנו נעזור לך לפתור אותה.',
                transferToHuman: 'מעביר אותך לנציג אנושי. אנא המתן...',
                newRegistrationProcess: '🆕 תהליך רישום פשוט ומהיר!',
                withdrawalProcess: '💳 תהליך משיכה מהיר ובטוח',
                technicalReceived: '🔧 תודה! קיבלנו את פנייתך הטכנית.'
            }
        };
        
        return messages[language] || messages['he'];
    }

    async saveToCRM(customer) {
        try {
            const crmData = {
                phone: customer.phone,
                name: customer.data.name,
                username: customer.data.username,
                isExisting: customer.data.isExisting,
                language: customer.language,
                stage: customer.stage,
                technicalIssue: customer.data.technicalIssue,
                timestamp: new Date().toISOString()
            };
            
            console.log('💾 נתונים נשמרו ב-CRM:', crmData);
        } catch (error) {
            console.error('❌ שגיאה בשמירה ב-CRM:', error);
        }
    }

    startServer() {
        const PORT = process.env.PORT || 3000;
        this.app.listen(PORT, () => {
            console.log(`🚀 NextBet7 Bot רץ על פורט ${PORT}`);
            console.log(`📱 Instance ID: ${this.instanceId}`);
            console.log(`🔗 Webhook URL: http://localhost:${PORT}/webhook`);
        });
    }
}

// הפעלת הבוט
const bot = new NextBet7GreenAPIBot();

module.exports = NextBet7GreenAPIBot;
