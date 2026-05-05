import { useEffect, useMemo } from "react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { DEFAULT_SESSION } from "../config";
import logoPng from "../assets/espai42-logo.png";
import { SnakeGame } from "../components/SnakeGame";
import { TeletextScreen } from "../components/TeletextScreen";
import { useTeletextWs } from "../hooks/useTeletextWs";
import "./DisplayPage.css";

export function DisplayPage() {
  const [params] = useSearchParams();
  const room = params.get("r") ?? DEFAULT_SESSION;
  const [remoteBaseUrl, setRemoteBaseUrl] = useState<string | null>(null);

  const { page, hasRemote, lastControl, setRemotePage } = useTeletextWs(room, "display");

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
        <TeletextScreen pageNum={page} className="display-screen" />
        {page === 106 && <SnakeGame control={lastControl} active={hasRemote} />}
        {!hasRemote && (
          <div className="display-waiting">
            <p className="display-waiting-title">ESCANEJA I CONTROLA</p>
            <div className="display-qr">
              <QRCodeSVG value={remoteUrl} size={210} level="M" fgColor="#111" bgColor="#fff" />
            </div>
            <p className="display-waiting-text">Obre el comandament al mòbil</p>
            <p className="display-waiting-sub">Sessió {room}</p>
          </div>
        )}
        {hasRemote && <div className="display-live-pill">TELETEXT EN DIRECTE</div>}
        <div className="display-url">{remoteUrl}</div>
      </div>
    </div>
  );
}
