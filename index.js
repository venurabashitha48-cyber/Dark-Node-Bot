const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_darknode');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state
    });

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
┃ 📢 Channel : https://whatsapp.com/channel/0029VbENCSjEgGfKGzoqxw2X
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
                text: '📢 **Join our official WhatsApp Channel:**\n[ඔයාගේ WhatsApp Channel Link එක දාන්න]\n\nඅලුත්ම updates ලබා ගැනීමට අපගේ channel එකோடு இணைந்திருங்கள்!' 
            });
        }
    });
}

startBot();

