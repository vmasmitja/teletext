export type TeletextLine = { text: string; color?: TeletextColor };
export type TeletextColor = "y" | "w" | "c" | "g" | "m" | "r";

export type TeletextPageDef = {
  num: number;
  title: string;
  lines: TeletextLine[];
};

/** Pàgines 100–899. Edita aquí el text d’Espai42 (màx. 40 caràcters per línia al cos). */
export const TELETEXT_PAGES: TeletextPageDef[] = [
  {
    num: 100,
    title: "ESPai42",
    lines: [
      { text: "                              ", color: "w" },
      { text: "  ESPai42                      ", color: "y" },
      { text: "  Coworking creatiu            ", color: "y" },
      { text: "                              ", color: "w" },
      { text: "  Artesania, art i oficis      ", color: "w" },
      { text: "  amb espai per a tallers.     ", color: "w" },
      { text: "                              ", color: "w" },
      { text: "  Index de pàgines:            ", color: "c" },
      { text: "                              ", color: "w" },
      { text: "  101  Qui som                 ", color: "y" },
      { text: "  102  Serveis                 ", color: "y" },
      { text: "  103  Agenda                  ", color: "y" },
      { text: "  104  Projectes residents     ", color: "y" },
      { text: "  105  Contacte                ", color: "y" },
      { text: "                              ", color: "w" },
      { text: "  Teclegeu el número al        ", color: "c" },
      { text: "  comandament del mòbil.       ", color: "c" },
      { text: "                              ", color: "w" },
      { text: "  Pàg 100       ESPai42        ", color: "g" },
    ],
  },
  {
    num: 101,
    title: "QUI SOM",
    lines: [
      { text: "                              ", color: "w" },
      { text: "  QUI SOM                      ", color: "y" },
      { text: "                              ", color: "w" },
      { text: "  Espai42 és una associació    ", color: "w" },
      { text: "  sense ànim de lucre que      ", color: "w" },
      { text: "  acull oficis creatius i      ", color: "w" },
      { text: "  tallers d’artesania i art.   ", color: "w" },
      { text: "                              ", color: "w" },
      { text: "  Volem un espai obert on      ", color: "c" },
      { text: "  compartir eines, idees i     ", color: "c" },
      { text: "  projectes amb el barri.      ", color: "c" },
      { text: "                              ", color: "w" },
      { text: "  Tornada a l’index: pàg 100   ", color: "m" },
      { text: "                              ", color: "w" },
      { text: "  Pàg 101       ESPai42        ", color: "g" },
    ],
  },
  {
    num: 102,
    title: "SERVEIS",
    lines: [
      { text: "                              ", color: "w" },
      { text: "  SERVEIS                      ", color: "y" },
      { text: "                              ", color: "w" },
      { text: "  * Espai de coworking         ", color: "w" },
      { text: "  * Aules i taules de treball  ", color: "w" },
      { text: "  * Tallers equipats           ", color: "w" },
      { text: "  * Embarcadors i magatzem     ", color: "w" },
      { text: "                              ", color: "w" },
      { text: "  * Activitats i formacions     ", color: "c" },
      { text: "  * Exposicions i mostres      ", color: "c" },
      { text: "                              ", color: "w" },
      { text: "  Consulteu la pàg 105 per     ", color: "m" },
      { text: "  contacte i visites.          ", color: "m" },
      { text: "                              ", color: "w" },
      { text: "  Pàg 102       ESPai42        ", color: "g" },
    ],
  },
  {
    num: 103,
    title: "AGENDA",
    lines: [
      { text: "                              ", color: "w" },
      { text: "  AGENDA (exemple)             ", color: "y" },
      { text: "                              ", color: "w" },
      { text: "  DL  10:00  Cafè creatiu      ", color: "w" },
      { text: "  DC  18:00  Taller obert      ", color: "w" },
      { text: "  DV  19:00  Portes obertes    ", color: "w" },
      { text: "                              ", color: "w" },
      { text: "  Calendari a la web i a les  ", color: "c" },
      { text: "  xarxes (dates orientatives). ", color: "c" },
      { text: "                              ", color: "w" },
      { text: "  Voleu proposar una activitat?", color: "m" },
      { text: "  Escriviu-nos (pàg 105).      ", color: "m" },
      { text: "                              ", color: "w" },
      { text: "  Pàg 103       ESPai42        ", color: "g" },
    ],
  },
  {
    num: 104,
    title: "PROJECTES",
    lines: [
      { text: "                              ", color: "w" },
      { text: "  PROJECTES RESIDENTS          ", color: "y" },
      { text: "                              ", color: "w" },
      { text: "  Residents amb bancada fixa   ", color: "w" },
      { text: "  o rotativa segons conveni.  ", color: "w" },
      { text: "                              ", color: "w" },
      { text: "  Ceràmica / tèxtil / fusta    ", color: "c" },
      { text: "  Il·lustració / fotografia    ", color: "c" },
      { text: "  I altres oficis creatius.   ", color: "c" },
      { text: "                              ", color: "w" },
      { text: "  Informeu-vos de places       ", color: "m" },
      { text: "  i condicions al correu.      ", color: "m" },
      { text: "                              ", color: "w" },
      { text: "  Pàg 104       ESPai42        ", color: "g" },
    ],
  },
  {
    num: 105,
    title: "CONTACTE",
    lines: [
      { text: "                              ", color: "w" },
      { text: "  CONTACTE                     ", color: "y" },
      { text: "                              ", color: "w" },
      { text: "  Correu: info@espai42.cat     ", color: "w" },
      { text: "  Web:    www.espai42.cat      ", color: "w" },
      { text: "                              ", color: "w" },
      { text: "  Horari secretaria (exemple): ", color: "c" },
      { text: "  DM i DJ  17:00 - 20:00       ", color: "c" },
      { text: "                              ", color: "w" },
      { text: "  Escanegeu el QR de la TV     ", color: "m" },
      { text: "  per pilotar el teletext.     ", color: "m" },
      { text: "                              ", color: "w" },
      { text: "  Pàg 105       ESPai42        ", color: "g" },
    ],
  },
];

const pageMap = new Map(TELETEXT_PAGES.map((p) => [p.num, p]));

export function getTeletextPage(num: number): TeletextPageDef | undefined {
  return pageMap.get(num);
}

export const KNOWN_PAGE_NUMS = TELETEXT_PAGES.map((p) => p.num).sort((a, b) => a - b);
