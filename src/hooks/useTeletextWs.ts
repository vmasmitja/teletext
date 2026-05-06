import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_SESSION } from "../config";

type Role = "display" | "remote";

export function useTeletextWs(room: string, role: Role) {
  const [page, setPage] = useState(100);
  const [connected, setConnected] = useState(false);
  const [hasRemote, setHasRemote] = useState(false);
  const [lastControl, setLastControl] = useState<"up" | "down" | "left" | "right" | null>(null);
  const [startTick, setStartTick] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [highName, setHighName] = useState("ANONIM");
  const [recordPromptScore, setRecordPromptScore] = useState<number | null>(null);
  const [contentVersion, setContentVersion] = useState(0);
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
          action?: "up" | "down" | "left" | "right" | "start";
          score?: number;
          name?: string;
        };
        if (msg.type === "state" && typeof msg.page === "number") {
          setPage(msg.page);
        }
        if (msg.type === "presence" && typeof msg.hasRemote === "boolean") {
          setHasRemote(msg.hasRemote);
        }
        if (msg.type === "control" && msg.action && msg.action !== "start") {
          setLastControl(msg.action);
        }
        if (msg.type === "control" && msg.action === "start") {
          setStartTick((t) => t + 1);
        }
        if (msg.type === "record" && typeof msg.score === "number" && msg.name) {
          setHighScore(msg.score);
          setHighName(msg.name);
          setRecordPromptScore(null);
        }
        if (msg.type === "recordPrompt" && typeof msg.score === "number") {
          setRecordPromptScore(msg.score);
        }
        if (msg.type === "contentUpdated") {
          setContentVersion((v) => v + 1);
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

  const sendStart = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "control", action: "start" }));
  }, []);

  const sendSnakeResult = useCallback((score: number) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "snakeResult", score }));
  }, []);

  const saveRecord = useCallback((name: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "saveRecord", name }));
  }, []);

  return {
    page,
    connected,
    hasRemote,
    lastControl,
    startTick,
    highScore,
    highName,
    recordPromptScore,
    setRemotePage,
    sendControl,
    sendStart,
    sendSnakeResult,
    saveRecord,
    contentVersion,
  };
}
