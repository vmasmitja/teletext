import "./ArtPage320.css";
import artesanaGif from "../assets/art320-artesana.gif";

export function ArtPage320({ className }: { className?: string }) {
  return (
    <section className={`art320-screen ${className ?? ""}`.trim()} aria-label="Pàgina 320 Artesania">
      <div className="art320-headline-wrap">
        <div className="art320-kicker">ARTESANIA / INDEX</div>
        <h1 className="art320-headline">ARTESANIA</h1>
        <div className="art320-sub">Residents artesans · oficis, taller i produccio local</div>
      </div>

      <div className="art320-grid">
        <div className="art320-left">
          <div className="art320-block-title">LLISTAT D'ARTESANS RESIDENTS</div>
          <p className="art320-copy">
            Projectes de ceramica, fusta i textil. Selecciona una pàgina per consultar cada taller resident.
          </p>
          <div className="art320-menu">
            <div>
              <span>321</span> LAIA PONS (CERAMICA)
            </div>
            <div>
              <span>322</span> JAN ROCA (FUSTA)
            </div>
            <div>
              <span>323</span> NUR ALCARAZ (TEXTIL)
            </div>
          </div>
          <div className="art320-back">TORNAR A RESIDENTS: PAG 300</div>
        </div>

        <div className="art320-right">
          <img src={artesanaGif} alt="Artesana treballant al taller en pixel art animat" className="art320-artwork" />
        </div>
      </div>
    </section>
  );
}
