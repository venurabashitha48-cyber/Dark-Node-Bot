const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require("@whiskeysockets/baileys");
const express = require('express');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let pairingCodeGlobal = "Not Generated Yet";
let botStatus = "Ready to Hack / Pair";

async function startBot(phoneNumber, res) {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys_' + Date.now());
        
        const sock = makeWASocket({
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: Browsers.macOS("Chrome")
        });

        if (!sock.authState.creds.registered) {
            if (phoneNumber) {
                // Wait 3 seconds for socket initialization
                await new Promise(resolve => setTimeout(resolve, 3000));
                let code = await sock.requestPairingCode(phoneNumber.trim());
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                pairingCodeGlobal = code;
                botStatus = "Pairing Code Generated!";
                if (res && !res.headersSent) {
                    return res.json({ status: "success", code: code });
                }
            }
        }

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection } = update;
            if (connection === 'open') {
                botStatus = "Connected Successfully! 🚀";
                console.log('Bot Connected Successfully!');
            }
        });
    } catch (err) {
        console.log("Pairing error:", err);
        if (res && !res.headersSent) {
            return res.json({ status: "error", message: "Failed to generate. Try again." });
        }
    }
}

// Hacker / Matrix Cyberpunk UI with Large Card & Animations
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>Dark-Node-Bot - Cyber Panel</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: 'Courier New', Courier, monospace; background: #02040a; color: #00ff66; text-align: center; padding: 15px; margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }
                
                /* Matrix rain background effect simulation */
                .matrix-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle, #05110e 0%, #02040a 100%); z-index: -1; }
                
                .card { background: rgba(5, 15, 12, 0.9); padding: 40px 25px; border-radius: 20px; width: 100%; max-width: 450px; box-shadow: 0 0 30px rgba(0, 255, 102, 0.2); border: 2px solid #00ff66; position: relative; backdrop-filter: blur(10px); animation: pulseBorder 3s infinite; }
                
                @keyframes pulseBorder { 0% { border-color: #00ff66; box-shadow: 0 0 20px rgba(0, 255, 102, 0.2); } 50% { border-color: #00b3ff; box-shadow: 0 0 30px rgba(0, 179, 255, 0.4); } 100% { border-color: #00ff66; box-shadow: 0 0 20px rgba(0, 255, 102, 0.2); } }
                
                h2 { color: #00ff66; margin-bottom: 8px; font-size: 28px; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 10px rgba(0,255,102,0.6); }
                p { color: #8fa39b; font-size: 13px; margin-bottom: 30px; letter-spacing: 1px; }
                
                input { width: 90%; padding: 16px; margin: 12px 0; border-radius: 10px; border: 1px solid #00ff66; background: #000; color: #00ff66; font-size: 18px; outline: none; text-align: center; letter-spacing: 2px; font-family: 'Courier New', Courier, monospace; box-shadow: inset 0 0 10px rgba(0,255,102,0.2); transition: 0.3s; }
                input:focus { border-color: #00b3ff; box-shadow: 0 0 15px rgba(0, 179, 255, 0.6); color: #00b3ff; }
                
                button { background: linear-gradient(135deg, #00ff66, #008833); color: #000; border: none; padding: 16px 20px; border-radius: 10px; cursor: pointer; font-size: 18px; font-weight: bold; width: 100%; margin-top: 15px; transition: 0.3s; box-shadow: 0 0 15px rgba(0, 255, 102, 0.4); text-transform: uppercase; letter-spacing: 1px; }
                button:hover { background: linear-gradient(135deg, #00b3ff, #0066aa); color: #fff; box-shadow: 0 0 25px rgba(0, 179, 255, 0.7); transform: scale(1.02); }
                
                .code-box { font-size: 30px; color: #00b3ff; font-weight: bold; margin-top: 25px; background: #000; padding: 18px; border-radius: 10px; border: 2px dashed #00b3ff; letter-spacing: 4px; display: none; word-break: break-all; text-shadow: 0 0 12px rgba(0,179,255,0.8); }
                
                .copy-btn { background: linear-gradient(135deg, #00b3ff, #0044aa); color: white; margin-top: 15px; display: none; padding: 12px; font-size: 15px; }
                
                .status { margin-top: 25px; font-size: 14px; color: #00ff66; font-weight: bold; background: rgba(0,0,0,0.6); padding: 12px; border-radius: 8px; border: 1px solid #00ff66; letter-spacing: 1px; }
                
                .spinner { display: none; width: 45px; height: 45px; border: 5px solid #000; border-top: 5px solid #00ff66; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 20px auto 0 auto; box-shadow: 0 0 10px #00ff66; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        </head>
        <body>
            <div class="matrix-bg"></div>
            <div class="card">
                <h2>⚡ DARK-NODE-BOT ⚡</h2>
                <p>[ SECURE WHATSAPP PAIRING INTERFACE ]</p>
                <form id="pairForm">
                    <input type="text" id="phone" placeholder="9477xxxxxxx" required />
                    <button type="submit" id="submitBtn">Execute Pairing</button>
                </form>
                <div class="spinner" id="loadingSpinner"></div>
                <div class="status" id="statusText">STATUS: ${botStatus}</div>
                <div class="code-box" id="codeBox"></div>
                <button class="copy-btn" id="copyBtn" onclick="copyCode()">📋 COPY PAIRING CODE</button>
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
                    statusText.innerText = "STATUS: Connecting to Matrix & Requesting Code...";
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
                            statusText.innerText = "STATUS: SUCCESS! Code Acquired.";
                            codeBox.innerText = data.code;
                            codeBox.style.display = 'block';
                            copyBtn.style.display = 'block';
                        } else {
                            statusText.innerText = "STATUS: ERROR. Retry Execution.";
                            btn.style.display = 'block';
                        }
                    } catch(err) {
                        spinner.style.display = 'none';
                        btn.style.display = 'block';
                        statusText.innerText = "STATUS: NETWORK TIMEOUT. Retry.";
                    }
                });

                function copyCode() {
                    const codeText = document.getElementById('codeBox').innerText;
                    navigator.clipboard.writeText(codeText);
                    document.getElementById('copyBtn').innerText = "✅ COPIED TO CLIPBOARD!";
                    setTimeout(() => {
                        document.getElementById('copyBtn').innerText = "📋 COPY PAIRING CODE";
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
    await startBot(phoneNumber, res);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
