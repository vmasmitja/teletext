import type { CSSProperties } from "react";
import "./ArtPage340.css";
import sosteniblePng from "../assets/art340-sostenibilitat.png";
import type { EditorSection } from "../editor/types";

export function ArtPage340({
  className,
  section,
  headerStyle,
  leftStyle,
  rightStyle,
}: {
  className?: string;
  section?: EditorSection;
  headerStyle?: CSSProperties;
  leftStyle?: CSSProperties;
  rightStyle?: CSSProperties;
}) {
  const title = section?.title ?? "SOSTENIBILITAT";
  const residents = section?.residents ?? [];
  const imagePath = section?.imagePath || sosteniblePng;
  return (
    <section className={`art340-screen ${className ?? ""}`.trim()} aria-label="Pàgina 340 Sostenibilitat">
      <div className="art340-headline-wrap" style={headerStyle}>
        <div className="art340-kicker">{title} / INDEX</div>
        <h1 className="art340-headline">{title}</h1>
        <div className="art340-sub">Residents circulars · reutilitzacio i impacte local</div>
      </div>

      <div className="art340-grid">
        <div className="art340-left" style={leftStyle}>
          <div className="art340-block-title">PROJECTES RESIDENTS SOSTENIBLES</div>
          <p className="art340-copy">
            Iniciatives de recuperacio de materials, oficis circulars i processos de produccio responsables.
          </p>
          <div className="art340-menu">
            {residents.map((r) => (
              <div key={r.id}>
                <span>{r.page}</span> {r.name.toUpperCase()}
              </div>
            ))}
          </div>
          <div className="art340-back">TORNAR A RESIDENTS: PAG 300</div>
        </div>

        <div className="art340-right" style={rightStyle}>
          <img src={imagePath} alt="Logo sostenibilitat" className="art340-artwork" />
        </div>
      </div>
    </section>
  );
}
