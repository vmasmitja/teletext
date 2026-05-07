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
const gameScoresFile = path.join(root, "game-scores.json");

/** @typedef {"snake" | "paraulogic"} GameKey */

const defaultGameScores = {
  snake: { score: 0, name: "ANONIM" },
  paraulogic: { score: 0, name: "ANONIM" },
};

/** @returns {{ snake: { score: number, name: string }, paraulogic: { score: number, name: string } }} */
function loadGameScores() {
  try {
    if (!fs.existsSync(gameScoresFile)) return { ...defaultGameScores };
    const raw = JSON.parse(fs.readFileSync(gameScoresFile, "utf-8"));
    const snakeScore = Number(raw?.snake?.score || 0);
    const paraScore = Number(raw?.paraulogic?.score || 0);
    return {
      snake: {
        score: Number.isFinite(snakeScore) ? Math.max(0, Math.floor(snakeScore)) : 0,
        name: String(raw?.snake?.name || "ANONIM").slice(0, 12).toUpperCase(),
      },
      paraulogic: {
        score: Number.isFinite(paraScore) ? Math.max(0, Math.floor(paraScore)) : 0,
        name: String(raw?.paraulogic?.name || "ANONIM").slice(0, 12).toUpperCase(),
      },
    };
  } catch {
    return { ...defaultGameScores };
  }
}

/** @param {{ snake: { score: number, name: string }, paraulogic: { score: number, name: string } }} data */
function saveGameScores(data) {
  try {
    fs.writeFileSync(gameScoresFile, JSON.stringify(data, null, 2));
  } catch (err) {
    console.warn("[games] could not persist scores", err);
  }
}

let persistedScores = loadGameScores();

const IG_MEDIA_FIELDS =
  "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{id,media_type,media_url,thumbnail_url}";

/** @returns {Promise<Record<string, unknown>>} */
async function fetchInstagramMediaJson(userId, accessToken) {
  const qp = new URLSearchParams({
    fields: IG_MEDIA_FIELDS,
    access_token: accessToken,
    limit: "24",
  });
  const urls = [
    `https://graph.facebook.com/v21.0/${encodeURIComponent(userId)}/media?${qp}`,
    `https://graph.instagram.com/${encodeURIComponent(userId)}/media?${qp}`,
  ];
  /** @type {unknown} */
  let lastBody = null;
  for (const url of urls) {
    const r = await fetch(url);
    lastBody = await r.json();
    if (r.ok && Array.isArray(/** @type {{ data?: unknown[] }} */ (lastBody)?.data)) {
      return /** @type {Record<string, unknown>} */ (lastBody);
    }
  }
  const msg =
    /** @type {{ error?: { message?: string }}} */ (lastBody)?.error?.message ||
    JSON.stringify(lastBody)?.slice(0, 240) ||
    "instagram_upstream_failed";
  throw new Error(msg);
}

/** @param {Record<string, unknown>} p */
function mapInstagramPost(p) {
  const t = String(p.media_type || "");
  if (!["IMAGE", "CAROUSEL_ALBUM", "VIDEO"].includes(t)) return null;

  let mediaUrl = "";
  if (t === "VIDEO") {
    mediaUrl = String(p.thumbnail_url || p.media_url || "");
  } else if (t === "CAROUSEL_ALBUM") {
    const children = /** @type {{ data?: Record<string, unknown>[] }} */ (p.children)?.data;
    if (Array.isArray(children) && children.length > 0) {
      const first = children[0];
      const ft = String(first.media_type || "");
      mediaUrl =
        ft === "VIDEO"
          ? String(first.thumbnail_url || first.media_url || "")
          : String(first.media_url || first.thumbnail_url || "");
    }
    if (!mediaUrl) mediaUrl = String(p.media_url || p.thumbnail_url || "");
  } else {
    mediaUrl = String(p.media_url || p.thumbnail_url || "");
  }

  if (!mediaUrl) return null;
  return {
    id: String(p.id || ""),
    caption: String(p.caption || ""),
    mediaUrl,
    permalink: String(p.permalink || ""),
    timestamp: String(p.timestamp || ""),
  };
}

/** @param {string} hostname */
function isAllowedInstagramCdnHost(hostname) {
  const h = String(hostname).toLowerCase();
  return (
    h === "cdninstagram.com" ||
    h.endsWith(".cdninstagram.com") ||
    h.includes("fbcdn.net") ||
    h === "instagram.com" ||
    h.endsWith(".instagram.com")
  );
}

/** @typedef {{ displays: import('ws').WebSocket[], remotes: import('ws').WebSocket[], page: number, snakeHighScore: number, snakeHighName: string, snakePendingScore: number, paraHighScore: number, paraHighName: string, paraPendingScore: number }} Room */

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
    r = {
      displays: [],
      remotes: [],
      page: DEFAULT_PAGE,
      snakeHighScore: persistedScores.snake.score,
      snakeHighName: persistedScores.snake.name,
      snakePendingScore: 0,
      paraHighScore: persistedScores.paraulogic.score,
      paraHighName: persistedScores.paraulogic.name,
      paraPendingScore: 0,
    };
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

  app.get("/api/instagram/latest", async (req, res) => {
    const userId = process.env.IG_USER_ID;
    const accessToken = process.env.IG_ACCESS_TOKEN;
    if (!userId || !accessToken) {
      res.json({ enabled: false, posts: [] });
      return;
    }
    const skipCache = req.query?.refresh != null || req.query?.fresh != null;
    if (!skipCache && instagramCache.payload && instagramCache.expiresAt > Date.now()) {
      res.json(instagramCache.payload);
      return;
    }
    try {
      const data = await fetchInstagramMediaJson(userId, accessToken);
      const rows = Array.isArray(data?.data) ? data.data : [];
      const posts = rows.map((entry) => mapInstagramPost(/** @type {Record<string, unknown>} */ (entry))).filter(Boolean);
      const payload = { enabled: true, posts };
      instagramCache.payload = payload;
      instagramCache.expiresAt = Date.now() + 5 * 60 * 1000;
      res.json(payload);
    } catch (e) {
      console.warn("[instagram]", e instanceof Error ? e.message : e);
      res.status(200).json({
        enabled: false,
        posts: [],
        error: "instagram_unavailable",
        message: req.query.debug != null ? (e instanceof Error ? e.message : String(e)) : undefined,
      });
    }
  });

  app.get("/api/instagram/media", async (req, res) => {
    const raw = req.query.u;
    if (typeof raw !== "string" || raw.length > 4096) {
      res.status(400).end();
      return;
    }
    let target;
    try {
      target = new URL(raw);
    } catch {
      res.status(400).end();
      return;
    }
    if (target.protocol !== "https:" || !isAllowedInstagramCdnHost(target.hostname)) {
      res.status(403).end();
      return;
    }
    try {
      const token = process.env.IG_ACCESS_TOKEN;
      let upstream = await fetch(target.toString(), {
        headers: { "User-Agent": "Mozilla/5.0 Espai42-Teletext/1" },
        redirect: "follow",
      });
      if (!upstream.ok && token) {
        const retry = new URL(target.toString());
        if (!retry.searchParams.has("access_token")) {
          retry.searchParams.set("access_token", token);
        }
        upstream = await fetch(retry.toString(), {
          headers: { "User-Agent": "Mozilla/5.0 Espai42-Teletext/1" },
          redirect: "follow",
        });
      }
      if (!upstream.ok) {
        res.status(502).end();
        return;
      }
      const ct = upstream.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", ct);
      res.setHeader("Cache-Control", "public, max-age=1800");
      res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch {
      res.status(502).end();
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
    const distIndexPath = path.join(root, "dist/index.html");
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      const p = req.path;
      if (p.startsWith("/api") || p.startsWith("/editor-assets") || p.startsWith("/ws")) {
        return next();
      }
      const html = fs.readFileSync(distIndexPath, "utf-8");
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    });
    app.use((req, res) => {
      if (req.path.startsWith("/api")) {
        res.status(404).json({ error: "unknown_api_route" });
        return;
      }
      res.sendStatus(404);
    });
  } else {
    const vite = await createViteServer({
      root,
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.use(async (req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      const p = req.path;
      if (p.startsWith("/api") || p.startsWith("/editor-assets") || p.startsWith("/ws")) {
        return next();
      }
      try {
        let html = fs.readFileSync(path.join(root, "index.html"), "utf-8");
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
    app.use((req, res, next) => {
      if (req.path.startsWith("/api")) {
        res.status(404).json({ error: "unknown_api_route" });
        return;
      }
      next();
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
        send(ws, { type: "record", game: "snake", score: r.snakeHighScore, name: r.snakeHighName });
        send(ws, { type: "record", game: "paraulogic", score: r.paraHighScore, name: r.paraHighName });
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
        if (!["up", "down", "left", "right", "start", "submit", "backspace", "shuffle"].includes(action)) return;
        broadcastDisplays(roomId, { type: "control", action });
        broadcastPresence(roomId);
      }

      if ((msg.type === "snakeResult" || msg.type === "gameResult") && role === "display") {
        const r = getRoom(roomId);
        const score = Number(msg.score);
        if (!Number.isFinite(score) || score < 0) return;
        const game = msg.type === "snakeResult" ? "snake" : (String(msg.game || "snake") === "paraulogic" ? "paraulogic" : "snake");
        const s = Math.floor(score);
        if (game === "paraulogic") {
          if (s > r.paraHighScore) {
            r.paraPendingScore = s;
            broadcastRemotes(roomId, { type: "recordPrompt", game, score: s });
          }
        } else if (s > r.snakeHighScore) {
          r.snakePendingScore = s;
          broadcastRemotes(roomId, { type: "recordPrompt", game, score: s });
        }
      }

      if (msg.type === "saveRecord" && role === "remote") {
        const r = getRoom(roomId);
        const name = String(msg.name || "").trim().slice(0, 12);
        if (!name) return;
        const game = String(msg.game || "snake") === "paraulogic" ? "paraulogic" : "snake";
        if (game === "paraulogic") {
          if (r.paraPendingScore <= r.paraHighScore) return;
          r.paraHighScore = r.paraPendingScore;
          r.paraPendingScore = 0;
          r.paraHighName = name.toUpperCase();
          persistedScores.paraulogic = { score: r.paraHighScore, name: r.paraHighName };
          saveGameScores(persistedScores);
          broadcastDisplays(roomId, { type: "record", game, score: r.paraHighScore, name: r.paraHighName });
          broadcastRemotes(roomId, { type: "record", game, score: r.paraHighScore, name: r.paraHighName });
          return;
        }
        if (r.snakePendingScore <= r.snakeHighScore) return;
        r.snakeHighScore = r.snakePendingScore;
        r.snakePendingScore = 0;
        r.snakeHighName = name.toUpperCase();
        persistedScores.snake = { score: r.snakeHighScore, name: r.snakeHighName };
        saveGameScores(persistedScores);
        broadcastDisplays(roomId, { type: "record", game, score: r.snakeHighScore, name: r.snakeHighName });
        broadcastRemotes(roomId, { type: "record", game, score: r.snakeHighScore, name: r.snakeHighName });
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
