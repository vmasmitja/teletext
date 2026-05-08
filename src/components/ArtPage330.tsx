import type { CSSProperties } from "react";
import "./ArtPage330.css";
import makersPng from "../assets/art330-makers.png";
import type { EditorSection } from "../editor/types";

export function ArtPage330({
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
  const title = section?.title ?? "MAKERS";
  const residents = section?.residents ?? [];
  const imagePath = section?.imagePath || makersPng;
  return (
    <section className={`art330-screen ${className ?? ""}`.trim()} aria-label="Pàgina 330 Makers">
      <div className="art330-headline-wrap" style={headerStyle}>
        <div className="art330-kicker">{title} / INDEX</div>
        <h1 className="art330-headline">{title}</h1>
        <div className="art330-sub">Residents tecnics · prototips, eines i laboratori creatiu</div>
      </div>

      <div className="art330-grid">
        <div className="art330-left" style={leftStyle}>
          <div className="art330-block-title">LLISTAT DE MAKERS RESIDENTS</div>
          <p className="art330-copy">
            Electrònica, impressio 3D i robòtica aplicada. Tria una pàgina per veure el perfil de cada maker.
          </p>
          <div className="art330-menu">
            {residents.map((r) => (
              <div key={r.id}>
                <span>{r.page}</span> {r.name.toUpperCase()}
              </div>
            ))}
          </div>
          <div className="art330-back">TORNAR A RESIDENTS: PAG 300</div>
        </div>

        <div className="art330-right" style={rightStyle}>
          <img src={imagePath} alt="Taller makers pixelat animat" className="art330-artwork" />
        </div>
      </div>
    </section>
  );
}
