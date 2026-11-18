const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_darknode');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // QR code එක පෙන්වන එක off කර ඇත
        auth: state
    });

    // Pairing Code එක ලබා ගැනීම සඳහා අංකය ඇතුළත් කිරීම
    if (!sock.authState.creds.registered) {
        const phoneNumber = await question('\n📱 Enter your WhatsApp phone number (with country code, e.g., 947xxxxxxxx): ');
        await delay(3000);
        try {
            const code = await sock.requestPairingCode(phoneNumber.trim());
            console.log(`\n========================================`);
            console.log(`🔑 YOUR PAIRING CODE IS: ${code}`);
            console.log(`========================================\n`);
        } catch (error) {
            console.error('Failed to get pairing code, please restart.', error);
        }
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('🤖 Dark_Node Bot 24/7 Online & Connected Successfully!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (!text) return;
        const cmd = text.toLowerCase();

        if (cmd === '.menu' || cmd === 'hi' || cmd === 'hello' || cmd === 'menu') {
            let menuCaption = `
╭━━〔 **DARK_NODE BOT** 〕━━┈⊷
┃ 👑 Owner : Venura Bashitha
┃ ⚙️ Mode : PUBLIC
┃ 🎛️ Prefix : .
┃ 📢 Channel : https://whatsapp.com/channel/0029VbENCSjEgGkGzC5j5w2U
╰━━━━━━━━━━━━━━━⊷

👋 **සාදරයෙන් පිළිගනිමු! Dark_Node bot සේවාවට ඔබව සාදරයෙන් පිළිගනිමු.** 

🔻 **SELECT CATEGORY BELOW**

📥 \`.download\` - Download media & videos
🎨 \`.logo\` - Generate stylish logos
🎬 \`.movie\` - Movie status & clips
🛠️ \`.tools\` - Useful utilities

©️ **Created by Venura Bashitha**
            `;

            await sock.sendMessage(sender, { 
                image: { url: 'https://i.ibb.co/108661/dark-node.jpg' }, 
                caption: menuCaption 
            });
        }
        else if (cmd === '.channel' || cmd === '.ch') {
            await sock.sendMessage(sender, { 
                text: '📢 **Join our official WhatsApp Channel:**\nhttps://whatsapp.com/channel/0029VbENCSjEgGkGzC5j5w2U\n\nඅලුත්ම updates ලබා ගැනීමට අපගේ channel එකோடு இணைந்திருங்கள்!' 
            });
        }
    });
}

startBot();
