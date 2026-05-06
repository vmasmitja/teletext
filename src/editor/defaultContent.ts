import { TELETEXT_PAGES } from "../content";
import type { EditorContent } from "./types";

export const DEFAULT_EDITOR_CONTENT: EditorContent = {
  updatedAt: new Date().toISOString(),
  sections: [
    {
      key: "ART",
      title: "ART",
      indexPage: 310,
      imagePath: "/src/assets/art310-neopop.gif",
      residents: [
        {
          id: "art-311",
          page: 311,
          name: "Ona Vilaro",
          subtitle: "Artista visual resident",
          bio1: "Bio: explora memòria i",
          bio2: "paisatge amb collage i tinta.",
          contact1: "Contacte: ona@espai42.art",
          contact2: "IG: @ona.vilaro.studio",
        },
        {
          id: "art-312",
          page: 312,
          name: "Biel Carranza",
          subtitle: "Il·lustrador resident",
          bio1: "Bio: personatges urbans",
          bio2: "en tinta digital i mural.",
          contact1: "Contacte: biel@espai42.art",
          contact2: "Web: bielcarranza.studio",
        },
      ],
    },
    {
      key: "ARTESANIA",
      title: "ARTESANIA",
      indexPage: 320,
      imagePath: "/src/assets/art320-artesana.png",
      residents: [
        {
          id: "artes-321",
          page: 321,
          name: "Laia Pons",
          subtitle: "Ceramista resident",
          bio1: "Bio: peces utilitàries",
          bio2: "esmaltades i cocció lenta.",
          contact1: "Contacte: laia@espai42.art",
          contact2: "IG: @laiapons.ceramica",
        },
      ],
    },
    {
      key: "MAKERS",
      title: "MAKERS",
      indexPage: 330,
      imagePath: "/src/assets/art330-makers.png",
      residents: [
        {
          id: "makers-331",
          page: 331,
          name: "Ada Prat",
          subtitle: "Electrònica resident",
          bio1: "Bio: sintetitzadors DIY i",
          bio2: "sensors per instal·lacions.",
          contact1: "Contacte: ada@espai42.art",
          contact2: "IG: @adaprat.makes",
        },
      ],
    },
    {
      key: "SOSTENIBILITAT",
      title: "SOSTENIBILITAT",
      indexPage: 340,
      imagePath: "/src/assets/art340-sostenibilitat.png",
      residents: [
        {
          id: "sost-341",
          page: 341,
          name: "Joana Clot",
          subtitle: "Vidre bufat resident",
          bio1: "Bio: llumins, gerros i",
          bio2: "escultura de vidre bufat.",
          contact1: "Contacte: joana@espai42.art",
          contact2: "IG: @joanaclot.glass",
        },
      ],
    },
  ],
  staticPages: TELETEXT_PAGES.filter((p) => ![300, 310, 311, 312, 313, 314, 320, 321, 322, 323, 330, 331, 332, 333, 340, 341, 342, 343].includes(p.num)).map(
    (p) => ({
      num: p.num,
      title: p.title,
      lines: p.lines.map((l) => l.text),
    }),
  ),
};
