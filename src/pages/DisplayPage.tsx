import { useEffect, useMemo } from "react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { DEFAULT_SESSION } from "../config";
import type { TeletextLine } from "../content";
import logoPng from "../assets/espai42-logo.png";
import { SnakeGame } from "../components/SnakeGame";
import { TeletextScreen } from "../components/TeletextScreen";
import { useTeletextWs } from "../hooks/useTeletextWs";
import "./DisplayPage.css";

export function DisplayPage() {
  const [params] = useSearchParams();
  const room = params.get("r") ?? DEFAULT_SESSION;
  const [remoteBaseUrl, setRemoteBaseUrl] = useState<string | null>(null);

  const { page, hasRemote, lastControl, startTick, highScore, highName, sendSnakeResult, setRemotePage } =
    useTeletextWs(room, "display");

  useEffect(() => {
    if (hasRemote) setRemotePage(100);
  }, [hasRemote, setRemotePage]);

  useEffect(() => {
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
    if (page !== 106) return undefined;
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
      { text: "  Pàg 106       ESPai42       ", color: "g" },
    ];
  }, [page, highName, highScore]);

  return (
    <div className="display-layout">
      <div className="display-crt">
        <div className="crt-overlay" aria-hidden />
        <div className="teletext-accent teletext-accent-a" aria-hidden />
        <div className="teletext-accent teletext-accent-b" aria-hidden />
        <img
          src={logoPng}
          alt="Logo Espai42"
          className={`display-logo ${hasRemote ? "side" : "hero"}`}
        />
        <TeletextScreen pageNum={page} className="display-screen" lineOverrides={snakeInfoLines} />
        {page === 106 && (
          <SnakeGame
            control={lastControl}
            startTick={startTick}
            active={hasRemote}
            onGameOver={(score) => sendSnakeResult(score)}
          />
        )}
        <div className={`display-waiting ${hasRemote ? "hidden" : ""}`}>
          {!hasRemote && (
            <>
              <p className="display-waiting-title">ESCANEJA I CONTROLA</p>
              {page === 105 ? (
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
        {page === 105 && (
          <div className="display-contact-qr">
            <div className="display-qr">
              <QRCodeSVG value={websiteUrl} size={150} level="M" fgColor="#111" bgColor="#fff" />
            </div>
            <div className="display-contact-caption">WEB NORMAL: ESPAI42.ORG</div>
          </div>
        )}
        {hasRemote && <div className="display-live-pill">TELETEXT EN DIRECTE</div>}
        <div className="display-url">{remoteUrl}</div>
      </div>
    </div>
  );
}
