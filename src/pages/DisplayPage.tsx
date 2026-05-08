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

type LayoutRect = { x: number; y: number; w: number; h: number };
type LayoutConfig = Record<string, LayoutRect>;
type EditableSlot = "residentImage" | "mainLogo" | "instagramCarousel" | "mainContent" | "snakeGame" | "paraulogicGame";

type DisplayPageProps = {
  layoutMode?: boolean;
  layoutToken?: string | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getLayoutKey(pageNum: number, slot: EditableSlot) {
  return `p${pageNum}.${slot}`;
}

const QUICK_LAYOUT_PAGES = [100, 101, 102, 103, 104, 201, 202, 203, 204, 300, 310, 320, 330, 340, 401, 402, 403, 501, 502];

export function DisplayPage({ layoutMode = false, layoutToken = null }: DisplayPageProps) {
  const [params] = useSearchParams();
  const room = params.get("r") ?? DEFAULT_SESSION;
  const [remoteBaseUrl, setRemoteBaseUrl] = useState<string | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(() => isAudioUnlockedStored());
  const [audioRunning, setAudioRunning] = useState(() => getAudioState() === "running");
  const [showWelcome, setShowWelcome] = useState(false);
  const [igPosts, setIgPosts] = useState<
    Array<{
      id: string;
      mediaType?: string;
      mediaUrl: string;
      caption: string;
      permalink: string;
      likeCount?: number;
      commentCount?: number;
      timestamp?: string;
    }>
  >([]);
  const [igDirectMediaById, setIgDirectMediaById] = useState<Record<string, boolean>>({});
  const [igEnabled, setIgEnabled] = useState(false);
  const [igIndex, setIgIndex] = useState(0);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>({});
  const [layoutDraft, setLayoutDraft] = useState<LayoutConfig>({});
  const [layoutDirty, setLayoutDirty] = useState(false);
  const [layoutStatus, setLayoutStatus] = useState("");
  const [layoutPageInput, setLayoutPageInput] = useState("100");
  const prevRemoteRef = useRef(false);
  const welcomeTimerRef = useRef<number | null>(null);
  const dragRef = useRef<{ key: string; mode: "move" | "resize"; startX: number; startY: number; rect: LayoutRect } | null>(null);

  const {
    page,
    hasRemote,
    lastControl,
    controlSeq,
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
  const { getPage, knownPageNums, sectionByIndexPage, residentByPage } = useRuntimeContent(contentVersion);
  const currentPageDef = getPage(page);
  const currentSection = sectionByIndexPage.get(page);
  const currentResident = residentByPage.get(page);
  const residentImagePath = currentResident?.imagePath?.trim() || null;

  useEffect(() => {
    if (layoutMode) {
      setShowWelcome(false);
      return;
    }
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
  }, [hasRemote, setRemotePage, layoutMode]);

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

  const quickPages = useMemo(() => {
    const unique = new Set<number>([...QUICK_LAYOUT_PAGES, ...knownPageNums]);
    return [...unique]
      .filter((n) => Number.isFinite(n) && n >= 100 && n <= 899)
      .sort((a, b) => a - b);
  }, [knownPageNums]);

  useEffect(() => {
    if (page !== 402) return;
    let alive = true;
    fetch("/api/instagram/latest?refresh=1")
      .then((r) => r.json())
      .then(
        (data: {
          enabled?: boolean;
          posts?: Array<{
            id: string;
            mediaType?: string;
            mediaUrl: string;
            caption: string;
            permalink: string;
            likeCount?: number;
            commentCount?: number;
            timestamp?: string;
          }>;
        }) => {
        if (!alive) return;
        setIgEnabled(Boolean(data?.enabled));
        setIgPosts(Array.isArray(data?.posts) ? data.posts : []);
        setIgDirectMediaById({});
      })
      .catch(() => {
        if (alive) {
          setIgEnabled(false);
          setIgPosts([]);
          setIgDirectMediaById({});
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

  useEffect(() => {
    let alive = true;
    fetch(layoutMode ? "/api/editor/layout" : "/api/layout/public", {
      headers: layoutMode && layoutToken ? { Authorization: `Bearer ${layoutToken}` } : undefined,
    })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        if (!alive || !data || typeof data !== "object") return;
        setLayoutConfig(data as LayoutConfig);
        setLayoutDraft(data as LayoutConfig);
      })
      .catch(() => {
        if (alive) {
          setLayoutConfig({});
          setLayoutDraft({});
        }
      });
    return () => {
      alive = false;
    };
  }, [layoutMode, layoutToken]);

  useEffect(() => {
    setLayoutPageInput(String(page));
  }, [page]);

  useEffect(() => {
    if (!layoutMode) return;
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const vw = Math.max(1, window.innerWidth);
      const vh = Math.max(1, window.innerHeight);
      const dx = ((e.clientX - drag.startX) / vw) * 100;
      const dy = ((e.clientY - drag.startY) / vh) * 100;
      const next = { ...drag.rect };
      if (drag.mode === "move") {
        next.x = clamp(drag.rect.x + dx, 0, 100 - next.w);
        next.y = clamp(drag.rect.y + dy, 0, 100 - next.h);
      } else {
        next.w = clamp(drag.rect.w + dx, 6, 100 - drag.rect.x);
        next.h = clamp(drag.rect.h + dy, 6, 100 - drag.rect.y);
      }
      setLayoutDraft((prev) => ({ ...prev, [drag.key]: next }));
      setLayoutDirty(true);
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [layoutMode]);

  function currentRect(slot: EditableSlot, fallback: LayoutRect): LayoutRect {
    const key = getLayoutKey(page, slot);
    return layoutDraft[key] || layoutConfig[key] || fallback;
  }

  function wrapperStyle(slot: EditableSlot, fallback: LayoutRect) {
    const rect = currentRect(slot, fallback);
    return {
      position: "absolute" as const,
      left: `${rect.x}%`,
      top: `${rect.y}%`,
      width: `${rect.w}%`,
      height: `${rect.h}%`,
      right: "auto",
      bottom: "auto",
    };
  }

  function hasCustomRect(slot: EditableSlot) {
    return Boolean(layoutConfig[getLayoutKey(page, slot)] || layoutDraft[getLayoutKey(page, slot)]);
  }

  function startDrag(e: { preventDefault: () => void; stopPropagation: () => void; clientX: number; clientY: number }, key: string, mode: "move" | "resize", rect: LayoutRect) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      key,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      rect,
    };
  }

  async function saveLayout() {
    if (!layoutMode || !layoutToken) return;
    setLayoutStatus("Guardant maquetacio...");
    const r = await fetch("/api/editor/layout", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${layoutToken}`,
      },
      body: JSON.stringify(layoutDraft),
    });
    if (!r.ok) {
      setLayoutStatus("Error guardant maquetacio");
      return;
    }
    setLayoutConfig(layoutDraft);
    setLayoutDirty(false);
    setLayoutStatus("Maquetacio guardada");
  }

  function resetCurrentPageLayout() {
    setLayoutDraft((prev) => {
      const next = { ...prev };
      delete next[getLayoutKey(page, "residentImage")];
      delete next[getLayoutKey(page, "mainLogo")];
      delete next[getLayoutKey(page, "instagramCarousel")];
      delete next[getLayoutKey(page, "mainContent")];
      delete next[getLayoutKey(page, "snakeGame")];
      delete next[getLayoutKey(page, "paraulogicGame")];
      return next;
    });
    setLayoutDirty(true);
    setLayoutStatus("Posicions de la pagina reiniciades (pendent guardar)");
  }

  const mainContent =
    page === 100 ? (
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
      <TeletextScreen pageNum={page} className="display-screen" lineOverrides={snakeInfoLines ?? paraInfoLines} pageDefOverride={currentPageDef} />
    );

  return (
    <div className={`display-layout ${layoutMode ? "display-layout-mode" : ""}`}>
      <div
        className={`display-crt ${page === 100 ? "display-page-home" : ""} ${page === 402 ? "display-page-xarxes" : ""}`.trim()}
      >
        {layoutMode && (
          <div className="layout-toolbar">
            <strong>Mode maquetacio</strong>
            <label>
              Pagina
              <input
                value={layoutPageInput}
                onChange={(e) => setLayoutPageInput(e.target.value)}
                onBlur={() => {
                  const next = Number(layoutPageInput);
                  if (Number.isFinite(next) && next >= 100 && next <= 899) setRemotePage(Math.floor(next));
                }}
              />
            </label>
            <button type="button" onClick={() => {
              const next = Number(layoutPageInput);
              if (Number.isFinite(next) && next >= 100 && next <= 899) setRemotePage(Math.floor(next));
            }}>
              Anar
            </button>
            <button type="button" onClick={saveLayout} disabled={!layoutDirty}>
              Guardar maquetacio
            </button>
            <button type="button" onClick={resetCurrentPageLayout}>
              Reiniciar pagina
            </button>
            <span>{layoutStatus}</span>
            <div className="layout-page-pills">
              {quickPages.map((p) => (
                <button key={p} type="button" onClick={() => setRemotePage(p)} className={p === page ? "active" : ""}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="crt-overlay" aria-hidden />
        <div className="teletext-accent teletext-accent-a" aria-hidden />
        <div className="teletext-accent teletext-accent-b" aria-hidden />
        {!hideBackdropLogo &&
          (layoutMode || hasCustomRect("mainLogo") ? (
            <div
              className="layout-box"
              style={wrapperStyle("mainLogo", { x: 56, y: 29, w: 34, h: 44 })}
              onPointerDown={
                layoutMode
                  ? (e) => startDrag(e, getLayoutKey(page, "mainLogo"), "move", currentRect("mainLogo", { x: 56, y: 29, w: 34, h: 44 }))
                  : undefined
              }
            >
              <img src={logoPng} alt="Logo Espai42" className={`display-logo layout-managed ${hasRemote ? "side" : "hero"}`} />
              {layoutMode && (
                <button
                  type="button"
                  className="layout-resize"
                  onPointerDown={(e) => startDrag(e, getLayoutKey(page, "mainLogo"), "resize", currentRect("mainLogo", { x: 56, y: 29, w: 34, h: 44 }))}
                >
                  ↘
                </button>
              )}
            </div>
          ) : (
            <img src={logoPng} alt="Logo Espai42" className={`display-logo ${hasRemote ? "side" : "hero"}`} />
          ))}
        {residentImagePath &&
          (layoutMode || hasCustomRect("residentImage") ? (
            <div
              className="layout-box"
              style={wrapperStyle("residentImage", { x: 56, y: 30, w: 32, h: 42 })}
              onPointerDown={
                layoutMode
                  ? (e) =>
                      startDrag(e, getLayoutKey(page, "residentImage"), "move", currentRect("residentImage", { x: 56, y: 30, w: 32, h: 42 }))
                  : undefined
              }
            >
              <img src={residentImagePath} alt="Logo resident" className={`display-logo resident layout-managed ${hasRemote ? "side" : "hero"}`} />
              {layoutMode && (
                <button
                  type="button"
                  className="layout-resize"
                  onPointerDown={(e) =>
                    startDrag(e, getLayoutKey(page, "residentImage"), "resize", currentRect("residentImage", { x: 56, y: 30, w: 32, h: 42 }))
                  }
                >
                  ↘
                </button>
              )}
            </div>
          ) : (
            <img src={residentImagePath} alt="Logo resident" className={`display-logo resident ${hasRemote ? "side" : "hero"}`} />
          ))}
        {(layoutMode || hasCustomRect("mainContent")) ? (
          <div
            className="layout-box layout-main-content"
            style={wrapperStyle("mainContent", { x: 0, y: 0, w: 100, h: 100 })}
            onPointerDown={layoutMode ? (e) => startDrag(e, getLayoutKey(page, "mainContent"), "move", currentRect("mainContent", { x: 0, y: 0, w: 100, h: 100 })) : undefined}
          >
            <div className="layout-managed-screen">{mainContent}</div>
            {layoutMode && (
              <button
                type="button"
                className="layout-resize"
                onPointerDown={(e) => startDrag(e, getLayoutKey(page, "mainContent"), "resize", currentRect("mainContent", { x: 0, y: 0, w: 100, h: 100 }))}
              >
                ↘
              </button>
            )}
          </div>
        ) : (
          mainContent
        )}
        {page === 501 &&
          ((layoutMode || hasCustomRect("snakeGame")) ? (
            <div
              className="layout-box layout-game"
              style={wrapperStyle("snakeGame", { x: 47, y: 23, w: 49, h: 64 })}
              onPointerDown={layoutMode ? (e) => startDrag(e, getLayoutKey(page, "snakeGame"), "move", currentRect("snakeGame", { x: 47, y: 23, w: 49, h: 64 })) : undefined}
            >
              <SnakeGame
                control={lastControl === "up" || lastControl === "down" || lastControl === "left" || lastControl === "right" ? lastControl : null}
                startTick={startTick}
                active={hasRemote}
                onGameOver={(score) => sendSnakeResult(score)}
              />
              {layoutMode && (
                <button
                  type="button"
                  className="layout-resize"
                  onPointerDown={(e) => startDrag(e, getLayoutKey(page, "snakeGame"), "resize", currentRect("snakeGame", { x: 47, y: 23, w: 49, h: 64 }))}
                >
                  ↘
                </button>
              )}
            </div>
          ) : (
            <SnakeGame
              control={lastControl === "up" || lastControl === "down" || lastControl === "left" || lastControl === "right" ? lastControl : null}
              startTick={startTick}
              active={hasRemote}
              onGameOver={(score) => sendSnakeResult(score)}
            />
          ))}
        {page === 502 &&
          ((layoutMode || hasCustomRect("paraulogicGame")) ? (
            <div
              className="layout-box layout-game"
              style={wrapperStyle("paraulogicGame", { x: 46, y: 12, w: 52, h: 82 })}
              onPointerDown={
                layoutMode ? (e) => startDrag(e, getLayoutKey(page, "paraulogicGame"), "move", currentRect("paraulogicGame", { x: 46, y: 12, w: 52, h: 82 })) : undefined
              }
            >
              <ParaulogicGame
                control={lastControl}
                controlSeq={controlSeq}
                startTick={startTick}
                active={hasRemote}
                onGameOver={(score) => sendParaulogicResult(score)}
              />
              {layoutMode && (
                <button
                  type="button"
                  className="layout-resize"
                  onPointerDown={(e) =>
                    startDrag(e, getLayoutKey(page, "paraulogicGame"), "resize", currentRect("paraulogicGame", { x: 46, y: 12, w: 52, h: 82 }))
                  }
                >
                  ↘
                </button>
              )}
            </div>
          ) : (
            <ParaulogicGame
              control={lastControl}
              controlSeq={controlSeq}
              startTick={startTick}
              active={hasRemote}
              onGameOver={(score) => sendParaulogicResult(score)}
            />
          ))}
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
        {!layoutMode && (
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
        )}
        {page === 401 && !layoutMode && (
          <div className="display-contact-qr">
            <div className="display-qr">
              <QRCodeSVG value={websiteUrl} size={150} level="M" fgColor="#111" bgColor="#fff" />
            </div>
            <div className="display-contact-caption">WEB NORMAL: ESPAI42.ORG</div>
          </div>
        )}
        {page === 402 && igEnabled && igPosts.length > 0 &&
          (layoutMode ? (
            <div
              className="layout-box"
              style={wrapperStyle("instagramCarousel", { x: 55, y: 20, w: 41, h: 66 })}
              onPointerDown={(e) =>
                startDrag(e, getLayoutKey(page, "instagramCarousel"), "move", currentRect("instagramCarousel", { x: 55, y: 20, w: 41, h: 66 }))
              }
            >
              <div className="display-instagram-carousel layout-managed-carousel">
                <div className="display-instagram-title">INSTAGRAM @ESPAI42</div>
                <a
                  href={igPosts[igIndex].permalink || "https://instagram.com/espai42"}
                  target="_blank"
                  rel="noreferrer"
                  className="display-instagram-link"
                >
                  <div className="display-instagram-pixel-shell">
                    {(igPosts[igIndex].mediaType || "").toUpperCase() === "VIDEO" ? (
                      <video
                        src={
                          igDirectMediaById[igPosts[igIndex].id]
                            ? igPosts[igIndex].mediaUrl
                            : `/api/instagram/media?u=${encodeURIComponent(igPosts[igIndex].mediaUrl)}`
                        }
                        className="display-instagram-image"
                        autoPlay
                        muted
                        loop
                        playsInline
                        onError={() =>
                          setIgDirectMediaById((prev) => ({
                            ...prev,
                            [igPosts[igIndex].id]: true,
                          }))
                        }
                      />
                    ) : (
                      <img
                        src={
                          igDirectMediaById[igPosts[igIndex].id]
                            ? igPosts[igIndex].mediaUrl
                            : `/api/instagram/media?u=${encodeURIComponent(igPosts[igIndex].mediaUrl)}`
                        }
                        alt="Post Instagram Espai42"
                        className="display-instagram-image"
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setIgDirectMediaById((prev) => ({
                            ...prev,
                            [igPosts[igIndex].id]: true,
                          }))
                        }
                      />
                    )}
                  </div>
                </a>
                <div className="display-instagram-caption">{igPosts[igIndex].caption || "Post d'Instagram"}</div>
                <div className="display-instagram-meta">
                  ♥ {typeof igPosts[igIndex].likeCount === "number" ? igPosts[igIndex].likeCount : "n/d"} ·
                  🗨 {typeof igPosts[igIndex].commentCount === "number" ? igPosts[igIndex].commentCount : "n/d"}
                </div>
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
              <button
                type="button"
                className="layout-resize"
                onPointerDown={(e) =>
                  startDrag(
                    e,
                    getLayoutKey(page, "instagramCarousel"),
                    "resize",
                    currentRect("instagramCarousel", { x: 55, y: 20, w: 41, h: 66 }),
                  )
                }
              >
                ↘
              </button>
            </div>
          ) : (
            <>
              <div className="display-instagram-carousel" style={wrapperStyle("instagramCarousel", { x: 55, y: 20, w: 41, h: 66 })}>
                <div className="display-instagram-title">INSTAGRAM @ESPAI42</div>
                <a
                  href={igPosts[igIndex].permalink || "https://instagram.com/espai42"}
                  target="_blank"
                  rel="noreferrer"
                  className="display-instagram-link"
                >
                  <div className="display-instagram-pixel-shell">
                    {(igPosts[igIndex].mediaType || "").toUpperCase() === "VIDEO" ? (
                      <video
                        src={
                          igDirectMediaById[igPosts[igIndex].id]
                            ? igPosts[igIndex].mediaUrl
                            : `/api/instagram/media?u=${encodeURIComponent(igPosts[igIndex].mediaUrl)}`
                        }
                        className="display-instagram-image"
                        autoPlay
                        muted
                        loop
                        playsInline
                        onError={() =>
                          setIgDirectMediaById((prev) => ({
                            ...prev,
                            [igPosts[igIndex].id]: true,
                          }))
                        }
                      />
                    ) : (
                      <img
                        src={
                          igDirectMediaById[igPosts[igIndex].id]
                            ? igPosts[igIndex].mediaUrl
                            : `/api/instagram/media?u=${encodeURIComponent(igPosts[igIndex].mediaUrl)}`
                        }
                        alt="Post Instagram Espai42"
                        className="display-instagram-image"
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setIgDirectMediaById((prev) => ({
                            ...prev,
                            [igPosts[igIndex].id]: true,
                          }))
                        }
                      />
                    )}
                  </div>
                </a>
                <div className="display-instagram-caption">{igPosts[igIndex].caption || "Post d'Instagram"}</div>
                <div className="display-instagram-meta">
                  ♥ {typeof igPosts[igIndex].likeCount === "number" ? igPosts[igIndex].likeCount : "n/d"} ·
                  🗨 {typeof igPosts[igIndex].commentCount === "number" ? igPosts[igIndex].commentCount : "n/d"}
                </div>
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
            </>
          ))}
        {hasRemote && !layoutMode && <div className="display-live-pill">TELETEXT EN DIRECTE</div>}
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
