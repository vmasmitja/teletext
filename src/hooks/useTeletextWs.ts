import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_SESSION } from "../config";

type Role = "display" | "remote";
type GameKey = "snake" | "paraulogic";

export function useTeletextWs(room: string, role: Role) {
  const [page, setPage] = useState(100);
  const [connected, setConnected] = useState(false);
  const [hasRemote, setHasRemote] = useState(false);
  const [lastControl, setLastControl] = useState<
    "up" | "down" | "left" | "right" | "start" | "submit" | "backspace" | "shuffle" | null
  >(null);
  const [controlSeq, setControlSeq] = useState(0);
  const [startTick, setStartTick] = useState(0);
  const [snakeHighScore, setSnakeHighScore] = useState(0);
  const [snakeHighName, setSnakeHighName] = useState("ANONIM");
  const [paraHighScore, setParaHighScore] = useState(0);
  const [paraHighName, setParaHighName] = useState("ANONIM");
  const [recordPromptScore, setRecordPromptScore] = useState<number | null>(null);
  const [recordPromptGame, setRecordPromptGame] = useState<GameKey | null>(null);
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
          action?: "up" | "down" | "left" | "right" | "start" | "submit" | "backspace" | "shuffle";
          score?: number;
          name?: string;
          game?: GameKey;
        };
        if (msg.type === "state" && typeof msg.page === "number") {
          setPage(msg.page);
        }
        if (msg.type === "presence" && typeof msg.hasRemote === "boolean") {
          setHasRemote(msg.hasRemote);
        }
        if (msg.type === "control" && msg.action && ["up", "down", "left", "right", "start", "submit", "backspace", "shuffle"].includes(msg.action)) {
          setLastControl(msg.action);
          setControlSeq((s) => s + 1);
        }
        if (msg.type === "control" && msg.action === "start") {
          setStartTick((t) => t + 1);
        }
        if (msg.type === "record" && typeof msg.score === "number" && msg.name) {
          const game = msg.game === "paraulogic" ? "paraulogic" : "snake";
          if (game === "paraulogic") {
            setParaHighScore(msg.score);
            setParaHighName(msg.name);
          } else {
            setSnakeHighScore(msg.score);
            setSnakeHighName(msg.name);
          }
          if (recordPromptGame === game) {
            setRecordPromptScore(null);
            setRecordPromptGame(null);
          }
        }
        if (msg.type === "recordPrompt" && typeof msg.score === "number") {
          setRecordPromptScore(msg.score);
          setRecordPromptGame(msg.game === "paraulogic" ? "paraulogic" : "snake");
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

  const sendControl = useCallback((action: "up" | "down" | "left" | "right" | "submit" | "backspace" | "shuffle") => {
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
    ws.send(JSON.stringify({ type: "gameResult", game: "snake", score }));
  }, []);

  const sendParaulogicResult = useCallback((score: number) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "gameResult", game: "paraulogic", score }));
  }, []);

  const saveRecord = useCallback((name: string, game: GameKey = "snake") => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "saveRecord", name, game }));
  }, []);

  return {
    page,
    connected,
    hasRemote,
    lastControl,
    controlSeq,
    startTick,
    highScore: snakeHighScore,
    highName: snakeHighName,
    snakeHighScore,
    snakeHighName,
    paraHighScore,
    paraHighName,
    recordPromptScore,
    recordPromptGame,
    setRemotePage,
    sendControl,
    sendStart,
    sendSnakeResult,
    sendParaulogicResult,
    saveRecord,
    contentVersion,
  };
}
