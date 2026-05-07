import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { getAudioState, isAudioUnlockedStored, primeAudioFromStorage, unlockAudioByGesture } from "../audio";
import { DEFAULT_SESSION } from "../config";
import type { TeletextLine } from "../content";
import logoPng from "../assets/espai42-logo.png";
import { ArtPage310 } from "../components/ArtPage310";
import { ArtPage320 } from "../components/ArtPage320";
import { ArtPage330 } from "../components/ArtPage330";
import { ArtPage340 } from "../components/ArtPage340";
import { ParaulogicGame } from "../components/ParaulogicGame";
import { SnakeGame } from "../components/SnakeGame";
import { TeletextTveHome } from "../components/TeletextTveHome";
import { TeletextScreen } from "../components/TeletextScreen";
import { useRuntimeContent } from "../hooks/useRuntimeContent";
import { useTeletextWs } from "../hooks/useTeletextWs";
import "./DisplayPage.css";

export function DisplayPage() {
  const [params] = useSearchParams();
  const room = params.get("r") ?? DEFAULT_SESSION;
  const [remoteBaseUrl, setRemoteBaseUrl] = useState<string | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(() => isAudioUnlockedStored());
  const [audioRunning, setAudioRunning] = useState(() => getAudioState() === "running");
  const [showWelcome, setShowWelcome] = useState(false);
  const [igPosts, setIgPosts] = useState<Array<{ id: string; mediaUrl: string; caption: string; permalink: string }>>([]);
  const [igEnabled, setIgEnabled] = useState(false);
  const [igIndex, setIgIndex] = useState(0);
  const prevRemoteRef = useRef(false);
  const welcomeTimerRef = useRef<number | null>(null);

  const {
    page,
    hasRemote,
    lastControl,
    startTick,
    snakeHighScore,
    snakeHighName,
    paraHighScore,
    paraHighName,
    sendSnakeResult,
    sendParaulogicResult,
    setRemotePage,
    contentVersion,
  } = useTeletextWs(room, "display");
  const { getPage, sectionByIndexPage, residentByPage } = useRuntimeContent(contentVersion);
  const currentPageDef = getPage(page);
  const currentSection = sectionByIndexPage.get(page);
  const currentResident = residentByPage.get(page);
  const residentImagePath = currentResident?.imagePath?.trim() || null;

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
  const hideBackdropLogo =
    page === 100 || page === 402 || Boolean(currentSection) || Boolean(residentImagePath);

  const snakeInfoLines = useMemo<TeletextLine[] | undefined>(() => {
    if (page !== 501) return undefined;
    const scoreText = String(snakeHighScore).padStart(2, "0");
    return [
      { text: "                              ", color: "w" },
      { text: "  JOC DE LA SERP              ", color: "y" },
      { text: "                              ", color: "w" },
      { text: "  Control: COMENCA + fletxes  ", color: "w" },
      { text: "  del comandament mobil.      ", color: "w" },
      { text: "                              ", color: "w" },
      { text: "  Record actual:              ", color: "c" },
      { text: `  ${scoreText} punts - ${snakeHighName}`.padEnd(30, " "), color: "c" },
      { text: "                              ", color: "w" },
      { text: "  En morir, si fas record,    ", color: "m" },
      { text: "  posa el teu nom al mobil.   ", color: "m" },
      { text: "                              ", color: "w" },
      { text: "  Pàg 501       ESPai42       ", color: "g" },
    ];
  }, [page, snakeHighName, snakeHighScore]);

  const paraInfoLines = useMemo<TeletextLine[] | undefined>(() => {
    if (page !== 502) return undefined;
    const scoreText = String(paraHighScore).padStart(2, "0");
    return [
      { text: "                              ", color: "w" },
      { text: "  PARAULÒGIC COMUNITARI       ", color: "y" },
      { text: "                              ", color: "w" },
      { text: "  Control: COMENCA per jugar  ", color: "w" },
      { text: "  fletxes per canviar lletra  ", color: "w" },
      { text: "                              ", color: "w" },
      { text: "  LLETRA CENTRAL OBLIGATORIA  ", color: "c" },
      { text: "  Mínim 3 lletres per paraula ", color: "c" },
      { text: "                              ", color: "w" },
      { text: "  Rècord actual:              ", color: "m" },
      { text: `  ${scoreText} punts - ${paraHighName}`.padEnd(30, " "), color: "m" },
      { text: "                              ", color: "w" },
      { text: "  Pàg 502       ESPai42       ", color: "g" },
    ];
  }, [page, paraHighName, paraHighScore]);

  useEffect(() => {
    if (page !== 402) return;
    let alive = true;
    fetch("/api/instagram/latest?refresh=1")
      .then((r) => r.json())
      .then((data: { enabled?: boolean; posts?: Array<{ id: string; mediaUrl: string; caption: string; permalink: string }> }) => {
        if (!alive) return;
        setIgEnabled(Boolean(data?.enabled));
        setIgPosts(Array.isArray(data?.posts) ? data.posts : []);
      })
      .catch(() => {
        if (alive) {
          setIgEnabled(false);
          setIgPosts([]);
        }
      });
    return () => {
      alive = false;
    };
  }, [page]);

  useEffect(() => {
    if (page !== 402 || igPosts.length <= 1) return;
    const id = window.setInterval(() => {
      setIgIndex((i) => (i + 1) % igPosts.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, [page, igPosts.length]);

  useEffect(() => {
    if (igPosts.length === 0) setIgIndex(0);
    else setIgIndex((i) => i % igPosts.length);
  }, [igPosts.length]);

  return (
    <div className="display-layout">
      <div
        className={`display-crt ${page === 100 ? "display-page-home" : ""} ${page === 402 ? "display-page-xarxes" : ""}`.trim()}
      >
        <div className="crt-overlay" aria-hidden />
        <div className="teletext-accent teletext-accent-a" aria-hidden />
        <div className="teletext-accent teletext-accent-b" aria-hidden />
        {!hideBackdropLogo && (
          <img
            src={logoPng}
            alt="Logo Espai42"
            className={`display-logo ${hasRemote ? "side" : "hero"}`}
          />
        )}
        {residentImagePath && (
          <img src={residentImagePath} alt="Logo resident" className={`display-logo resident ${hasRemote ? "side" : "hero"}`} />
        )}
        {page === 100 ? (
          <TeletextTveHome className="display-screen display-tve-home-wrap" />
        ) : currentSection?.key === "ART" ? (
          <ArtPage310 className="display-screen" section={currentSection} />
        ) : currentSection?.key === "ARTESANIA" ? (
          <ArtPage320 className="display-screen" section={currentSection} />
        ) : currentSection?.key === "MAKERS" ? (
          <ArtPage330 className="display-screen" section={currentSection} />
        ) : currentSection?.key === "SOSTENIBILITAT" ? (
          <ArtPage340 className="display-screen" section={currentSection} />
        ) : (
          <TeletextScreen
            pageNum={page}
            className="display-screen"
            lineOverrides={snakeInfoLines ?? paraInfoLines}
            pageDefOverride={currentPageDef}
          />
        )}
        {page === 501 && (
          <SnakeGame
            control={lastControl === "up" || lastControl === "down" || lastControl === "left" || lastControl === "right" ? lastControl : null}
            startTick={startTick}
            active={hasRemote}
            onGameOver={(score) => sendSnakeResult(score)}
          />
        )}
        {page === 502 && (
          <ParaulogicGame
            control={lastControl}
            startTick={startTick}
            active={hasRemote}
            onGameOver={(score) => sendParaulogicResult(score)}
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
        {page === 402 && igEnabled && igPosts.length > 0 && (
          <div className="display-instagram-carousel">
            <div className="display-instagram-title">INSTAGRAM @ESPAI42</div>
            <a
              href={igPosts[igIndex].permalink || "https://instagram.com/espai42"}
              target="_blank"
              rel="noreferrer"
              className="display-instagram-link"
            >
              <div className="display-instagram-pixel-shell">
                <img
                  src={`/api/instagram/media?u=${encodeURIComponent(igPosts[igIndex].mediaUrl)}`}
                  alt="Post Instagram Espai42"
                  className="display-instagram-image"
                  referrerPolicy="no-referrer"
                />
              </div>
            </a>
            <div className="display-instagram-caption">{(igPosts[igIndex].caption || "").slice(0, 84) || "Post d'Instagram"}</div>
            {igPosts.length > 1 && (
              <div className="display-instagram-controls">
                <button type="button" onClick={() => setIgIndex((i) => (i - 1 + igPosts.length) % igPosts.length)}>
                  ◀
                </button>
                <span>
                  {igIndex + 1}/{igPosts.length}
                </span>
                <button type="button" onClick={() => setIgIndex((i) => (i + 1) % igPosts.length)}>
                  ▶
                </button>
              </div>
            )}
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
