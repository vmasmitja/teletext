import { useEffect, useMemo, useRef, useState } from "react";
import { playTone } from "../audio";
import "./SnakeGame.css";

type Dir = "up" | "down" | "left" | "right";
type Cell = { x: number; y: number };

const W = 20;
const H = 14;

function nextHead(head: Cell, dir: Dir): Cell {
  if (dir === "up") return { x: head.x, y: head.y - 1 };
  if (dir === "down") return { x: head.x, y: head.y + 1 };
  if (dir === "left") return { x: head.x - 1, y: head.y };
  return { x: head.x + 1, y: head.y };
}

function rndFood(snake: Cell[]): Cell {
  while (true) {
    const c = { x: Math.floor(Math.random() * W), y: Math.floor(Math.random() * H) };
    if (!snake.some((s) => s.x === c.x && s.y === c.y)) return c;
  }
}

function freshSnake(): Cell[] {
  return [{ x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }];
}

export function SnakeGame({
  control,
  startTick,
  active,
  onGameOver,
}: {
  control: Dir | null;
  startTick: number;
  active: boolean;
  onGameOver?: (score: number) => void;
}) {
  const [snake, setSnake] = useState<Cell[]>(freshSnake());
  const [food, setFood] = useState<Cell>({ x: 12, y: 7 });
  const [dead, setDead] = useState(false);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const dirRef = useRef<Dir>("right");
  const sentOverRef = useRef(false);
  const melodyRef = useRef<number | null>(null);

  useEffect(() => {
    if (!control) return;
    const reverse =
      (dirRef.current === "up" && control === "down") ||
      (dirRef.current === "down" && control === "up") ||
      (dirRef.current === "left" && control === "right") ||
      (dirRef.current === "right" && control === "left");
    if (!reverse) {
      dirRef.current = control;
    }
  }, [control]);

  useEffect(() => {
    if (startTick <= 0) return;
    setSnake(freshSnake());
    setFood({ x: 12, y: 7 });
    setDead(false);
    setScore(0);
    setRunning(true);
    sentOverRef.current = false;
    dirRef.current = "right";
    playTone(440, 110, "square", 0.14);
    window.setTimeout(() => playTone(660, 130, "square", 0.14), 120);
  }, [startTick]);

  useEffect(() => {
    if (!active || dead || !running) return;
    const id = window.setInterval(() => {
      setSnake((prev) => {
        const head = nextHead(prev[0], dirRef.current);
        if (head.x < 0 || head.y < 0 || head.x >= W || head.y >= H) {
          setDead(true);
          return prev;
        }
        if (prev.some((p) => p.x === head.x && p.y === head.y)) {
          setDead(true);
          return prev;
        }
        const grow = head.x === food.x && head.y === food.y;
        const next = [head, ...prev];
        if (!grow) next.pop();
        else {
          setScore((s) => s + 1);
          setFood(rndFood(next));
          playTone(980, 110, "square", 0.18);
          window.setTimeout(() => playTone(1180, 80, "square", 0.14), 90);
        }
        return next;
      });
    }, 140);
    return () => window.clearInterval(id);
  }, [active, dead, food.x, food.y, running]);

  useEffect(() => {
    if (!dead || sentOverRef.current === true) return;
    sentOverRef.current = true;
    setRunning(false);
    playTone(320, 220, "sawtooth", 0.2);
    window.setTimeout(() => playTone(160, 260, "sawtooth", 0.2), 160);
    onGameOver?.(score);
  }, [dead, onGameOver, score]);

  useEffect(() => {
    if (!running || !active || dead) {
      if (melodyRef.current) {
        window.clearInterval(melodyRef.current);
        melodyRef.current = null;
      }
      return;
    }
    const notes = [523, 659, 784, 659];
    let i = 0;
    melodyRef.current = window.setInterval(() => {
      playTone(notes[i % notes.length], 95, "triangle", 0.045);
      i += 1;
    }, 420);
    return () => {
      if (melodyRef.current) {
        window.clearInterval(melodyRef.current);
        melodyRef.current = null;
      }
    };
  }, [active, dead, running]);

  const cells = useMemo(() => {
    const map = new Set(snake.map((s) => `${s.x}:${s.y}`));
    return Array.from({ length: W * H }, (_, i) => {
      const x = i % W;
      const y = Math.floor(i / W);
      const key = `${x}:${y}`;
      if (food.x === x && food.y === y) return "food";
      if (map.has(key)) return i === 0 ? "head" : "body";
      return "empty";
    });
  }, [snake, food.x, food.y]);

  return (
    <div className="snake-wrap">
      <div className="snake-headline">PÀG 106 · JOC SERP · PUNTS {score.toString().padStart(2, "0")}</div>
      <div className="snake-grid">
        {cells.map((c, i) => (
          <span key={i} className={`snake-cell ${c}`} />
        ))}
      </div>
      {!running && !dead && <div className="snake-dead">PREM COMENÇA PER INICIAR</div>}
      {dead && <div className="snake-dead">FI DE PARTIDA · TORNA A PÀG 106</div>}
    </div>
  );
}
