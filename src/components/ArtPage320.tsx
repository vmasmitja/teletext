import type { CSSProperties } from "react";
import "./ArtPage320.css";
import artesanaPng from "../assets/art320-artesana.png";
import type { EditorSection } from "../editor/types";

export function ArtPage320({
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
  const title = section?.title ?? "ARTESANIA";
  const residents = section?.residents ?? [];
  const imagePath = section?.imagePath || artesanaPng;
  return (
    <section className={`art320-screen ${className ?? ""}`.trim()} aria-label="Pàgina 320 Artesania">
      <div className="art320-headline-wrap" style={headerStyle}>
        <div className="art320-kicker">{title} / INDEX</div>
        <h1 className="art320-headline">{title}</h1>
        <div className="art320-sub">Residents artesans · oficis, taller i produccio local</div>
      </div>

      <div className="art320-grid">
        <div className="art320-left" style={leftStyle}>
          <div className="art320-block-title">LLISTAT D'ARTESANS RESIDENTS</div>
          <p className="art320-copy">
            Projectes de ceramica, fusta i textil. Selecciona una pàgina per consultar cada taller resident.
          </p>
          <div className="art320-menu">
            {residents.map((r) => (
              <div key={r.id}>
                <span>{r.page}</span> {r.name.toUpperCase()}
              </div>
            ))}
          </div>
          <div className="art320-back">TORNAR A RESIDENTS: PAG 300</div>
        </div>

        <div className="art320-right" style={rightStyle}>
          <img src={imagePath} alt="Artesana treballant al taller en pixel art" className="art320-artwork" />
        </div>
      </div>
    </section>
  );
}
