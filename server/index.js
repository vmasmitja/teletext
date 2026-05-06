import fs from "fs";
import os from "os";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import express from "express";
import multer from "multer";
import { WebSocketServer } from "ws";
import { createServer as createViteServer } from "vite";
import { createEditorStore } from "./editorStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const isProd = process.env.NODE_ENV === "production";
const editorStore = createEditorStore(root);
const editorTokens = new Map();
const instagramCache = { expiresAt: 0, payload: null };

/** @typedef {{ displays: import('ws').WebSocket[], remotes: import('ws').WebSocket[], page: number, highScore: number, highName: string, pendingScore: number }} Room */

/** @type {Map<string, Room>} */
const rooms = new Map();

const DEFAULT_PAGE = 100;

function getEn0IpV4() {
  const nets = os.networkInterfaces();
  const list = nets.en0 || [];
  for (const item of list) {
    if (item && item.family === "IPv4" && !item.internal) return item.address;
  }
  return null;
}

function getRoom(roomId) {
  const id = roomId || "teletext";
  let r = rooms.get(id);
  if (!r) {
    r = { displays: [], remotes: [], page: DEFAULT_PAGE, highScore: 0, highName: "ANONIM", pendingScore: 0 };
    rooms.set(id, r);
  }
  return r;
}

function removeSocket(roomId, ws) {
  const r = rooms.get(roomId);
  if (!r) return;
  r.displays = r.displays.filter((s) => s !== ws);
  r.remotes = r.remotes.filter((s) => s !== ws);
  if (r.displays.length === 0 && r.remotes.length === 0) rooms.delete(roomId);
}

function send(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function broadcastDisplays(roomId, obj) {
  const r = rooms.get(roomId);
  if (!r) return;
  const payload = JSON.stringify(obj);
  for (const ws of r.displays) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

function broadcastPresence(roomId) {
  const r = rooms.get(roomId);
  if (!r) return;
  const payload = { type: "presence", hasRemote: r.remotes.length > 0 };
  const body = JSON.stringify(payload);
  for (const ws of r.displays) {
    if (ws.readyState === 1) ws.send(body);
  }
}

function broadcastRemotes(roomId, obj) {
  const r = rooms.get(roomId);
  if (!r) return;
  const body = JSON.stringify(obj);
  for (const ws of r.remotes) {
    if (ws.readyState === 1) ws.send(body);
  }
}

function cleanupEditorTokens() {
  const now = Date.now();
  for (const [token, exp] of editorTokens.entries()) {
    if (exp <= now) editorTokens.delete(token);
  }
}

function isEditorTokenValid(token) {
  cleanupEditorTokens();
  if (!token) return false;
  const exp = editorTokens.get(token);
  return typeof exp === "number" && exp > Date.now();
}

async function buildApp() {
  const app = express();
  const upload = multer({ dest: editorStore.assetsDir });
  app.use(express.json({ limit: "2mb" }));
  app.use("/editor-assets", express.static(editorStore.assetsDir));

  app.get("/api/editor/public-content", (_req, res) => {
    res.json(editorStore.read());
  });

  app.post("/api/editor/login", (req, res) => {
    const { username, password } = req.body || {};
    if (!editorStore.authenticate(String(username || ""), String(password || ""))) {
      res.status(401).json({ error: "No autoritzat" });
      return;
    }
    const token = `ed_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    editorTokens.set(token, Date.now() + 1000 * 60 * 60 * 8);
    res.json({ token });
  });

  app.use("/api/editor", (req, res, next) => {
    if (req.path === "/login" || req.path === "/public-content") return next();
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!isEditorTokenValid(token)) {
      res.status(401).json({ error: "Sessió expirada o invàlida" });
      return;
    }
    next();
  });

  app.get("/api/editor/content", (_req, res) => {
    res.json(editorStore.read());
  });

  app.put("/api/editor/content", (req, res) => {
    const result = editorStore.write(req.body);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    const payload = JSON.stringify({ type: "contentUpdated" });
    for (const room of rooms.values()) {
      for (const ws of room.displays) if (ws.readyState === 1) ws.send(payload);
      for (const ws of room.remotes) if (ws.readyState === 1) ws.send(payload);
    }
    res.json(result.content);
  });

  app.post("/api/editor/upload", upload.single("file"), (req, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file" });
      return;
    }
    const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
    const clean = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const dest = path.join(editorStore.assetsDir, clean);
    fs.renameSync(file.path, dest);
    res.json({ path: `/editor-assets/${clean}` });
  });

  app.get("/api/instagram/latest", async (_req, res) => {
    const userId = process.env.IG_USER_ID;
    const accessToken = process.env.IG_ACCESS_TOKEN;
    if (!userId || !accessToken) {
      res.json({ enabled: false, posts: [] });
      return;
    }
    if (instagramCache.payload && instagramCache.expiresAt > Date.now()) {
      res.json(instagramCache.payload);
      return;
    }
    try {
      const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
      const url = `https://graph.instagram.com/${encodeURIComponent(userId)}/media?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}&limit=12`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`instagram http ${r.status}`);
      const data = await r.json();
      const posts = Array.isArray(data?.data)
        ? data.data
            .filter((p) => p && (p.media_type === "IMAGE" || p.media_type === "CAROUSEL_ALBUM"))
            .map((p) => ({
              id: String(p.id || ""),
              caption: String(p.caption || ""),
              mediaUrl: String(p.media_url || p.thumbnail_url || ""),
              permalink: String(p.permalink || ""),
              timestamp: String(p.timestamp || ""),
            }))
            .filter((p) => p.mediaUrl)
        : [];
      const payload = { enabled: true, posts };
      instagramCache.payload = payload;
      instagramCache.expiresAt = Date.now() + 5 * 60 * 1000;
      res.json(payload);
    } catch (e) {
      res.status(200).json({ enabled: false, posts: [], error: "instagram_unavailable" });
    }
  });

  app.get("/api/runtime", (req, res) => {
    const host = req.headers.host || "";
    const port = host.includes(":") ? host.split(":").pop() : "5173";
    res.json({
      localIp: getEn0IpV4(),
      port,
      publicBaseUrl: process.env.PUBLIC_BASE_URL || null,
    });
  });

  if (isProd) {
    app.use(express.static(path.join(root, "dist"), { index: false }));
  } else {
    const vite = await createViteServer({
      root,
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.get(/^(?!\/ws).*/, async (req, res, next) => {
      try {
        let html = fs.readFileSync(path.join(root, "index.html"), "utf-8");
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  }

  if (isProd) {
    app.get(/^(?!\/ws).*/, (_req, res) => {
      const html = fs.readFileSync(path.join(root, "dist/index.html"), "utf-8");
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    });
  }

  return app;
}

async function main() {
  const app = await buildApp();
  const server = http.createServer(app);

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    if (req.url?.startsWith("/ws")) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws) => {
    /** @type {string | null} */
    let roomId = null;
    /** @type {'display' | 'remote' | null} */
    let role = null;

    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg?.type !== "hello" && (!roomId || !role)) return;

      if (msg.type === "hello" && msg.role && msg.room) {
        roomId = String(msg.room).slice(0, 64) || "teletext";
        role = msg.role === "display" ? "display" : "remote";
        const r = getRoom(roomId);
        if (role === "display") r.displays.push(ws);
        else r.remotes.push(ws);
        send(ws, { type: "state", page: r.page });
        send(ws, { type: "record", score: r.highScore, name: r.highName });
        if (role === "display") {
          send(ws, { type: "presence", hasRemote: r.remotes.length > 0 });
        } else {
          broadcastPresence(roomId);
        }
        return;
      }

      if (msg.type === "setPage" && (role === "remote" || role === "display")) {
        const r = getRoom(roomId);
        const page = Number(msg.page);
        if (!Number.isFinite(page) || page < 100 || page > 899) return;
        r.page = Math.floor(page);
        broadcastDisplays(roomId, { type: "state", page: r.page });
        for (const w of r.remotes) {
          send(w, { type: "state", page: r.page });
        }
        if (role === "remote") broadcastPresence(roomId);
      }

      if (msg.type === "heartbeat" && role === "remote") {
        broadcastPresence(roomId);
      }

      if (msg.type === "control" && role === "remote") {
        const action = String(msg.action || "");
        if (!["up", "down", "left", "right", "start"].includes(action)) return;
        broadcastDisplays(roomId, { type: "control", action });
        broadcastPresence(roomId);
      }

      if (msg.type === "snakeResult" && role === "display") {
        const r = getRoom(roomId);
        const score = Number(msg.score);
        if (!Number.isFinite(score) || score < 0) return;
        const s = Math.floor(score);
        if (s > r.highScore) {
          r.pendingScore = s;
          broadcastRemotes(roomId, { type: "recordPrompt", score: s });
        }
      }

      if (msg.type === "saveRecord" && role === "remote") {
        const r = getRoom(roomId);
        const name = String(msg.name || "").trim().slice(0, 12);
        if (!name || r.pendingScore <= r.highScore) return;
        r.highScore = r.pendingScore;
        r.pendingScore = 0;
        r.highName = name.toUpperCase();
        broadcastDisplays(roomId, { type: "record", score: r.highScore, name: r.highName });
        broadcastRemotes(roomId, { type: "record", score: r.highScore, name: r.highName });
      }
    });

    ws.on("close", () => {
      if (!roomId) return;
      const wasRemote = role === "remote";
      removeSocket(roomId, ws);
      if (wasRemote) broadcastPresence(roomId);
    });
  });

  const port = Number(process.env.PORT) || 5173;
  server.listen(port, () => {
    console.log(`http://localhost:${port}  (${isProd ? "production" : "development"})`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
