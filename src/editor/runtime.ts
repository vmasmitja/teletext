import { TELETEXT_PAGES, type TeletextPageDef } from "../content";
import type { EditorContent, EditorSection } from "./types";

const MANAGED_PAGES = new Set<number>([
  300, 310, 311, 312, 313, 314, 320, 321, 322, 323, 330, 331, 332, 333, 340, 341, 342, 343,
]);

const SECTION_FOOTER_LABEL = "ESPai42";
const TT_WIDTH = 40;
const CONTENT_WIDTH = 38;

function blank(): string {
  return " ".repeat(TT_WIDTH);
}

function row(text: string, color: "y" | "w" | "c" | "g" | "m" | "r"): TeletextPageDef["lines"][number] {
  return { text: fitLine(text), color };
}

function fitLine(text: string): string {
  const t = String(text || "");
  if (t.length >= TT_WIDTH) return t.slice(0, TT_WIDTH);
  return t.padEnd(TT_WIDTH, " ");
}

function prefixed(text: string): string {
  return fitLine(`  ${text}`);
}

function wrapText(text: string, maxLen = CONTENT_WIDTH, maxLines = 3): string[] {
  const input = String(text || "").trim();
  if (!input) return [];
  const words = input.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLen) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === 0) return [input.slice(0, maxLen)];
  return lines.map((l) => l.slice(0, maxLen));
}

function mkIndexPage(section: EditorSection): TeletextPageDef {
  const lines: TeletextPageDef["lines"] = [
    row(blank(), "w"),
    row(prefixed(`${section.title} / INDEX`), "y"),
    row(blank(), "w"),
    row(prefixed("Residents i projectes"), "m"),
    row(blank(), "w"),
  ];
  section.residents.slice(0, 8).forEach((r) => {
    lines.push(row(prefixed(`${String(r.page).padStart(3, "0")}  ${r.name}`), "c"));
  });
  while (lines.length < 12) lines.push(row(blank(), "w"));
  lines.push(row(prefixed("Tornar a residents: pàg 300"), "w"));
  lines.push(row(blank(), "w"));
  lines.push(row(prefixed(`Pàg ${section.indexPage}       ${SECTION_FOOTER_LABEL}`), "g"));
  return { num: section.indexPage, title: section.title, lines };
}

function mkResidentPage(section: EditorSection, resident: EditorSection["residents"][number]): TeletextPageDef {
  const bioLines = wrapText([resident.bio1, resident.bio2].filter(Boolean).join(" "), CONTENT_WIDTH, 3);
  const contactRaw = [resident.contact1, resident.contact2, resident.webpage ? `Web: ${resident.webpage}` : ""].filter(Boolean);
  const contactLines = contactRaw.flatMap((line) => wrapText(line, CONTENT_WIDTH, 2)).slice(0, 4);
  return {
    num: resident.page,
    title: `${section.title} ${resident.page}`,
    lines: [
      row(blank(), "w"),
      row(prefixed(resident.name.toUpperCase()), "y"),
      row(prefixed(resident.subtitle), "w"),
      row(blank(), "w"),
      ...bioLines.map((line) => row(prefixed(line), "c")),
      row(blank(), "w"),
      ...contactLines.map((line) => row(prefixed(line), "m")),
      row(blank(), "w"),
      row(prefixed(`Tornar ${section.title.toLowerCase()}: pàg ${section.indexPage}`), "w"),
      row(blank(), "w"),
      row(prefixed(`Pàg ${resident.page}       ${SECTION_FOOTER_LABEL}`), "g"),
    ],
  };
}

function mkResidentsIndex(content: EditorContent): TeletextPageDef {
  const sectionRows = content.sections
    .sort((a, b) => a.indexPage - b.indexPage)
    .map((s) => prefixed(`${s.indexPage}  ${s.title}`));
  while (sectionRows.length < 4) sectionRows.push(blank());
  return {
    num: 300,
    title: "RESIDENTS",
    lines: [
      row(blank(), "w"),
      row(prefixed("PROJECTES RESIDENTS"), "y"),
      row(blank(), "w"),
      row(prefixed("Índex projectes residents"), "w"),
      row(blank(), "w"),
      row(sectionRows[0], "c"),
      row(sectionRows[1], "c"),
      row(sectionRows[2], "c"),
      row(sectionRows[3], "c"),
      row(blank(), "w"),
      row(prefixed("Usa el comandament per"), "m"),
      row(prefixed("entrar a cada categoria."), "m"),
      row(blank(), "w"),
      row(prefixed("Pàg 300       ESPai42"), "g"),
    ],
  };
}

function mkHomeUpdate(base: TeletextPageDef, content: EditorContent): TeletextPageDef {
  const byPage = [...content.sections].sort((a, b) => a.indexPage - b.indexPage);
  const names = byPage.map((s) => `${s.indexPage} ${s.title}`).join(" ");
  const l1 = fitLine(` ${names}`);
  const lines = [...base.lines];
  if (lines.length > 29) {
    lines[27] = { text: l1, color: "r", bg: "y" };
    lines[28] = { text: blank(), color: "r", bg: "y" };
  }
  return { ...base, lines };
}

export function buildRuntimeContent(content: EditorContent) {
  const pages = TELETEXT_PAGES.filter((p) => !MANAGED_PAGES.has(p.num)).map((p) => ({ ...p, lines: [...p.lines] }));
  const staticOverrides = new Map((content.staticPages ?? []).map((p) => [p.num, p]));
  for (let i = 0; i < pages.length; i += 1) {
    const p = pages[i];
    const ov = staticOverrides.get(p.num);
    if (!ov) continue;
    const lines = p.lines.map((line, idx) => ({ ...line, text: ov.lines[idx] ?? line.text }));
    pages[i] = { ...p, title: ov.title || p.title, lines };
  }
  const home = pages.find((p) => p.num === 100);
  if (home) {
    const idx = pages.findIndex((p) => p.num === 100);
    pages[idx] = mkHomeUpdate(home, content);
  }
  const managed: TeletextPageDef[] = [mkResidentsIndex(content)];
  content.sections.forEach((s) => {
    managed.push(mkIndexPage(s));
    s.residents.forEach((r) => managed.push(mkResidentPage(s, r)));
  });
  const merged = [...pages, ...managed].sort((a, b) => a.num - b.num);
  const map = new Map<number, TeletextPageDef>(merged.map((p) => [p.num, p]));
  const knownPageNums = merged.map((p) => p.num);
  return { map, knownPageNums };
}
