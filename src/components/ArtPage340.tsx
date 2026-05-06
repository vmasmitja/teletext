import "./ArtPage340.css";
import sosteniblePng from "../assets/art340-sostenibilitat.png";

export function ArtPage340({ className }: { className?: string }) {
  return (
    <section className={`art340-screen ${className ?? ""}`.trim()} aria-label="Pàgina 340 Sostenibilitat">
      <div className="art340-headline-wrap">
        <div className="art340-kicker">SOSTENIBILITAT / INDEX</div>
        <h1 className="art340-headline">SOSTENIBILITAT</h1>
        <div className="art340-sub">Residents circulars · reutilitzacio i impacte local</div>
      </div>

      <div className="art340-grid">
        <div className="art340-left">
          <div className="art340-block-title">PROJECTES RESIDENTS SOSTENIBLES</div>
          <p className="art340-copy">
            Iniciatives de recuperacio de materials, oficis circulars i processos de produccio responsables.
          </p>
          <div className="art340-menu">
            <div>
              <span>341</span> JOANA CLOT (VIDRE)
            </div>
            <div>
              <span>342</span> ARNAU GELABERT (FERRO)
            </div>
            <div>
              <span>343</span> TEIA ROIG (ENQUADERN.)
            </div>
          </div>
          <div className="art340-back">TORNAR A RESIDENTS: PAG 300</div>
        </div>

        <div className="art340-right">
          <img src={sosteniblePng} alt="Logo Precious Plastic" className="art340-artwork" />
        </div>
      </div>
    </section>
  );
}
