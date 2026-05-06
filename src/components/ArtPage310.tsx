import "./ArtPage310.css";
import neoPopGif from "../assets/art310-neopop.gif";
import type { EditorSection } from "../editor/types";

export function ArtPage310({ className, section }: { className?: string; section?: EditorSection }) {
  const title = section?.title ?? "ART";
  const residents = section?.residents ?? [];
  const imagePath = section?.imagePath || neoPopGif;
  return (
    <section className={`art310-screen ${className ?? ""}`.trim()} aria-label="Pàgina 310 Art">
      <div className="art310-headline-wrap">
        <div className="art310-kicker">{title} / INDEX</div>
        <h1 className="art310-headline">{title}</h1>
        <div className="art310-sub">Residents artistes · directori creatiu ESPai42</div>
      </div>

      <div className="art310-grid">
        <div className="art310-left">
          <div className="art310-block-title">LLISTAT D'ARTISTES RESIDENTS</div>
          <p className="art310-copy">
            Projectes residents en art visual, il·lustracio i pintura. Selecciona una pàgina per veure el perfil.
          </p>
          <div className="art310-menu">
            {residents.map((r) => (
              <div key={r.id}>
                <span>{r.page}</span> {r.name.toUpperCase()}
              </div>
            ))}
          </div>
          <div className="art310-back">TORNAR A RESIDENTS: PAG 300</div>
        </div>

        <div className="art310-right">
          <img src={imagePath} alt="Collage pop art pixelat animat" className="art310-artwork" />
        </div>
      </div>
    </section>
  );
}
