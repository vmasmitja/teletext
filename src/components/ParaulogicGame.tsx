import { useEffect, useMemo, useRef, useState } from "react";
import { playTone } from "../audio";
import "./ParaulogicGame.css";

type Control = "up" | "down" | "left" | "right" | "submit" | "backspace" | "shuffle" | null;
type StatusTone = "neutral" | "ok" | "warn" | "error";

const CENTER = "A";
const OUTER_BASE = ["R", "T", "E", "L", "O", "C"];
const MIN_LEN = 3;
const ROUND_SECONDS = 90;

const FALLBACK_WORDS = [
  "art",
  "ara",
  "ala",
  "are",
  "arca",
  "arrel",
  "orar",
  "oral",
  "oracle",
  "cala",
  "calar",
  "calat",
  "calor",
  "cara",
  "careta",
  "carta",
  "carter",
  "carrer",
  "taca",
  "tacar",
  "talar",
  "tecla",
  "teatre",
  "teatral",
  "taller",
  "coral",
  "corral",
  "colera",
  "local",
  "retol",
  "retoca",
  "retocar",
  "relat",
  "relata",
  "alerta",
  "altera",
  "cerca",
  "correlat",
];

function scoreWord(word: string, pangram: boolean): number {
  const l = word.length;
  let points = 0;
  if (l <= 4) points = 1;
  else if (l === 5) points = 2;
  else if (l === 6) points = 3;
  else points = 5;
  if (pangram) points += 7;
  return points;
}

function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
}

export function ParaulogicGame({
  control,
  startTick,
  active,
  onGameOver,
}: {
  control: Control;
  startTick: number;
  active: boolean;
  onGameOver?: (score: number) => void;
}) {
  const [outer, setOuter] = useState<string[]>(OUTER_BASE);
  const letters = useMemo(() => [CENTER, ...outer], [outer]);
  const [selected, setSelected] = useState(0);
  const [currentWord, setCurrentWord] = useState("");
  const [found, setFound] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("PREM COMENCA PER INICIAR");
  const [statusTone, setStatusTone] = useState<StatusTone>("neutral");
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const [validWords, setValidWords] = useState<Set<string>>(() => new Set(FALLBACK_WORDS));
  const sentOverRef = useRef(false);

  const allowedLetters = useMemo(() => new Set(letters), [letters]);

  useEffect(() => {
    let alive = true;
    fetch("/api/games/paraulogic-dictionary")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("dictionary fetch failed"))))
      .then((data: { words?: string[] }) => {
        if (!alive) return;
        if (Array.isArray(data.words) && data.words.length > 0) {
          setValidWords(new Set(data.words.map(normalizeWord).filter(Boolean)));
        }
      })
      .catch(() => {
        if (!alive) return;
        setValidWords(new Set(FALLBACK_WORDS));
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (startTick <= 0) return;
    setOuter(shuffleArray(OUTER_BASE));
    setSelected(0);
    setCurrentWord("");
    setFound([]);
    setScore(0);
    setTimeLeft(ROUND_SECONDS);
    setRunning(true);
    setStatus("PARTIDA EN CURS");
    setStatusTone("neutral");
    setLastPoints(null);
    sentOverRef.current = false;
    playTone(540, 110, "square", 0.14);
    window.setTimeout(() => playTone(760, 130, "square", 0.14), 110);
  }, [startTick]);

  useEffect(() => {
    if (!running || !active) return;
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [active, running]);

  useEffect(() => {
    if (running || sentOverRef.current || timeLeft > 0) return;
    sentOverRef.current = true;
    setStatus("TEMPS ESGOTAT");
    setStatusTone("warn");
    playTone(220, 260, "sawtooth", 0.18);
    onGameOver?.(score);
  }, [onGameOver, running, score, timeLeft]);

  useEffect(() => {
    if (!running || !control) return;
    if (control === "left" || control === "up") {
      setSelected((s) => (s - 1 + letters.length) % letters.length);
      return;
    }
    if (control === "right" || control === "down") {
      setSelected((s) => (s + 1) % letters.length);
      return;
    }
    if (control === "shuffle") {
      setOuter((prev) => shuffleArray(prev));
      setStatus("LLETRES BARREJADES");
      setStatusTone("neutral");
      playTone(520, 65, "triangle", 0.08);
      return;
    }
    if (control === "backspace") {
      setCurrentWord((w) => w.slice(0, -1));
      setLastPoints(null);
      return;
    }
    if (control === "submit") {
      const word = normalizeWord(currentWord);
      if (!word) return;
      if (word.length < MIN_LEN) {
        setStatus("MASSA CURTA · MÍNIM 3");
        setStatusTone("warn");
        setLastPoints(null);
        playTone(180, 70, "square", 0.1);
        return;
      }
      if (!word.includes(CENTER.toLowerCase())) {
        setStatus(`FALTA LLETRA CENTRAL (${CENTER})`);
        setStatusTone("warn");
        setLastPoints(null);
        playTone(180, 70, "square", 0.1);
        return;
      }
      const onlyAllowed = [...word].every((ch) => allowedLetters.has(ch.toUpperCase()));
      if (!onlyAllowed) {
        setStatus("HI HA LLETRES FORA DEL RUSC");
        setStatusTone("error");
        setLastPoints(null);
        playTone(180, 70, "square", 0.1);
        return;
      }
      if (found.includes(word)) {
        setStatus("JA TROBADA");
        setStatusTone("warn");
        setLastPoints(null);
        playTone(180, 70, "square", 0.1);
        return;
      }
      if (!validWords.has(word)) {
        setStatus("NO ÉS AL DICCIONARI MVP (PROVA RELAT/CARTA/CARETA)");
        setStatusTone("error");
        setLastPoints(null);
        playTone(180, 70, "square", 0.1);
        return;
      }
      const uniqueLetters = new Set(word.toUpperCase());
      const pangram = letters.every((l) => uniqueLetters.has(l));
      const pts = scoreWord(word, pangram);
      setFound((prev) => [word, ...prev].slice(0, 10));
      setScore((s) => s + pts);
      setCurrentWord("");
      setStatus(pangram ? "PANGRAMA! BONUS +7" : "PARAULA ACCEPTADA");
      setStatusTone("ok");
      setLastPoints(pts);
      playTone(980, 90, "square", 0.14);
      return;
    }
    setCurrentWord((w) => (w + letters[selected]).slice(0, 16));
  }, [allowedLetters, control, currentWord, found, letters, running, selected, validWords]);

  return (
    <div className="para-wrap">
      <div className="para-headline">
        PÀG 502 · PARAULÒGIC · PUNTS {score.toString().padStart(2, "0")} · TEMPS {timeLeft}s
      </div>
      <div className="para-letters">
        {letters.map((l, i) => (
          <span
            key={`${l}-${i}`}
            className={`para-letter ${i === 0 ? "center" : ""} ${i === selected ? "selected" : ""}`.trim()}
          >
            {l}
          </span>
        ))}
      </div>
      <div className="para-word">{currentWord || "···"}</div>
      <div className="para-actions">START=Afegir · ENVIAR · ESBORRAR · BARREJAR</div>
      <div className={`para-status ${statusTone}`.trim()}>{status}</div>
      {lastPoints !== null && <div className="para-points">+{lastPoints}</div>}
      <div className="para-found">
        {found.length ? found.join(" · ").toUpperCase() : "Encara no hi ha paraules"}
      </div>
      {!running && timeLeft === ROUND_SECONDS && <div className="para-dead">PREM COMENÇA PER INICIAR</div>}
      {!running && timeLeft === 0 && <div className="para-dead">FI DE PARTIDA · TORNA A PÀG 502</div>}
    </div>
  );
}
