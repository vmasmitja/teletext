import { TELETEXT_PAGES, type TeletextPageDef } from "../content";
import type { EditorContent, EditorSection } from "./types";

const MANAGED_PAGES = new Set<number>([
  300, 310, 311, 312, 313, 314, 320, 321, 322, 323, 330, 331, 332, 333, 340, 341, 342, 343,
]);

const SECTION_FOOTER_LABEL = "ESPai42";

function blank(): string {
  return "                              ";
}

function row(text: string, color: "y" | "w" | "c" | "g" | "m" | "r"): TeletextPageDef["lines"][number] {
  return { text, color };
}

function mkIndexPage(section: EditorSection): TeletextPageDef {
  const lines: TeletextPageDef["lines"] = [
    row(blank(), "w"),
    row(`  ${section.title} / INDEX`.padEnd(30, " "), "y"),
    row(blank(), "w"),
    row("  Residents i projectes".padEnd(30, " "), "m"),
    row(blank(), "w"),
  ];
  section.residents.slice(0, 8).forEach((r) => {
    lines.push(row(`  ${String(r.page).padStart(3, "0")}  ${r.name}`.slice(0, 30).padEnd(30, " "), "c"));
  });
  while (lines.length < 12) lines.push(row(blank(), "w"));
  lines.push(row("  Tornar a residents: pàg 300".padEnd(30, " "), "w"));
  lines.push(row(blank(), "w"));
  lines.push(row(`  Pàg ${section.indexPage}       ${SECTION_FOOTER_LABEL}`.padEnd(30, " "), "g"));
  return { num: section.indexPage, title: section.title, lines };
}

function mkResidentPage(section: EditorSection, resident: EditorSection["residents"][number]): TeletextPageDef {
  return {
    num: resident.page,
    title: `${section.title} ${resident.page}`,
    lines: [
      row(blank(), "w"),
      row(`  ${resident.name.toUpperCase()}`.padEnd(30, " "), "y"),
      row(`  ${resident.subtitle}`.padEnd(30, " "), "w"),
      row(blank(), "w"),
      row(`  ${resident.bio1}`.padEnd(30, " "), "c"),
      row(`  ${resident.bio2}`.padEnd(30, " "), "c"),
      row(blank(), "w"),
      row(`  ${resident.contact1}`.padEnd(30, " "), "m"),
      row(`  ${resident.contact2}`.padEnd(30, " "), "m"),
      row(blank(), "w"),
      row(`  Tornar ${section.title.toLowerCase()}: pàg ${section.indexPage}`.padEnd(30, " "), "w"),
      row(blank(), "w"),
      row(`  Pàg ${resident.page}       ${SECTION_FOOTER_LABEL}`.padEnd(30, " "), "g"),
    ],
  };
}

function mkResidentsIndex(content: EditorContent): TeletextPageDef {
  const sectionRows = content.sections
    .sort((a, b) => a.indexPage - b.indexPage)
    .map((s) => `  ${s.indexPage}  ${s.title}`.slice(0, 30).padEnd(30, " "));
  while (sectionRows.length < 4) sectionRows.push(blank());
  return {
    num: 300,
    title: "RESIDENTS",
    lines: [
      row(blank(), "w"),
      row("  PROJECTES RESIDENTS".padEnd(30, " "), "y"),
      row(blank(), "w"),
      row("  Índex projectes residents".padEnd(30, " "), "w"),
      row(blank(), "w"),
      row(sectionRows[0], "c"),
      row(sectionRows[1], "c"),
      row(sectionRows[2], "c"),
      row(sectionRows[3], "c"),
      row(blank(), "w"),
      row("  Usa el comandament per".padEnd(30, " "), "m"),
      row("  entrar a cada categoria.".padEnd(30, " "), "m"),
      row(blank(), "w"),
      row("  Pàg 300       ESPai42".padEnd(30, " "), "g"),
    ],
  };
}

function mkHomeUpdate(base: TeletextPageDef, content: EditorContent): TeletextPageDef {
  const byPage = [...content.sections].sort((a, b) => a.indexPage - b.indexPage);
  const names = byPage.map((s) => `${s.indexPage} ${s.title}`).join(" ");
  const l1 = ` ${names}`.slice(0, 30).padEnd(30, " ");
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
