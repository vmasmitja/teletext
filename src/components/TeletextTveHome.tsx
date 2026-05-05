import logoPng from "../assets/espai42-logo.png";
import "./TeletextTveHome.css";

function MenuLine({ left, page }: { left: string; page: string }) {
  return (
    <div className="tve-menu-line">
      <span className="tve-menu-label">{left}</span>
      <span className="tve-menu-dots" aria-hidden />
      <span className="tve-menu-page">{page}</span>
    </div>
  );
}

export function TeletextTveHome({ className }: { className?: string }) {
  const d = new Date();
  const mo = ["GEN", "FEB", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OCT", "NOV", "DES"][d.getMonth()];
  const status = `TXT-ESPAI42 100 ${String(d.getDate()).padStart(2, "0")}-${mo} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  return (
    <div className={`tve-home ${className ?? ""}`.trim()} aria-label="Portada teletext Espai42">
      <div className="tve-status">{status}</div>
      <div className="tve-edition">Edició interactiu (C) ESPAI42</div>

      <header className="tve-banner-blue">
        <span className="tve-banner-title">INFO ESPAI</span>
        <img src={logoPng} alt="Espai42" className="tve-banner-logo" />
      </header>

      <div className="tve-banner-yellow">
        <span className="tve-yellow-left">PROGRAMACIO ESPAI42</span>
        <span className="tve-yellow-dots" aria-hidden />
        <span className="tve-yellow-page">201</span>
      </div>

      <div className="tve-quad-grid">
        <section className="tve-quad tve-q-red" aria-label="Secció 1xx">
          <h2 className="tve-quad-head">ESPAI42 (1XX)</h2>
          <MenuLine left="Qui som" page="101" />
          <MenuLine left="Que fem" page="102" />
          <MenuLine left="Serveis" page="103" />
          <MenuLine left="Espai42" page="104" />
        </section>
        <section className="tve-quad tve-q-green" aria-label="Secció 2xx">
          <h2 className="tve-quad-head">AGENDA (2XX)</h2>
          <MenuLine left="Agenda" page="201" />
          <MenuLine left="Activitats" page="202" />
          <MenuLine left="Tallers" page="203" />
          <MenuLine left="Convocatories" page="204" />
        </section>
        <section className="tve-quad tve-q-yellow" aria-label="Secció 3xx">
          <h2 className="tve-quad-head">RESIDENTS (3XX)</h2>
          <MenuLine left="Residents" page="300" />
          <MenuLine left="Art" page="310" />
          <MenuLine left="Artesania" page="320" />
          <MenuLine left="Makers" page="330" />
          <MenuLine left="Oficis" page="340" />
        </section>
        <section className="tve-quad tve-q-cyan" aria-label="Secció 4xx">
          <h2 className="tve-quad-head">CONTACTE (4XX)</h2>
          <MenuLine left="Contacte" page="401" />
          <MenuLine left="Xarxes" page="402" />
          <MenuLine left="Partners" page="403" />
          <MenuLine left="Joc serp" page="406" />
        </section>
      </div>

      <footer className="tve-banner-footer">
        <span className="tve-foot-left">Joc de la serp</span>
        <span className="tve-foot-dots" aria-hidden />
        <span className="tve-foot-page">406</span>
      </footer>
    </div>
  );
}
