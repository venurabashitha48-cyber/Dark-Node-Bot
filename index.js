
import express from "express";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from "@whiskeysockets/baileys";
import P from "pino";
import qrcode from "qrcode-terminal";
import fs from "fs";
import path from "path";

// =================================
// DARK NODE BOT PRO CONFIGURATION
// =================================

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
let connectedNumber = null;
let startTime = Date.now();

// =================================
// WEB SERVER
// =================================

const app = express();

app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>DARK NODE BOT PRO</title>
<style>
*{box-sizing:border-box}
body{
 margin:0;background:#030807;color:#00ff88;
 font-family:Arial,sans-serif;overflow-x:hidden;
}
canvas{position:fixed;inset:0;z-index:-1;opacity:.3}
.container{max-width:850px;margin:auto;padding:25px 16px}
header{text-align:center;padding:35px 10px}
.logo{
 font-size:45px;font-weight:900;
 text-shadow:0 0 20px #00ff88;
 animation:glow 2s infinite alternate;
}
@keyframes glow{
 from{text-shadow:0 0 5px #00ff88}
 to{text-shadow:0 0 30px #00ff88,0 0 50px #00ff88}
}
.subtitle{color:#8bffbd;letter-spacing:5px}
.card{
 background:rgba(0,20,12,.88);
 border:1px solid #00ff8860;
 border-radius:15px;padding:22px;
 margin:18px 0;
 box-shadow:0 0 20px #00ff8810;
}
h2{color:#00ff88}
.status{font-size:20px;font-weight:bold}
.dot{
 display:inline-block;width:10px;height:10px;
 border-radius:50%;background:#00ff88;
 box-shadow:0 0 12px #00ff88;margin-right:8px;
}
.btn{
 display:block;text-align:center;
 padding:15px;margin-top:14px;
 background:#00ff88;color:#001b10;
 text-decoration:none;font-weight:bold;
 border-radius:9px;transition:.3s;
}
.btn:hover{background:#fff;transform:scale(1.03)}
.info{color:#b7e9cd;line-height:2}
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
<h2> SYSTEM STATUS</h2>
<p class="status"><span class="dot"></span><span id="status">CHECKING...</span></p>
<p class="info">Server: <span id="server">ONLINE</span></p>
<p class="info">Bot: DARK-NODE-BOT</p>
<p class="info">Version: 2.0 PRO</p>
</div>

<div class="card">
<h2> CREATOR PROFILE</h2>
<p class="info">
Name: VENURA<br>
Role: BOT CREATOR<br>
Bot: DARK-NODE-BOT<br>
Country: Sri Lanka
</p>
</div>

<div class="card">
<h2> WHATSAPP COMMUNITY</h2>
<p class="info">Join our official WhatsApp Channel.</p>
<a class="btn" href="${CONFIG.channel}" target="_blank">
JOIN WHATSAPP CHANNEL
</a>
</div>

<div class="card">
<h2> BOT COMMANDS</h2>
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
 }catch(e){
  document.getElementById('status').textContent='UNAVAILABLE';
 }
}
updateStatus();
setInterval(updateStatus,5000);

const canvas=document.getElementById('matrix');
const ctx=canvas.getContext('2d');
let drops=[];
function resize(){
 canvas.width=innerWidth;
 canvas.height=innerHeight;
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
  ctx.fillText(Math.random()>0.5?'1':'0',i*17,y*17);
  if(y*17>canvas.height && Math.random()>.975)drops[i]=0;
  drops[i]++;
 });
}
setInterval(draw,45);
</script>
</body>
</html>`);
});

app.get("/api/status", (req, res) => {
  res.json({
    bot: botStatus,
    server: "ONLINE",
    name: CONFIG.name,
    owner: CONFIG.owner,
    uptime: Math.floor((Date.now() - startTime) / 1000)
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("WEB SERVER RUNNING ON PORT " + PORT);
});

// =================================
// WHATSAPP BOT
// =================================

let reconnecting = false;

async function startBot() {
  if (reconnecting) return;
  reconnecting = true;

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

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log("\nSCAN THIS WHATSAPP QR CODE:\n");
        qrcode.generate(qr, { small: true });
      }

      if (connection === "connecting") {
        botStatus = "CONNECTING";
        console.log("[*] Connecting...");
      }

      if (connection === "open") {
        botStatus = "ONLINE";
        connectedNumber = sock.user?.id || null;
        reconnecting = false;

        console.log("================================");
        console.log(" DARK-NODE-BOT IS ONLINE");
        console.log(" CREATOR: VENURA");
        console.log("================================");
      }

      if (connection === "close") {
        botStatus = "OFFLINE";
        connectedNumber = null;

        const code = lastDisconnect?.error?.output?.statusCode;
        reconnecting = false;

        if (code !== DisconnectReason.loggedOut) {
          console.log("[!] Reconnecting in 5 seconds...");
          setTimeout(startBot, 5000);
        } else {
          console.log("[!] Logged out. New QR login required.");
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

        console.log("[COMMAND]", cmd);

        let reply;

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
            reply = "⚡ PONG!\n🟢 DARK NODE IS ACTIVE.";
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
            reply = "❌ Unknown command.\nType .menu";
        }

        if (reply) {
          try {
            await sock.sendMessage(from, {
              text: reply
            }, { quoted: msg });
          } catch (error) {
            console.error("MESSAGE ERROR:", error.message);
          }
        }
      }
    });

  } catch (error) {
    console.error("START ERROR:", error);
    botStatus = "ERROR";
    reconnecting = false;
    setTimeout(startBot, 10000);
  }
}

console.log("DARK-NODE-BOT PRO INITIALIZING...");
startBot();
