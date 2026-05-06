import "./ArtPage310.css";
import neoPopGif from "../assets/art310-neopop.gif";

export function ArtPage310({ className }: { className?: string }) {
  return (
    <section className={`art310-screen ${className ?? ""}`.trim()} aria-label="Pàgina 310 Art">
      <div className="art310-headline-wrap">
        <div className="art310-kicker">ART / INDEX</div>
        <h1 className="art310-headline">ART</h1>
        <div className="art310-sub">Residents artistes · directori creatiu ESPai42</div>
      </div>

      <div className="art310-grid">
        <div className="art310-left">
          <div className="art310-block-title">LLISTAT D'ARTISTES RESIDENTS</div>
          <p className="art310-copy">
            Projectes residents en art visual, il·lustracio i pintura. Selecciona una pàgina per veure el perfil.
          </p>
          <div className="art310-menu">
            <div>
              <span>311</span> ONA VILARO
            </div>
            <div>
              <span>312</span> BIEL CARRANZA
            </div>
            <div>
              <span>313</span> RITA SOLANS
            </div>
            <div>
              <span>314</span> MARC ELIES
            </div>
          </div>
          <div className="art310-back">TORNAR A RESIDENTS: PAG 300</div>
        </div>

        <div className="art310-right">
          <img src={neoPopGif} alt="Collage pop art pixelat animat" className="art310-artwork" />
        </div>
      </div>
    </section>
  );
}
