
import express from "express";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from "@whiskeysockets/baileys";
import P from "pino";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { rateLimit } from "express-rate-limit";

// =====================================
// DARK NODE CONFIG
// =====================================

const CONFIG = {
  name: "DARK-NODE-BOT",
  owner: "VENURA",
  number: "94786585862",
  channel: "https://whatsapp.com/channel/0029VbENCSjEgGfKGzoqxw2X",
  prefix: ".",
  maxSessions: 10
};

const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(process.env.AUTH_DIR || "./sessions");

fs.mkdirSync(ROOT, { recursive: true });

const app = express();
app.disable("x-powered-by");

// Railway reverse proxy
app.set("trust proxy", 1);

app.use(express.json({ limit: "10kb" }));

const sessions = new Map();

const createLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

const pairLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

const hash = value =>
  crypto.createHash("sha256").update(value).digest("hex");

const validId = id =>
  /^[a-f0-9-]{36}$/i.test(id);

function getSession(req) {
  const id = req.params.id;
  const token = req.headers.authorization?.replace(/^Bearer /i, "");

  if (!validId(id) || !token) return null;

  const session = sessions.get(id);
  if (!session) return null;

  const a = Buffer.from(hash(token));
  const b = Buffer.from(session.meta.tokenHash);

  if (a.length !== b.length ||
      !crypto.timingSafeEqual(a, b)) return null;

  return session;
}

// =====================================
// WHATSAPP SESSION MANAGER
// =====================================

async function startSession(meta) {
  let session = sessions.get(meta.id);

  if (session?.starting) return;

  if (!session) {
    session = {
      meta,
      status: "STARTING",
      sock: null,
      starting: false,
      reconnectTimer: null,
      pairingCode: null,
      loggedOut: false
    };
    sessions.set(meta.id, session);
  }

  session.starting = true;
  session.status = "CONNECTING";
  session.loggedOut = false;

  const authDir = path.join(ROOT, meta.id, "auth");
  fs.mkdirSync(authDir, { recursive: true });

  try {
    const { state, saveCreds } =
      await useMultiFileAuthState(authDir);

    const sock = makeWASocket({
      auth: state,
      logger: P({ level: "silent" }),
      browser: ["DARK-NODE-BOT", "Chrome", "3.0"],
      markOnlineOnConnect: false,
      syncFullHistory: false
    });

    session.sock = sock;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async update => {
      const { connection, lastDisconnect } = update;

      if (connection === "connecting") {
        session.status = "CONNECTING";
      }

      if (connection === "open") {
        session.status = "ONLINE";
        session.pairingCode = null;
        console.log("[ONLINE]", meta.id);
      }

      if (connection === "close") {
        session.sock = null;

        const code =
          lastDisconnect?.error?.output?.statusCode;

        if (code === DisconnectReason.loggedOut) {
          session.status = "LOGGED_OUT";
          session.loggedOut = true;
          console.log("[LOGGED OUT]", meta.id);
          return;
        }

        session.status = "OFFLINE";

        if (!session.reconnectTimer) {
          session.reconnectTimer = setTimeout(() => {
            session.reconnectTimer = null;
            startSession(meta);
          }, 5000);
        }
      }
    });

    // =================================
    // MESSAGE COMMANDS
    // =================================

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;

      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const from = msg.key.remoteJid;

        if (!from || from === "status@broadcast") continue;

        const m = msg.message;

        const body =
          m.conversation ||
          m.extendedTextMessage?.text ||
          m.imageMessage?.caption ||
          m.videoMessage?.caption ||
          "";

        if (!body.startsWith(CONFIG.prefix)) continue;

        const args = body.slice(1).trim().split(/\s+/);
        const cmd = args.shift()?.toLowerCase();

        if (!cmd) continue;

        let reply = "";

        switch (cmd) {
          case "menu":
          case "help":
            reply =
`╭━━━〔 🖤 DARK NODE 〕━━━╮
┃ 🤖 ${CONFIG.name}
┃ 👑 OWNER: ${CONFIG.owner}
┃ 🟢 STATUS: ${session.status}
┃
╭━━━〔 COMMANDS 〕━━━╮
┃ .menu
┃ .ping
┃ .alive
┃ .owner
┃ .about
┃ .channel
┃ .time
╰━━━━━━━━━━━━━━━━╯
⚡ POWERED BY VENURA`;
            break;

          case "ping":
            reply =
`⚡ PONG!
🟢 DARK NODE IS ACTIVE.
🤖 ${CONFIG.name}`;
            break;

          case "alive":
            reply =
`🖤 DARK-NODE-BOT
🟢 Status: ${session.status}
👑 Creator: ${CONFIG.owner}
⚡ Version: 3.0 PRO`;
            break;

          case "owner":
            reply =
`👑 BOT CREATOR
Name: ${CONFIG.owner}
Number: +${CONFIG.number}
WhatsApp: https://wa.me/${CONFIG.number}`;
            break;

          case "about":
            reply =
`🖤 ${CONFIG.name}
Advanced WhatsApp Assistant.
Created by ${CONFIG.owner}.
Version: 3.0 PRO`;
            break;

          case "channel":
            reply =
`💚 OFFICIAL WHATSAPP CHANNEL
${CONFIG.channel}`;
            break;

          case "time":
            reply =
"🕒 Sri Lanka Time:\n" +
new Date().toLocaleString("en-US", {
  timeZone: "Asia/Colombo"
});
            break;

          default:
            reply =
"❌ Unknown command.\nType .menu to see commands.";
        }

        try {
          await sock.sendMessage(from, { text: reply }, {
            quoted: msg
          });
        } catch (error) {
          console.error("[MESSAGE ERROR]", error.message);
        }
      }
    });

  } catch (error) {
    console.error("[SESSION ERROR]", error.message);
    session.status = "ERROR";

    if (!session.reconnectTimer) {
      session.reconnectTimer = setTimeout(() => {
        session.reconnectTimer = null;
        startSession(meta);
      }, 10000);
    }
  } finally {
    session.starting = false;
  }
}

// =====================================
// WEBSITE
// =====================================

app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>DARK-NODE-BOT PRO</title>
<style>
*{box-sizing:border-box}
body{
 margin:0;background:#030807;color:#00ff88;
 font-family:Arial,sans-serif;overflow-x:hidden
}
canvas{position:fixed;inset:0;z-index:-1;opacity:.3}
.container{max-width:850px;margin:auto;padding:25px 16px}
header{text-align:center;padding:35px 10px}
.logo{
 font-size:45px;font-weight:900;
 text-shadow:0 0 20px #00ff88;
 animation:glow 2s infinite alternate
}
@keyframes glow{
 from{text-shadow:0 0 5px #00ff88}
 to{text-shadow:0 0 30px #00ff88,0 0 50px #00ff88}
}
.subtitle{color:#8bffbd;letter-spacing:5px}
.card{
 background:rgba(0,20,12,.94);
 border:1px solid #00ff8860;border-radius:15px;
 padding:22px;margin:18px 0;
 box-shadow:0 0 20px #00ff8810;
 animation:appear .8s ease
}
@keyframes appear{
 from{opacity:0;transform:translateY(20px)}
 to{opacity:1;transform:translateY(0)}
}
h2{color:#00ff88}
.info{color:#b7e9cd;line-height:2}
input{
 width:100%;padding:15px;margin:10px 0;
 border:1px solid #00ff88;border-radius:8px;
 background:#07140e;color:white;font-size:16px
}
.btn{
 display:block;width:100%;text-align:center;
 padding:15px;margin-top:14px;background:#00ff88;
 color:#001b10;border:0;border-radius:9px;
 font-weight:bold;font-size:15px;cursor:pointer
}
.code{
 display:none;text-align:center;font-size:27px;
 letter-spacing:5px;color:white;padding:20px;
 border:1px dashed #00ff88;border-radius:10px;
 margin-top:15px
}
footer{text-align:center;color:#568a70;padding:30px}
</style>
</head>
<body>
<canvas id="matrix"></canvas>
<div class="container">
<header>
<div class="logo">DARK-NODE</div>
<div class="subtitle">BOT PRO SYSTEM</div>
<p>⚡ ADVANCED WHATSAPP ASSISTANT ⚡</p>
</header>

<div class="card">
<h2>⚡ SYSTEM STATUS</h2>
<p class="info">
<span id="status">CHECKING...</span><br>
Bot: DARK-NODE-BOT<br>
Version: 3.0 PRO
</p>
</div>

<div class="card">
<h2>🔗 PUBLIC MULTI PAIRING</h2>
<p class="info">
Enter your own WhatsApp number with country code.
Example: 94771234567
</p>
<input id="number" type="tel"
placeholder="Enter WhatsApp number">
<button class="btn" id="connect">GENERATE PAIRING CODE</button>
<div class="code" id="code"></div>
<p class="info" id="message"></p>
<p class="info">
WhatsApp → Linked Devices →
Link a Device → Link with phone number instead.
</p>
</div>

<div class="card">
<h2>👑 CREATOR PROFILE</h2>
<p class="info">
Name: VENURA<br>
Role: BOT CREATOR<br>
Bot: DARK-NODE-BOT<br>
Country: Sri Lanka
</p>
</div>

<div class="card">
<h2>💚 WHATSAPP CHANNEL</h2>
<p class="info">Join our official WhatsApp Channel.</p>
<a class="btn" href="${CONFIG.channel}"
target="_blank" rel="noopener noreferrer">
JOIN WHATSAPP CHANNEL
</a>
</div>

<div class="card">
<h2>🤖 BOT COMMANDS</h2>
<p class="info">
.menu - Show all commands<br>
.ping - Check response<br>
.alive - Bot status<br>
.owner - Creator information<br>
.about - About the bot<br>
.channel - Channel invitation<br>
.time - Sri Lanka time
</p>
</div>

<footer>
DARK-NODE-BOT PRO<br>
CREATED BY VENURA<br>© 2026
</footer>
</div>

<script>
let sessionId = "";
let accessToken = "";

const codeBox = document.getElementById("code");
const message = document.getElementById("message");
const btn = document.getElementById("connect");

btn.onclick = async () => {
 const number = document.getElementById("number").value.trim();

 if (!/^\\d{10,15}$/.test(number)) {
   message.textContent = "Enter a valid number with country code.";
   return;
 }

 btn.disabled = true;
 btn.textContent = "CREATING SESSION...";
 message.textContent = "";
 codeBox.style.display = "none";

 try {
   const created = await fetch("/api/sessions", {
     method: "POST",
     headers: {"Content-Type":"application/json"},
     body: JSON.stringify({number})
   });

   const data = await created.json();
   if (!created.ok) throw new Error(data.error || "Session failed");

   sessionId = data.id;
   accessToken = data.token;

   sessionStorage.setItem("darkSessionId", sessionId);
   sessionStorage.setItem("darkToken", accessToken);

   btn.textContent = "REQUESTING CODE...";

   const response = await fetch(
     "/api/sessions/" + sessionId + "/pair", {
       method: "POST",
       headers: {"Authorization":"Bearer " + accessToken}
     }
   );

   const result = await response.json();
   if (!response.ok) throw new Error(result.error || "Pairing failed");

   codeBox.textContent = result.code;
   codeBox.style.display = "block";
   message.textContent =
     "Enter this code in your WhatsApp Linked Devices.";

   btn.textContent = "PAIRING CODE GENERATED";
   checkStatus();

 } catch(e) {
   message.textContent = e.message;
   btn.textContent = "GENERATE PAIRING CODE";
   btn.disabled = false;
 }
};

async function checkStatus() {
 if (!sessionId || !accessToken) return;

 try {
   const r = await fetch("/api/sessions/" + sessionId, {
     headers: {"Authorization":"Bearer " + accessToken}
   });
   const d = await r.json();

   message.textContent = "Session status: " + d.status;

   if (d.status !== "ONLINE" && d.status !== "LOGGED_OUT") {
     setTimeout(checkStatus, 4000);
   }
 } catch(e) {}
}

fetch("/api/status")
 .then(r => r.json())
 .then(d => {
   document.getElementById("status").textContent =
     "SERVER: " + d.server;
 })
 .catch(() => {
   document.getElementById("status").textContent = "UNAVAILABLE";
 });

const canvas = document.getElementById("matrix");
const ctx = canvas.getContext("2d");
let drops = [];

function resize() {
 canvas.width = innerWidth;
 canvas.height = innerHeight;
 drops = Array(Math.floor(canvas.width/17)).fill(1);
}
resize();
window.addEventListener("resize",resize);

setInterval(() => {
 ctx.fillStyle="rgba(0,0,0,.08)";
 ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.fillStyle="#00ff88";
 ctx.font="14px monospace";
 drops.forEach((y,i) => {
   ctx.fillText(Math.random()>.5?"1":"0",i*17,y*17);
   if(y*17>canvas.height && Math.random()>.975) drops[i]=0;
   drops[i]++;
 });
},45);
</script>
</body>
</html>`);
});

// =====================================
// API
// =====================================

app.get("/api/status", (req, res) => {
  res.json({
    name: CONFIG.name,
    server: "ONLINE",
    activeSessions: [...sessions.values()]
      .filter(s => s.status === "ONLINE").length
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// CREATE SESSION
app.post("/api/sessions", createLimit, async (req, res) => {
  try {
    const number = String(req.body.number || "").replace(/\D/g, "");

    if (!/^\d{10,15}$/.test(number)) {
      return res.status(400).json({ error: "Invalid number" });
    }

    if (sessions.size >= CONFIG.maxSessions) {
      return res.status(503).json({ error: "Session limit reached" });
    }

    const id = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString("hex");

    const meta = {
      id,
      phone: number,
      tokenHash: hash(token),
      createdAt: Date.now()
    };

    const folder = path.join(ROOT, id);
    fs.mkdirSync(folder, { recursive: true });

    fs.writeFileSync(
      path.join(folder, "meta.json"),
      JSON.stringify(meta),
      { mode: 0o600 }
    );

    await startSession(meta);

    res.json({ id, token });

  } catch(error) {
    console.error("[CREATE ERROR]", error.message);
    res.status(500).json({ error: "Session creation failed" });
  }
});

// REQUEST PAIRING
app.post("/api/sessions/:id/pair", pairLimit, async (req, res) => {
  const session = getSession(req);

  if (!session) {
    return res.status(403).json({ error: "Access denied" });
  }

  if (session.status === "ONLINE") {
    return res.status(409).json({ error: "Already connected" });
  }

  if (!session.sock) {
    return res.status(503).json({ error: "Session starting. Retry shortly." });
  }

  try {
    if (!session.pairingCode) {
      session.pairingCode =
        await session.sock.requestPairingCode(session.meta.phone);
    }

    res.json({ code: session.pairingCode });

  } catch(error) {
    console.error("[PAIR ERROR]", error.message);
    res.status(503).json({ error: "Pairing unavailable. Retry shortly." });
  }
});

// PRIVATE STATUS
app.get("/api/sessions/:id", (req, res) => {
  const session = getSession(req);

  if (!session) {
    return res.status(403).json({ error: "Access denied" });
  }

  res.json({
    status: session.status,
    connected: session.status === "ONLINE"
  });
});

// =====================================
// START SERVER
// =====================================

app.listen(PORT, "0.0.0.0", () => {
  console.log("================================");
  console.log(" DARK NODE SERVER STARTED");
  console.log(" PORT:", PORT);
  console.log("================================");
});

// RESTORE SESSIONS
for (const id of fs.readdirSync(ROOT)) {
  if (!validId(id)) continue;

  try {
    const metaPath = path.join(ROOT, id, "meta.json");
    if (!fs.existsSync(metaPath)) continue;

    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));

    if (meta.id !== id || !meta.tokenHash || !meta.phone) continue;

    startSession(meta);

  } catch(error) {
    console.error("[RESTORE ERROR]", error.message);
  }
}

console.log("DARK-NODE-BOT PRO INITIALIZING...");
