import { getTeletextPage } from "../content";
import "./TeletextScreen.css";

const COLORS: Record<string, string> = {
  y: "#ffff00",
  w: "#ffffff",
  c: "#00ffff",
  g: "#00ff00",
  m: "#ff00ff",
  r: "#ff0000",
};

type Props = {
  pageNum: number;
  showHeader?: boolean;
  className?: string;
};

function padLine(text: string, width: number): string {
  const t = text.replace(/\s+$/g, "");
  if (t.length >= width) return t.slice(0, width);
  return t + " ".repeat(width - t.length);
}

export function TeletextScreen({ pageNum, showHeader = true, className }: Props) {
  const def = getTeletextPage(pageNum);
  const lines = def?.lines ?? [];
  const title = def?.title ?? "???";

  return (
    <div className={`tt-screen ${className ?? ""}`.trim()}>
      {showHeader && (
        <div className="tt-header">
          <span className="tt-header-pno">
            Pàg {String(pageNum).padStart(3, "0")}
          </span>
          <span className="tt-header-title">{title}</span>
        </div>
      )}
      <div className="tt-body" aria-live="polite">
        {!def && (
          <div className="tt-row">
            <span style={{ color: COLORS.r }}>
              {padLine("  Pàgina no disponible", 40)}
            </span>
          </div>
        )}
        {lines.map((line, i) => (
          <div key={i} className="tt-row">
            <span style={{ color: COLORS[line.color ?? "w"] ?? COLORS.w }}>
              {padLine(line.text, 40)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
