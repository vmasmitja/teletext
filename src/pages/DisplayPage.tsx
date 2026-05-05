import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { getAudioState, isAudioUnlockedStored, primeAudioFromStorage, unlockAudioByGesture } from "../audio";
import { DEFAULT_SESSION } from "../config";
import type { TeletextLine } from "../content";
import logoPng from "../assets/espai42-logo.png";
import { SnakeGame } from "../components/SnakeGame";
import { TeletextTveHome } from "../components/TeletextTveHome";
import { TeletextScreen } from "../components/TeletextScreen";
import { useTeletextWs } from "../hooks/useTeletextWs";
import "./DisplayPage.css";

export function DisplayPage() {
  const [params] = useSearchParams();
  const room = params.get("r") ?? DEFAULT_SESSION;
  const [remoteBaseUrl, setRemoteBaseUrl] = useState<string | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(() => isAudioUnlockedStored());
  const [audioRunning, setAudioRunning] = useState(() => getAudioState() === "running");
  const [showWelcome, setShowWelcome] = useState(false);
  const prevRemoteRef = useRef(false);
  const welcomeTimerRef = useRef<number | null>(null);

  const { page, hasRemote, lastControl, startTick, highScore, highName, sendSnakeResult, setRemotePage } =
    useTeletextWs(room, "display");

  useEffect(() => {
    const prev = prevRemoteRef.current;
    prevRemoteRef.current = hasRemote;
    if (hasRemote && !prev) {
      setShowWelcome(true);
      if (welcomeTimerRef.current) window.clearTimeout(welcomeTimerRef.current);
      welcomeTimerRef.current = window.setTimeout(() => {
        setShowWelcome(false);
        setRemotePage(100);
      }, 4000);
    }
    if (!hasRemote) {
      setShowWelcome(false);
      if (welcomeTimerRef.current) {
        window.clearTimeout(welcomeTimerRef.current);
        welcomeTimerRef.current = null;
      }
    }
  }, [hasRemote, setRemotePage]);

  useEffect(() => {
    primeAudioFromStorage();
    setAudioRunning(getAudioState() === "running");
    const id = window.setInterval(() => {
      setAudioRunning(getAudioState() === "running");
    }, 2000);
    let alive = true;
    fetch("/api/runtime")
      .then((r) => r.json())
      .then((data: { localIp?: string; port?: string; publicBaseUrl?: string | null }) => {
        if (!alive) return;
        if (data.publicBaseUrl) {
          setRemoteBaseUrl(data.publicBaseUrl);
          return;
        }
        const protocol = window.location.protocol;
        const port = data.port || window.location.port || "5173";
        if (data.localIp) {
          setRemoteBaseUrl(`${protocol}//${data.localIp}:${port}`);
        } else {
          setRemoteBaseUrl(window.location.origin);
        }
      })
      .catch(() => {
        if (alive) setRemoteBaseUrl(window.location.origin);
      });
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  const remoteUrl = useMemo(() => {
    const base = remoteBaseUrl ?? window.location.origin;
    const u = new URL("/comandament", base);
    u.searchParams.set("r", room);
    return u.toString();
  }, [room, remoteBaseUrl]);

  const websiteUrl = "https://espai42.org";

  const snakeInfoLines = useMemo<TeletextLine[] | undefined>(() => {
    if (page !== 501) return undefined;
    const scoreText = String(highScore).padStart(2, "0");
    return [
      { text: "                              ", color: "w" },
      { text: "  JOC DE LA SERP              ", color: "y" },
      { text: "                              ", color: "w" },
      { text: "  Control: COMENCA + fletxes  ", color: "w" },
      { text: "  del comandament mobil.      ", color: "w" },
      { text: "                              ", color: "w" },
      { text: "  Record actual:              ", color: "c" },
      { text: `  ${scoreText} punts - ${highName}`.padEnd(30, " "), color: "c" },
      { text: "                              ", color: "w" },
      { text: "  En morir, si fas record,    ", color: "m" },
      { text: "  posa el teu nom al mobil.   ", color: "m" },
      { text: "                              ", color: "w" },
      { text: "  Pàg 501       ESPai42       ", color: "g" },
    ];
  }, [page, highName, highScore]);

  return (
    <div className="display-layout">
      <div className={`display-crt ${page === 100 ? "display-page-home" : ""}`.trim()}>
        <div className="crt-overlay" aria-hidden />
        <div className="teletext-accent teletext-accent-a" aria-hidden />
        <div className="teletext-accent teletext-accent-b" aria-hidden />
        <img
          src={logoPng}
          alt="Logo Espai42"
          className={`display-logo ${hasRemote ? "side" : "hero"}`}
        />
        {page === 100 ? (
          <TeletextTveHome className="display-screen display-tve-home-wrap" />
        ) : (
          <TeletextScreen pageNum={page} className="display-screen" lineOverrides={snakeInfoLines} />
        )}
        {page === 501 && (
          <SnakeGame
            control={lastControl}
            startTick={startTick}
            active={hasRemote}
            onGameOver={(score) => sendSnakeResult(score)}
          />
        )}
        {showWelcome && (
          <div className="display-welcome" aria-live="polite">
            <div className="display-welcome-rays" aria-hidden />
            <div className="display-welcome-logo-wrap">
              <img src={logoPng} alt="Logo Espai42" className="display-welcome-logo" />
            </div>
            <div className="display-welcome-title">Benvinguts a ESPai42!</div>
            <div className="display-welcome-sub">Teletext interactiu en directe</div>
          </div>
        )}
        <div className={`display-waiting ${hasRemote ? "hidden" : ""}`}>
          {!hasRemote && (
            <>
              <p className="display-waiting-title">ESCANEJA I CONTROLA</p>
              {page === 401 ? (
                <div className="display-dual-qrs">
                  <div className="display-qr-card">
                    <div className="display-qr">
                      <QRCodeSVG value={remoteUrl} size={190} level="M" fgColor="#111" bgColor="#fff" />
                    </div>
                    <p className="display-waiting-text">Comandament teletext</p>
                  </div>
                  <div className="display-qr-card">
                    <div className="display-qr">
                      <QRCodeSVG value={websiteUrl} size={190} level="M" fgColor="#111" bgColor="#fff" />
                    </div>
                    <p className="display-waiting-text">Web oficial Espai42</p>
                  </div>
                </div>
              ) : (
                <div className="display-qr-card single">
                  <div className="display-qr">
                    <QRCodeSVG value={remoteUrl} size={210} level="M" fgColor="#111" bgColor="#fff" />
                  </div>
                  <p className="display-waiting-text">Comandament teletext</p>
                </div>
              )}
              <p className="display-waiting-sub">Sessió {room}</p>
            </>
          )}
        </div>
        {page === 401 && (
          <div className="display-contact-qr">
            <div className="display-qr">
              <QRCodeSVG value={websiteUrl} size={150} level="M" fgColor="#111" bgColor="#fff" />
            </div>
            <div className="display-contact-caption">WEB NORMAL: ESPAI42.ORG</div>
          </div>
        )}
        {hasRemote && <div className="display-live-pill">TELETEXT EN DIRECTE</div>}
        <div className="display-url">{remoteUrl}</div>
        {!audioRunning && (
          <button
            type="button"
            className="display-audio-unlock"
            onClick={async () => {
              const ok = await unlockAudioByGesture();
              if (ok) {
                setAudioUnlocked(true);
                setAudioRunning(true);
              }
            }}
          >
            {audioUnlocked ? "REACTIVA SO" : "ACTIVA SO (1A VEGADA)"}
          </button>
        )}
      </div>
    </div>
  );
}
