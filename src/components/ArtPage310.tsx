import "./ArtPage310.css";

const FACE_ROWS = [
  "..........yyyyyyyyyyyyy........",
  "......yyyyyyyyyyyyyyyyyyyy.....",
  "....yyyyyyyyyccccyyyyyyyyyy....",
  "...yyyyyyyccccccccccyyyyyyyy...",
  "..yyyyyycccbbbbbbbbcccyyyyyyy..",
  ".yyyyyccbbwwwwwwwwbbccyyyyyyy..",
  ".yyyyccbbwwmmmmmmwwbbccyyyyyy..",
  ".yyycbbwwmmkkkkkkmmwwbbcyyyyy..",
  ".yyycbbwwmmkcccckmmwwbbcyyyyy..",
  ".yyycbbwwmmkkkkkkmmwwbbcyyyyy..",
  ".yyyyccbbwwmmmmmmwwbbccyyyyyy..",
  ".yyyyyccbbwwwwwwwwbbccyyyyyyy..",
  "..yyyyyycccbbbbbbbbcccyyyyyyy..",
  "...yyyyyyyccccccccccyyyyyyyy...",
  "....yyyyyyyyyccccyyyyyyyyyy....",
  "......yyyyyyyyyyyyyyyyyyyy.....",
  "..........yyyyyyyyyyyyy........",
];

function PixelFace() {
  return (
    <div className="art310-pixelface" aria-hidden>
      {FACE_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="art310-pixelrow">
          {row.split("").map((px, colIndex) => (
            <span key={`${rowIndex}-${colIndex}`} className={`art310-px art310-px-${px}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

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
          <PixelFace />
          <div className="art310-caption">PIXEL HOMENATGE: NIT ESTELADA</div>
        </div>
      </div>
    </section>
  );
}
