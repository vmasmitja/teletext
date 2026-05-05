import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DEFAULT_SESSION } from "../config";
import { KNOWN_PAGE_NUMS } from "../content";
import { useTeletextWs } from "../hooks/useTeletextWs";
import "./RemotePage.css";

export function RemotePage() {
  const [params] = useSearchParams();
  const room = params.get("r") ?? DEFAULT_SESSION;
  const { page, setRemotePage } = useTeletextWs(room, "remote");

  const [buffer, setBuffer] = useState("");

  const pushDigit = useCallback((d: string) => {
    setBuffer((b) => (b.length >= 3 ? d : b + d));
  }, []);

  const clearBuffer = useCallback(() => setBuffer(""), []);

  const go = useCallback(() => {
    if (buffer.length !== 3) return;
    const n = Number(buffer);
    if (n >= 100 && n <= 899) {
      setRemotePage(n);
      setBuffer("");
    }
  }, [buffer, setRemotePage]);

  const prevNext = useCallback(
    (dir: -1 | 1) => {
      const nums = KNOWN_PAGE_NUMS;
      const idx = nums.indexOf(page);
      const nextIdx =
        idx < 0 ? 0 : (idx + dir + nums.length) % nums.length;
      setRemotePage(nums[nextIdx]);
    },
    [page, setRemotePage],
  );

  return (
    <div className="remote-layout">
      <div className="remote-buffer" aria-live="polite">
        {[0, 1, 2].map((i) => (
          <span key={i} className="remote-buffer-digit">
            {buffer[i] ?? "_"}
          </span>
        ))}
      </div>
      <div className="remote-pad">
        <div className="remote-nav">
          <button type="button" className="remote-btn nav" onClick={() => prevNext(-1)}>
            ◀ Anterior
          </button>
          <button type="button" className="remote-btn nav" onClick={() => prevNext(1)}>
            Següent ▶
          </button>
        </div>
        <div className="remote-digits">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              type="button"
              className="remote-btn digit"
              onClick={() => pushDigit(d)}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="remote-row0">
          <button type="button" className="remote-btn wide" onClick={clearBuffer}>
            Esborrar
          </button>
          <button type="button" className="remote-btn digit" onClick={() => pushDigit("0")}>
            0
          </button>
          <button type="button" className="remote-btn wide primary" onClick={go}>
            Anar
          </button>
        </div>
      </div>
      <p className="remote-mini">Sessió: {room} · Pàgina: {String(page).padStart(3, "0")}</p>
    </div>
  );
}
