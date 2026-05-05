import { getTeletextPage, type TeletextColor, type TeletextLine } from "../content";
import "./TeletextScreen.css";

const COLORS: Record<string, string> = {
  y: "#ffff00",
  w: "#ffffff",
  c: "#00ffff",
  g: "#00ff00",
  m: "#ff00ff",
  r: "#ff0000",
};

const BG_COLORS: Record<TeletextColor, string> = {
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
  lineOverrides?: TeletextLine[];
  titleOverride?: string;
};

function padLine(text: string, width: number): string {
  const t = text.replace(/\s+$/g, "");
  if (t.length >= width) return t.slice(0, width);
  return t + " ".repeat(width - t.length);
}

export function TeletextScreen({
  pageNum,
  showHeader = true,
  className,
  lineOverrides,
  titleOverride,
}: Props) {
  const def = getTeletextPage(pageNum);
  const lines = lineOverrides ?? def?.lines ?? [];
  const title = titleOverride ?? def?.title ?? "???";
  const headerLeft = pageNum === 100 ? "INFO ESPAI" : `Pàg ${String(pageNum).padStart(3, "0")}`;
  const headerRight = pageNum === 100 ? "ESPAI42" : title;

  return (
    <div className={`tt-screen ${className ?? ""}`.trim()}>
      {showHeader && (
        <div className="tt-header">
          <span className="tt-header-pno">{headerLeft}</span>
          <span className="tt-header-title">{headerRight}</span>
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
            <span
              style={{
                color: COLORS[line.color ?? "w"] ?? COLORS.w,
                backgroundColor: line.bg ? BG_COLORS[line.bg] : "transparent",
              }}
              className={line.bg ? "tt-cell-bg" : undefined}
            >
              {padLine(line.text, 40)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
