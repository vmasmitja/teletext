import "./ArtPage310.css";

const FACE_ROWS = [
  "..........rrrrrrrr.............",
  ".......rrrmmmmmmrrr............",
  ".....rrmmwwwwwwwwmmrr..........",
  "....rmmwwwwwwwwwwwwmmr.........",
  "...rmmwwwkkkkkkwwwwwmmr........",
  "...rmwwwkkwwwwkkwwwwwmr........",
  "..rmwwwkwwkkkkwwkwwwwwmr.......",
  "..rmwwwkwwkcckwwkwwwwwmr.......",
  "..rmwwwkwwkkkkwwkwwwwwmr.......",
  "..rmwwwkkwwwwwwkkwwwwwmr.......",
  "..rmmwwwwkkkkkkwwwwwmmr........",
  "...rmmwwwwwwwwwwwwwmmr.........",
  "....rmmwwwwkkkkwwwmmr..........",
  ".....rrmmwwkkkkwmmrr...........",
  ".......rrmmwwwwmmrr............",
  ".........rrmmmmrr..............",
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
        <h1 className="art310-headline">TITO ART · EL CRIT</h1>
        <div className="art310-sub">Edicio especial pixel - inspiracio retro teletext</div>
      </div>

      <div className="art310-grid">
        <div className="art310-left">
          <div className="art310-block-title">EXPOSICIO EN DIRECTE</div>
          <p className="art310-copy">
            Una versio creativa de "El Crit" en llenguatge teletext: color pla, trama CRT i composicio pop.
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
          <div className="art310-caption">THE SCREAM / TELEPIXEL STUDY</div>
        </div>
      </div>
    </section>
  );
}
