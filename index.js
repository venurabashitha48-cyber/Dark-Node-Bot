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
            setTimeout(async () => {
                try {
                    let code = await sock.requestPairingCode(phoneNumber.trim());
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    pairingCodeGlobal = code;
                    botStatus = "Waiting for Pairing";
                    if (res && !res.headersSent) {
                        res.json({ status: "success", code: code });
                    }
                } catch (err) {
                    console.log("Error getting pairing code:", err);
                    if (res && !res.headersSent) {
                        res.json({ status: "error", message: "Failed to generate code. Try again." });
                    }
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
        }
    });
}

// Web UI with Animations & Modern UI
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>Dark-Node-Bot Pairing</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #090d16; color: #fff; text-align: center; padding: 40px 20px; margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
                .card { background: #131c31; padding: 35px 25px; border-radius: 16px; width: 100%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.6); border: 1px solid #1f2937; animation: fadeIn 0.8s ease-in-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-15px); } to { opacity: 1; transform: translateY(0); } }
                h2 { color: #38bdf8; margin-bottom: 5px; font-size: 24px; }
                p { color: #94a3b8; font-size: 13px; margin-bottom: 25px; }
                input { width: 90%; padding: 14px; margin: 10px 0; border-radius: 8px; border: 1px solid #334155; background: #090d16; color: #fff; font-size: 16px; outline: none; transition: 0.3s; }
                input:focus { border-color: #38bdf8; box-shadow: 0 0 8px rgba(56, 189, 248, 0.4); }
                button { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; border: none; padding: 14px 20px; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold; width: 100%; margin-top: 10px; transition: 0.3s; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3); }
                button:hover { background: linear-gradient(135deg, #16a34a, #15803d); transform: translateY(-2px); }
                .code-box { font-size: 26px; color: #38bdf8; font-weight: bold; margin-top: 20px; background: #090d16; padding: 15px; border-radius: 8px; border: 2px dashed #38bdf8; letter-spacing: 2px; display: none; word-break: break-all; animation: pulseGlow 2s infinite; }
                @keyframes pulseGlow { 0% { border-color: #38bdf8; } 50% { border-color: #22c55e; } 100% { border-color: #38bdf8; } }
                .status { margin-top: 15px; font-size: 14px; color: #cbd5e1; font-weight: 500; }
                .spinner { display: none; width: 35px; height: 35px; border: 4px solid #1e293b; border-top: 4px solid #38bdf8; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto 0 auto; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>Dark-Node-Bot</h2>
                <p>Enter your WhatsApp number with country code to generate pairing code.</p>
                <form id="pairForm">
                    <input type="text" id="phone" placeholder="e.g. 94771234567" required />
                    <button type="submit" id="submitBtn">Get Pairing Code</button>
                </form>
                <div class="spinner" id="loadingSpinner"></div>
                <div class="status" id="statusText">Status: ${botStatus}</div>
                <div class="code-box" id="codeBox"></div>
            </div>

            <script>
                document.getElementById('pairForm').addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const phone = document.getElementById('phone').value;
                    const btn = document.getElementById('submitBtn');
                    const spinner = document.getElementById('loadingSpinner');
                    const statusText = document.getElementById('statusText');
                    const codeBox = document.getElementById('codeBox');

                    btn.style.display = 'none';
                    spinner.style.display = 'block';
                    statusText.innerText = "Status: Requesting Pairing Code...";
                    codeBox.style.display = 'none';

                    try {
                        const response = await fetch('/pair', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ phone: phone })
                        });
                        const data = await response.json();
                        spinner.style.display = 'none';
                        if(data.status === 'success') {
                            statusText.innerText = "Status: Pairing Code Generated!";
                            codeBox.innerText = data.code;
                            codeBox.style.display = 'block';
                        } else {
                            statusText.innerText = "Status: Failed. Try again.";
                            btn.style.display = 'block';
                        }
                    } catch(err) {
                        spinner.style.display = 'none';
                        btn.style.display = 'block';
                        statusText.innerText = "Status: Connection Error!";
                    }
                });
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
        
