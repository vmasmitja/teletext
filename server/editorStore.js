import fs from "fs";
import path from "path";

const ADMIN_USER = "admin";
const ADMIN_PASSWORD = "Friskitos2025!";
const VALID_SECTION_KEYS = ["ART", "ARTESANIA", "MAKERS", "SOSTENIBILITAT"];
const RESERVED_PAGES = new Set([
  100, 101, 102, 103, 104, 201, 202, 203, 204, 401, 402, 403, 501,
]);

export const DEFAULT_EDITOR_CONTENT = {
  updatedAt: new Date().toISOString(),
  sections: [
    {
      key: "ART",
      title: "ART",
      indexPage: 310,
      imagePath: "",
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
      ],
    },
    {
      key: "ARTESANIA",
      title: "ARTESANIA",
      indexPage: 320,
      imagePath: "",
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
      imagePath: "",
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
      imagePath: "",
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
  staticPages: [
    { num: 100, title: "INFO ESPAI42", lines: [] },
    { num: 101, title: "QUI SOM", lines: [] },
    { num: 102, title: "QUE FEM", lines: [] },
    { num: 103, title: "SERVEIS", lines: [] },
    { num: 104, title: "ESPAI42", lines: [] },
    { num: 201, title: "AGENDA", lines: [] },
    { num: 202, title: "ACTIVITATS", lines: [] },
    { num: 203, title: "TALLERS", lines: [] },
    { num: 204, title: "CONVOCATORIES", lines: [] },
    { num: 401, title: "CONTACTE", lines: [] },
    { num: 402, title: "XARXES", lines: [] },
    { num: 403, title: "PARTNERS", lines: [] }
  ],
};

export function createEditorStore(rootDir) {
  const dataDir = path.join(rootDir, "server", "data");
  const assetsDir = path.join(dataDir, "assets");
  const filePath = path.join(dataDir, "teletext-content.json");
  fs.mkdirSync(assetsDir, { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(DEFAULT_EDITOR_CONTENT, null, 2), "utf8");
  }

  function read() {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return parsed?.sections ? parsed : DEFAULT_EDITOR_CONTENT;
    } catch {
      return DEFAULT_EDITOR_CONTENT;
    }
  }

  function validate(content) {
    if (!content || !Array.isArray(content.sections)) return "Format invàlid";
    const pages = new Set();
    const staticPages = Array.isArray(content.staticPages) ? content.staticPages : [];
    for (const page of staticPages) {
      if (!Number.isInteger(page.num) || page.num < 100 || page.num > 899) return `Pàgina fixa invàlida: ${page.num}`;
      if (pages.has(page.num)) return `Pàgina duplicada: ${page.num}`;
      pages.add(page.num);
      if (!Array.isArray(page.lines)) return `Línies invàlides a pàgina ${page.num}`;
    }
    for (const section of content.sections) {
      if (!VALID_SECTION_KEYS.includes(section.key)) return `Secció invàlida: ${section.key}`;
      if (!section.title || !section.title.trim()) return "Títol de secció buit";
      if (!Number.isInteger(section.indexPage) || section.indexPage < 100 || section.indexPage > 899) {
        return `Pàgina índex invàlida: ${section.indexPage}`;
      }
      if (RESERVED_PAGES.has(section.indexPage)) return `Pàgina reservada: ${section.indexPage}`;
      if (pages.has(section.indexPage)) return `Pàgina duplicada: ${section.indexPage}`;
      pages.add(section.indexPage);
      if (!Array.isArray(section.residents)) return `Residents invàlids a ${section.title}`;
      for (const resident of section.residents) {
        if (!Number.isInteger(resident.page) || resident.page < 100 || resident.page > 899) {
          return `Pàgina resident invàlida: ${resident.page}`;
        }
        if (RESERVED_PAGES.has(resident.page)) return `Pàgina reservada: ${resident.page}`;
        if (pages.has(resident.page)) return `Pàgina duplicada: ${resident.page}`;
        pages.add(resident.page);
        if (!resident.name || !resident.name.trim()) return "Nom de resident buit";
      }
    }
    return null;
  }

  function write(content) {
    const err = validate(content);
    if (err) return { ok: false, error: err };
    const toSave = { ...content, updatedAt: new Date().toISOString() };
    fs.writeFileSync(filePath, JSON.stringify(toSave, null, 2), "utf8");
    return { ok: true, content: toSave };
  }

  return {
    read,
    write,
    assetsDir,
    authenticate(username, password) {
      return username === ADMIN_USER && password === ADMIN_PASSWORD;
    },
  };
}
