import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys"
import express from "express"
import dotenv from "dotenv"
import P from "pino"
import axios from "axios"
import qrcode from "qrcode-terminal"

dotenv.config()
const app = express()
app.get("/", (req, res) => res.send("ICON BOT 24/7 ONLINE"))
app.listen(process.env.PORT || 3000, () => console.log("Server ON PORT 3000"))

const BOT_NAME = "icon"

async function askAI(question) {
  try {
    const res = await axios.post("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + process.env.GEMINI_API_KEY, {
      contents: [{ parts: [{ text: question }] }]
    })
    return res.data.candidates[0].content.parts[0].text
  } catch (e) {
    console.log(e.response?.data || e.message)
    return "Samahani, AI ya ICON iko busy."
  }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session")
  const sock = makeWASocket({ logger: P({ level: "silent" }), auth: state, browser: ["ICON", "Chrome", "1.0"] })
  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", async (up) => {
    const { connection, lastDisconnect, qr } = up
    
    if (qr) {
      console.log("------ SCAN HII QR KWA WHATSAPP 0771457495 ------")
      qrcode.generate(qr, { small: true })
    }

    if (connection === "open") console.log("✅ ICON IMEUNGANISHWA 255771457495")
    if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot()
  })

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return
    const from = msg.key.remoteJid
    const isGroup = from.endsWith("@g.us")
    const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim()
    const lower = text.toLowerCase()

    if (lower === ".menu") {
      await sock.sendMessage(from, { text: "*ICON BOT MENU*\n\n.kick @user\n.promote @user\n.demote @user\n.tagall\n\nAndika: icon swali lako" })
    }
    if (lower.startsWith(".kick") && isGroup) {
      const mention = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      if (mention) await sock.groupParticipantsUpdate(from, [mention], "remove")
    }
    if (lower === ".tagall" && isGroup) {
      const meta = await sock.groupMetadata(from)
      const mentions = meta.participants.map(p => p.id)
      await sock.sendMessage(from, { text: "TAGALL:\n" + mentions.map(m => "@" + m.split("@")[0]).join("\n"), mentions })
    }

    if (lower.includes(BOT_NAME)) {
      const question = text.replace(/icon/gi, "").trim()
      if (question.length > 2) {
        await sock.sendMessage(from, { text: "⏳ ICON inafikiria..." })
        const answer = await askAI(question)
        await sock.sendMessage(from, { text: answer })
      }
    }
  })
}
startBot()
