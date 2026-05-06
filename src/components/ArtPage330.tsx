import "./ArtPage330.css";
import makersPng from "../assets/art330-makers.png";

export function ArtPage330({ className }: { className?: string }) {
  return (
    <section className={`art330-screen ${className ?? ""}`.trim()} aria-label="Pàgina 330 Makers">
      <div className="art330-headline-wrap">
        <div className="art330-kicker">MAKERS / INDEX</div>
        <h1 className="art330-headline">MAKERS</h1>
        <div className="art330-sub">Residents tecnics · prototips, eines i laboratori creatiu</div>
      </div>

      <div className="art330-grid">
        <div className="art330-left">
          <div className="art330-block-title">LLISTAT DE MAKERS RESIDENTS</div>
          <p className="art330-copy">
            Electrònica, impressio 3D i robòtica aplicada. Tria una pàgina per veure el perfil de cada maker.
          </p>
          <div className="art330-menu">
            <div>
              <span>331</span> ADA PRAT (ELECTRONICA)
            </div>
            <div>
              <span>332</span> POL SERRA (IMPRESSIO 3D)
            </div>
            <div>
              <span>333</span> IRIS VALLS (ROBOTS)
            </div>
          </div>
          <div className="art330-back">TORNAR A RESIDENTS: PAG 300</div>
        </div>

        <div className="art330-right">
          <img src={makersPng} alt="Taller makers pixelat animat" className="art330-artwork" />
        </div>
      </div>
    </section>
  );
}
