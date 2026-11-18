
import express from "express";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from "@whiskeysockets/baileys";
import P from "pino";
import qrcode from "qrcode-terminal";
import fs from "fs";
import path from "path";

// ======================================
// DARK-NODE-BOT PRO CONFIG
// ======================================

const CONFIG = {
  name: "DARK-NODE-BOT",
  owner: "VENURA",
  number: "94786585862",
  channel: "https://whatsapp.com/channel/0029VbENCSjEgGfKGzoqxw2X",
  domain: "https://dark-node-bot-production.up.railway.app",
  prefix: "."
};

const PORT = process.env.PORT || 3000;
const AUTH_DIR = path.resolve(process.env.AUTH_DIR || "./session");

let botStatus = "STARTING";
let startTime = Date.now();
let reconnectTimer = null;

// ======================================
// EXPRESS WEB SERVER
// ======================================

const app = express();

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
 margin:0;
 background:#030807;
 color:#00ff88;
 font-family:Arial,sans-serif;
 overflow-x:hidden;
}
canvas{
 position:fixed;
 inset:0;
 z-index:-1;
 opacity:.3;
}
.container{
 max-width:850px;
 margin:auto;
 padding:25px 16px;
}
header{
 text-align:center;
 padding:35px 10px;
}
.logo{
 font-size:45px;
 font-weight:900;
 text-shadow:0 0 20px #00ff88;
 animation:glow 2s infinite alternate;
}
@keyframes glow{
 from{text-shadow:0 0 5px #00ff88}
 to{text-shadow:0 0 30px #00ff88,0 0 50px #00ff88}
}
.subtitle{
 color:#8bffbd;
 letter-spacing:5px;
}
.card{
 background:rgba(0,20,12,.9);
 border:1px solid #00ff8860;
 border-radius:15px;
 padding:22px;
 margin:18px 0;
 box-shadow:0 0 20px #00ff8810;
 animation:appear .8s ease;
}
@keyframes appear{
 from{opacity:0;transform:translateY(20px)}
 to{opacity:1;transform:translateY(0)}
}
h2{color:#00ff88}
.status{
 font-size:20px;
 font-weight:bold;
}
.dot{
 display:inline-block;
 width:10px;
 height:10px;
 border-radius:50%;
 background:#00ff88;
 box-shadow:0 0 12px #00ff88;
 margin-right:8px;
}
.btn{
 display:block;
 text-align:center;
 padding:15px;
 margin-top:14px;
 background:#00ff88;
 color:#001b10;
 text-decoration:none;
 font-weight:bold;
 border-radius:9px;
 transition:.3s;
}
.btn:hover{
 background:white;
 transform:scale(1.03);
}
.info{
 color:#b7e9cd;
 line-height:2;
}
footer{
 text-align:center;
 color:#568a70;
 padding:30px;
}
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
<p class="status">
<span class="dot"></span>
<span id="status">CHECKING...</span>
</p>
<p class="info">
Server: <span id="server">CHECKING...</span><br>
Bot: DARK-NODE-BOT<br>
Version: 2.0 PRO
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
<p class="info">
Join our official WhatsApp Channel.
</p>
<a class="btn"
href="${CONFIG.channel}"
target="_blank"
rel="noopener noreferrer">
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
CREATED BY VENURA<br>
© 2026
</footer>

</div>

<script>
async function updateStatus(){
 try{
  const r=await fetch('/api/status');
  const d=await r.json();

  document.getElementById('status').textContent=d.bot;
  document.getElementById('server').textContent=d.server;

  const dot=document.querySelector('.dot');
  dot.style.background=d.bot==='ONLINE'?'#00ff88':'#ffaa00';
 }catch(e){
  document.getElementById('status').textContent='UNAVAILABLE';
  document.getElementById('server').textContent='CHECK CONNECTION';
 }
}

updateStatus();
setInterval(updateStatus,5000);

const canvas=document.getElementById('matrix');
const ctx=canvas.getContext('2d');
let drops=[];

function resize(){
 canvas.width=window.innerWidth;
 canvas.height=window.innerHeight;
 drops=Array(Math.floor(canvas.width/17)).fill(1);
}

resize();
window.addEventListener('resize',resize);

function draw(){
 ctx.fillStyle='rgba(0,0,0,0.08)';
 ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.fillStyle='#00ff88';
 ctx.font='14px monospace';

 drops.forEach((y,i)=>{
  ctx.fillText(Math.random()>.5?'1':'0',i*17,y*17);

  if(y*17>canvas.height && Math.random()>.975){
   drops[i]=0;
  }
  drops[i]++;
 });
}

setInterval(draw,45);
</script>

</body>
</html>`);
});

// STATUS API

app.get("/api/status", (req, res) => {
  res.json({
    name: CONFIG.name,
    owner: CONFIG.owner,
    bot: botStatus,
    server: "ONLINE",
    uptime: Math.floor((Date.now()-startTime)/1000)
  });
});

// HEALTH CHECK

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    bot: botStatus
  });
});

// START SERVER ONLY ONCE

app.listen(PORT, "0.0.0.0", () => {
  console.log("================================");
  console.log(" DARK NODE WEB SERVER STARTED");
  console.log(" PORT: " + PORT);
  console.log("================================");
});

// ======================================
// WHATSAPP CONNECTION
// ======================================

async function startBot() {
  try {
    fs.mkdirSync(AUTH_DIR, { recursive: true });

    const { state, saveCreds } =
      await useMultiFileAuthState(AUTH_DIR);

    const sock = makeWASocket({
      auth: state,
      logger: P({ level: "silent" }),
      browser: ["DARK-NODE-BOT", "Chrome", "2.0"],
      markOnlineOnConnect: false,
      syncFullHistory: false
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log("\nSCAN WHATSAPP QR CODE:\n");
        qrcode.generate(qr, { small: true });
      }

      if (connection === "connecting") {
        botStatus = "CONNECTING";
        console.log("[*] Connecting WhatsApp...");
      }

      if (connection === "open") {
        botStatus = "ONLINE";

        console.log("================================");
        console.log(" DARK-NODE-BOT IS ONLINE");
        console.log(" CREATOR: VENURA");
        console.log("================================");
      }

      if (connection === "close") {
        botStatus = "OFFLINE";

        const code =
          lastDisconnect?.error?.output?.statusCode;

        console.log("[!] Connection closed:", code);

        if (code !== DisconnectReason.loggedOut) {
          if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
              reconnectTimer = null;
              startBot();
            }, 5000);
          }
        } else {
          console.log("[!] Logged out. New QR login required.");
        }
      }
    });

    // ==================================
    // MESSAGE HANDLER
    // ==================================

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;

      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const from = msg.key.remoteJid;

        if (!from || from === "status@broadcast") continue;

        const message = msg.message;

        const body =
          message.conversation ||
          message.extendedTextMessage?.text ||
          message.imageMessage?.caption ||
          message.videoMessage?.caption ||
          "";

        if (!body.startsWith(CONFIG.prefix)) continue;

        const args = body.slice(CONFIG.prefix.length)
          .trim().split(/\s+/);

        const cmd = args.shift()?.toLowerCase();

        if (!cmd) continue;

        console.log("[COMMAND]", cmd);

        let reply = "";

        switch (cmd) {

          case "menu":
          case "help":

            reply =
`╭━━━〔 🖤 DARK NODE 〕━━━╮
┃
┃ 🤖 ${CONFIG.name}
┃ 👑 OWNER: ${CONFIG.owner}
┃ 🟢 STATUS: ${botStatus}
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

⚡ POWERED BY VENURA
╰━━━━━━━━━━━━━━━━━━╯`;
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

🟢 Status: ${botStatus}
👑 Creator: ${CONFIG.owner}
⚡ Version: 2.0 PRO`;
            break;

          case "owner":

            reply =
`👑 BOT CREATOR

Name: ${CONFIG.owner}
Number: +${CONFIG.number}
Bot: ${CONFIG.name}

WhatsApp: https://wa.me/${CONFIG.number}`;
            break;

          case "about":

            reply =
`🖤 ${CONFIG.name}

Advanced WhatsApp Assistant.
Created by ${CONFIG.owner}.
Version: 2.0 PRO`;
            break;

          case "channel":

            reply =
`💚 OFFICIAL WHATSAPP CHANNEL

Follow our channel here:

${CONFIG.channel}

Thanks for supporting ${CONFIG.name}!`;
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
          await sock.sendMessage(from, {
            text: reply
          }, {
            quoted: msg
          });
        } catch (error) {
          console.error("[MESSAGE ERROR]", error.message);
        }
      }
    });

  } catch (error) {
    console.error("[START ERROR]", error);
    botStatus = "ERROR";

    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        startBot();
      }, 10000);
    }
  }
}

// ======================================
// START DARK NODE BOT
// ======================================

console.log("DARK-NODE-BOT PRO INITIALIZING...");
startBot();
