import fs from "fs";
import os from "os";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import express from "express";
import { WebSocketServer } from "ws";
import { createServer as createViteServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const isProd = process.env.NODE_ENV === "production";

/** @typedef {{ displays: import('ws').WebSocket[], remotes: import('ws').WebSocket[], page: number }} Room */

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
    r = { displays: [], remotes: [], page: DEFAULT_PAGE };
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

async function buildApp() {
  const app = express();
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
        if (!["up", "down", "left", "right"].includes(action)) return;
        broadcastDisplays(roomId, { type: "control", action });
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
