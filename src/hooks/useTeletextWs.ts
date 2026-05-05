import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_SESSION } from "../config";

type Role = "display" | "remote";

export function useTeletextWs(room: string, role: Role) {
  const [page, setPage] = useState(100);
  const [connected, setConnected] = useState(false);
  const [hasRemote, setHasRemote] = useState(false);
  const [lastControl, setLastControl] = useState<"up" | "down" | "left" | "right" | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: "hello", role, room: room || DEFAULT_SESSION }));
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as {
          type?: string;
          page?: number;
          hasRemote?: boolean;
          action?: "up" | "down" | "left" | "right";
        };
        if (msg.type === "state" && typeof msg.page === "number") {
          setPage(msg.page);
        }
        if (msg.type === "presence" && typeof msg.hasRemote === "boolean") {
          setHasRemote(msg.hasRemote);
        }
        if (msg.type === "control" && msg.action) {
          setLastControl(msg.action);
        }
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setHasRemote(false);
    };

    ws.onerror = () => {
      setConnected(false);
      setHasRemote(false);
    };

    return () => {
      wsRef.current = null;
      ws.close();
    };
  }, [room, role]);

  useEffect(() => {
    if (role !== "remote") return;
    const id = window.setInterval(() => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ type: "heartbeat" }));
    }, 500);
    return () => window.clearInterval(id);
  }, [role]);

  const setRemotePage = useCallback((next: number) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "setPage", page: next }));
  }, []);

  const sendControl = useCallback((action: "up" | "down" | "left" | "right") => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "control", action }));
  }, []);

  return { page, connected, hasRemote, lastControl, setRemotePage, sendControl };
}
