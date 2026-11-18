const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require("@whiskeysockets/baileys");
const express = require('express');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 8080;

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
            // Give a small delay to stabilize connection
            setTimeout(async () => {
                try {
                    let code = await sock.requestPairingCode(phoneNumber.trim());
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    pairingCodeGlobal = code;
                    botStatus = "Pairing Code Generated Successfully!";
                    if (res && !res.headersSent) {
                        res.json({ status: "success", code: code });
                    }
                } catch (err) {
                    console.log("Error getting pairing code:", err);
                    botStatus = "Failed to Generate Code";
                    if (res && !res.headersSent) {
                        res.json({ status: "error", message: "Failed to generate code. Please try again." });
                    }
                }
            }, 5000);
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            botStatus = "Connected Successfully! 🎉";
            console.log('Bot Connected Successfully!');
        } else if (connection === 'close') {
            botStatus = "Disconnected";
        }
    });
}

// Stunning Modern UI with Neon Glow, Status & Copy Button
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>Dark-Node-Bot Pairing</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #07090e; color: #fff; text-align: center; padding: 20px; margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
                .card { background: #111827; padding: 30px 20px; border-radius: 20px; width: 100%; max-width: 420px; box-shadow: 0 15px 35px rgba(0,0,0,0.8); border: 1px solid #1f2937; position: relative; overflow: hidden; }
                .card::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: linear-gradient(60deg, transparent, rgba(56,189,248,0.1), transparent); transform: rotate(45deg); animation: shine 6s linear infinite; }
                @keyframes shine { 0% { transform: translateY(-100%) rotate(45deg); } 100% { transform: translateY(100%) rotate(45deg); } }
                h2 { color: #38bdf8; margin-bottom: 5px; font-size: 26px; text-shadow: 0 0 10px rgba(56,189,248,0.5); }
                p { color: #9ca3af; font-size: 13px; margin-bottom: 25px; }
                input { width: 90%; padding: 15px; margin: 10px 0; border-radius: 10px; border: 1px solid #374151; background: #030712; color: #fff; font-size: 16px; outline: none; transition: 0.3s; text-align: center; letter-spacing: 1px; }
                input:focus { border-color: #38bdf8; box-shadow: 0 0 12px rgba(56, 189, 248, 0.5); }
                button { background: linear-gradient(135deg, #22c55e, #15803d); color: white; border: none; padding: 15px 20px; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: bold; width: 100%; margin-top: 10px; transition: 0.3s; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4); }
                button:hover { background: linear-gradient(135deg, #16a34a, #166534); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(34, 197, 94, 0.6); }
                .code-box { font-size: 28px; color: #38bdf8; font-weight: bold; margin-top: 20px; background: #030712; padding: 15px; border-radius: 10px; border: 2px dashed #38bdf8; letter-spacing: 3px; display: none; word-break: break-all; text-shadow: 0 0 10px rgba(56,189,248,0.6); }
                .copy-btn { background: linear-gradient(135deg, #0284c7, #0369a1); margin-top: 10px; display: none; padding: 10px; font-size: 14px; }
                .status { margin-top: 20px; font-size: 14px; color: #e2e8f0; font-weight: 600; background: #1f2937; padding: 10px; border-radius: 8px; }
                .spinner { display: none; width: 40px; height: 40px; border: 4px solid #1f2937; border-top: 4px solid #38bdf8; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto 0 auto; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>⚡ Dark-Node-Bot</h2>
                <p>Enter your WhatsApp number with country code (e.g. 9477xxxxxxx)</p>
                <form id="pairForm">
                    <input type="text" id="phone" placeholder="94771234567" required />
                    <button type="submit" id="submitBtn">Get Pairing Code</button>
                </form>
                <div class="spinner" id="loadingSpinner"></div>
                <div class="status" id="statusText">Status: ${botStatus}</div>
                <div class="code-box" id="codeBox"></div>
                <button class="copy-btn" id="copyBtn" onclick="copyCode()">📋 Copy Pairing Code</button>
            </div>

            <script>
                document.getElementById('pairForm').addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const phone = document.getElementById('phone').value;
                    const btn = document.getElementById('submitBtn');
                    const spinner = document.getElementById('loadingSpinner');
                    const statusText = document.getElementById('statusText');
                    const codeBox = document.getElementById('codeBox');
                    const copyBtn = document.getElementById('copyBtn');

                    btn.style.display = 'none';
                    spinner.style.display = 'block';
                    statusText.innerText = "Status: Connecting to WhatsApp & Generating Code...";
                    codeBox.style.display = 'none';
                    copyBtn.style.display = 'none';

                    try {
                        const response = await fetch('/pair', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ phone: phone })
                        });
                        const data = await response.json();
                        spinner.style.display = 'none';
                        if(data.status === 'success') {
                            statusText.innerText = "Status: Success! Enter this code on WhatsApp.";
                            codeBox.innerText = data.code;
                            codeBox.style.display = 'block';
                            copyBtn.style.display = 'block';
                        } else {
                            statusText.innerText = "Status: Failed. Please try again.";
                            btn.style.display = 'block';
                        }
                    } catch(err) {
                        spinner.style.display = 'none';
                        btn.style.display = 'block';
                        statusText.innerText = "Status: Network Error! Try again.";
                    }
                });

                function copyCode() {
                    const codeText = document.getElementById('codeBox').innerText;
                    navigator.clipboard.writeText(codeText);
                    document.getElementById('copyBtn').innerText = "✅ Copied to Clipboard!";
                    setTimeout(() => {
                        document.getElementById('copyBtn').innerText = "📋 Copy Pairing Code";
                    }, 2000);
                }
            </script>
        </body>
        </html>
    `);
});

app.post('/pair', async (req, res) => {
    const phoneNumber = req.body.phone;
    if (!phoneNumber) {
        return res.json({ status: "error", message: "Phone number required" });
    }
    startBot(phoneNumber, res);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
