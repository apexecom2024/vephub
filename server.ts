import express from "express";
import ViteExpress from "vite-express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { GoogleGenAI, LiveServerMessage } from "@google/genai";
import { WebSocketServer } from "ws";
import http from "http";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
        headers: {
            'User-Agent': 'aistudio-build',
        }
    }
});

const wss = new WebSocketServer({ server, path: '/ws-gemini' });

wss.on("connection", async (clientWs) => {
    let session: any = null;

    clientWs.on("message", async (data) => {
        try {
            const raw = data.toString();
            // Handle binary (audio) or string (commands)
            if (typeof data !== 'string' && data instanceof Buffer) {
                 if (session) {
                    session.sendRealtimeInput({
                        audio: { data: data.toString('base64'), mimeType: "audio/pcm;rate=16000" }
                    });
                 }
                 return;
            }

            const msg = JSON.parse(raw);

            if (msg.type === "start") {
                const { config } = msg;
                session = await ai.live.connect({
                    model: config.model || "gemini-2.5-flash-native-audio-preview-09-2025",
                    callbacks: {
                        onopen: () => clientWs.send(JSON.stringify({ type: "open" })),
                        onmessage: (message: LiveServerMessage) => {
                            clientWs.send(JSON.stringify({ type: "message", message }));
                        },
                        onclose: (e: any) => clientWs.send(JSON.stringify({ type: "close", reason: e.reason })),
                        onerror: (e: any) => clientWs.send(JSON.stringify({ type: "error", message: e.message }))
                    },
                    config: config
                });
            } else if (msg.type === "input" && session) {
                session.sendRealtimeInput(msg.input);
            } else if (msg.type === "stop" && session) {
                session.close();
                session = null;
            }
        } catch (err: any) {
            clientWs.send(JSON.stringify({ type: "error", message: err.message }));
        }
    });

    clientWs.on("close", () => {
        if (session) session.close();
    });
});


const DB_FILE = path.join(process.cwd(), ".tokens.json");

function loadDb() {
    try {
        if (fs.existsSync(DB_FILE)) {
            return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
        }
    } catch(e) {}
    return {};
}

function saveDb(data: any) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.VITE_GOOGLE_CLIENT_ID || "mock-client-id",
  process.env.GOOGLE_CLIENT_SECRET || "mock-client-secret"
);

app.get("/api/integrations/google/status", async (req, res) => {
    const uid = req.headers["x-user-id"] as string;
    
    const db = loadDb();
    if (!uid || !db[uid]) {
        return res.json({
            connected: false,
            needsReconnect: true,
            reason: "No stored credentials"
        });
    }

    const data = db[uid];
    
    try {
        oauth2Client.setCredentials({ refresh_token: data.refreshToken });
        const { token } = await oauth2Client.getAccessToken();
        if (!token) throw new Error("No token returned");
        
        res.json({
            connected: data.connected,
            email: data.email,
            scopes: data.scopes || [],
            needsReconnect: data.needsReconnect
        });
    } catch (error: any) {
        res.json({
            connected: false,
            needsReconnect: true,
            reason: "Google authorization expired or was revoked"
        });
    }
});

app.post("/api/integrations/google/status", (req, res) => {
    const uid = req.headers["x-user-id"] as string;
    if (!uid) return res.status(401).send();
    
    const db = loadDb();
    db[uid] = {
        refreshToken: req.body.refreshToken,
        email: req.body.email,
        scopes: req.body.scopes || [],
        connected: true,
        needsReconnect: false
    };
    saveDb(db);
    res.json({ success: true });
});

app.post("/api/integrations/google/disconnect", (req, res) => {
    const uid = req.headers["x-user-id"] as string;
    const db = loadDb();
    if (uid && db[uid]) {
        delete db[uid];
        saveDb(db);
    }
    res.json({ success: true });
});

// WhatsApp Device Management
app.post("/devices", (req, res) => {
    const { device_id } = req.body;
    const id = device_id || `device-${Math.random().toString(36).substr(2, 9)}`;
    
    // In a real app, this would register the device with GOWA
    res.json({
        code: "SUCCESS",
        message: "Device added",
        status: 200,
        results: {
            id: id,
            phone_number: "628123456789",
            display_name: "John Doe",
            state: "logged_in",
            jid: `${id}@s.whatsapp.net`,
            created_at: new Date().toISOString()
        }
    });
});

const PORT = parseInt(process.env.PORT || "3000");

server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
ViteExpress.bind(app, server);
