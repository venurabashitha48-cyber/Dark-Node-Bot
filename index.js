const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require("@whiskeysockets/baileys");
const express = require('express');
const pino = require('pino');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let pairingCodeGlobal = "Not Generated Yet";
let botStatus = "Disconnected";

async function startBot(phoneNumber, res) {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.macOS("Chrome")
    });

    if (!sock.authState.creds.registered) {
        if (phoneNumber) {
            setTimeout(async () => {
                let code = await sock.requestPairingCode(phoneNumber.trim());
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                pairingCodeGlobal = code;
                botStatus = "Waiting for Pairing";
                if (res && !res.headersSent) {
                    res.json({ status: "success", code: code });
                }
            }, 3000);
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            botStatus = "Connected Successfully!";
            console.log('Bot Connected Successfully!');
        } else if (connection === 'close') {
            botStatus = "Disconnected";
            let reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                // Reconnect if needed
            }
        }
    });
}

// Web UI for getting pairing code easily
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>Dark-Node-Bot Pairing</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: Arial, sans-serif; background: #0f172a; color: #fff; text-align: center; padding: 50px 20px; }
                .card { background: #1e293b; padding: 30px; border-radius: 12px; max-width: 400px; margin: auto; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
                input { width: 85%; padding: 12px; margin: 10px 0; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #fff; font-size: 16px; }
                button { background: #22c55e; color: white; border: none; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold; width: 90%; }
                button:hover { background: #16a34a; }
                .code-box { font-size: 24px; color: #38bdf8; font-weight: bold; margin-top: 20px; background: #0f172a; padding: 15px; border-radius: 6px; border: 1px dashed #38bdf8; }
                .status { margin-top: 15px; font-size: 14px; color: #cbd5e1; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>Dark-Node-Bot Pairing</h2>
                <form action="/pair" method="POST">
                    <input type="text" name="phone" placeholder="Enter WhatsApp No (e.g. 9477xxxxxxx)" required /><br>
                    <button type="submit">Get Pairing Code</button>
                </form>
                <div class="status">Status: ${botStatus}</div>
                <div class="code-box">${pairingCodeGlobal}</div>
            </div>
        </body>
        </html>
    `);
});

app.post('/pair', async (req, res) => {
    const phoneNumber = req.body.phone;
    if (!phoneNumber) {
        return res.send("Please enter a phone number!");
    }
    startBot(phoneNumber, res);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
