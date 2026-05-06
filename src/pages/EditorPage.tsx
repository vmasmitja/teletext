import { useMemo, useState } from "react";
import type { EditorContent, EditorResident, EditorSection } from "../editor/types";
import { DEFAULT_EDITOR_CONTENT } from "../editor/defaultContent";
import "./EditorPage.css";

type AuthState = { token: string | null; error: string | null; loading: boolean };
type EditorMode = "RESIDENTS" | "ESPAI42" | "AGENDA" | "CONTACTE";

function cloneContent(content: EditorContent): EditorContent {
  return {
    ...content,
    sections: content.sections.map((s) => ({ ...s, residents: s.residents.map((r) => ({ ...r })) })),
    staticPages: (content.staticPages ?? []).map((p) => ({ ...p, lines: [...p.lines] })),
  };
}

function mergeWithDefaults(content: EditorContent): EditorContent {
  const base = cloneContent(content);
  if (!base.staticPages?.length) {
    base.staticPages = DEFAULT_EDITOR_CONTENT.staticPages ? [...DEFAULT_EDITOR_CONTENT.staticPages] : [];
  }
  return base;
}

export function EditorPage() {
  const [auth, setAuth] = useState<AuthState>({ token: null, error: null, loading: false });
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState<EditorContent>(DEFAULT_EDITOR_CONTENT);
  const [activeSection, setActiveSection] = useState(0);
  const [mode, setMode] = useState<EditorMode>("RESIDENTS");
  const [selectedStaticPage, setSelectedStaticPage] = useState<number>(101);
  const [status, setStatus] = useState<string>("");

  const usedPages = useMemo(() => {
    const set = new Set<number>();
    content.sections.forEach((s) => {
      set.add(s.indexPage);
      s.residents.forEach((r) => set.add(r.page));
    });
    return set;
  }, [content]);

  async function login() {
    setAuth((a) => ({ ...a, loading: true, error: null }));
    const res = await fetch("/api/editor/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      setAuth({ token: null, loading: false, error: "Credencials incorrectes" });
      return;
    }
    const data = (await res.json()) as { token: string };
    setAuth({ token: data.token, loading: false, error: null });
    const loaded = await fetch("/api/editor/content", { headers: { Authorization: `Bearer ${data.token}` } });
    if (loaded.ok) {
      const c = (await loaded.json()) as EditorContent;
      setContent(mergeWithDefaults(c));
    }
  }

  function updateSection(idx: number, updater: (section: EditorSection) => EditorSection) {
    setContent((prev) => {
      const next = cloneContent(prev);
      next.sections[idx] = updater(next.sections[idx]);
      next.updatedAt = new Date().toISOString();
      return next;
    });
  }

  function updateResident(sectionIdx: number, residentIdx: number, updater: (resident: EditorResident) => EditorResident) {
    updateSection(sectionIdx, (section) => {
      section.residents[residentIdx] = updater(section.residents[residentIdx]);
      return section;
    });
  }

  function addResident(sectionIdx: number) {
    updateSection(sectionIdx, (section) => {
      const pageBase = section.indexPage + 1;
      let page = pageBase;
      while (usedPages.has(page)) page += 1;
      section.residents.push({
        id: `${section.key.toLowerCase()}-${Date.now()}`,
        page,
        name: "Nou Resident",
        subtitle: "Resident",
        bio1: "Bio línia 1",
        bio2: "Bio línia 2",
        contact1: "Contacte",
        contact2: "Web / IG",
      });
      return section;
    });
  }

  function deleteResident(sectionIdx: number, residentIdx: number) {
    updateSection(sectionIdx, (section) => {
      section.residents.splice(residentIdx, 1);
      return section;
    });
  }

  async function uploadImage(sectionIdx: number, file: File) {
    if (!auth.token) return;
    const form = new FormData();
    form.append("file", file);
    const r = await fetch("/api/editor/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.token}` },
      body: form,
    });
    if (!r.ok) return;
    const data = (await r.json()) as { path: string };
    updateSection(sectionIdx, (section) => ({ ...section, imagePath: data.path }));
  }

  async function uploadResidentImage(sectionIdx: number, residentIdx: number, file: File) {
    if (!auth.token) return;
    const form = new FormData();
    form.append("file", file);
    const r = await fetch("/api/editor/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.token}` },
      body: form,
    });
    if (!r.ok) return;
    const data = (await r.json()) as { path: string };
    updateResident(sectionIdx, residentIdx, (resident) => ({ ...resident, imagePath: data.path }));
  }

  function updateStaticPageText(pageNum: number, lineIdx: number, value: string) {
    setContent((prev) => {
      const next = cloneContent(prev);
      const page = next.staticPages?.find((p) => p.num === pageNum);
      if (!page) return prev;
      page.lines[lineIdx] = value;
      next.updatedAt = new Date().toISOString();
      return next;
    });
  }

  function updateStaticPageTitle(pageNum: number, title: string) {
    setContent((prev) => {
      const next = cloneContent(prev);
      const page = next.staticPages?.find((p) => p.num === pageNum);
      if (!page) return prev;
      page.title = title;
      next.updatedAt = new Date().toISOString();
      return next;
    });
  }

  async function save() {
    if (!auth.token) return;
    setStatus("Guardant...");
    const res = await fetch("/api/editor/content", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify(content),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({ error: "No s'ha pogut guardar" }));
      setStatus(`Error: ${e.error || "No s'ha pogut guardar"}`);
      return;
    }
    setStatus("Contingut guardat i publicat");
  }

  if (!auth.token) {
    return (
      <div className="editor-login">
        <h1>Editor Teletext</h1>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Usuari" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contrasenya" type="password" />
        <button type="button" onClick={login} disabled={auth.loading}>
          {auth.loading ? "Entrant..." : "Entrar"}
        </button>
        {auth.error && <p className="editor-error">{auth.error}</p>}
      </div>
    );
  }

  const section = content.sections[activeSection];
  const staticPages = content.staticPages ?? [];
  const staticPage = staticPages.find((p) => p.num === selectedStaticPage);

  const staticGroups: Record<Exclude<EditorMode, "RESIDENTS">, number[]> = {
    ESPAI42: [101, 102, 103, 104],
    AGENDA: [201, 202, 203, 204],
    CONTACTE: [401, 402, 403],
  };

  const currentStaticGroupPages = mode === "RESIDENTS" ? [] : staticGroups[mode];
  const visibleStaticPages = staticPages.filter((p) => currentStaticGroupPages.includes(p.num));

  function switchMode(nextMode: EditorMode) {
    setMode(nextMode);
    if (nextMode !== "RESIDENTS") {
      const first = staticGroups[nextMode][0];
      setSelectedStaticPage(first);
    }
  }

  return (
    <div className="editor-wrap">
      <header className="editor-header">
        <h1>Editor Teletext Residents</h1>
        <button type="button" onClick={save}>
          Guardar i publicar
        </button>
      </header>
      <div className="editor-status">{status}</div>
      <div className="editor-mode-tabs">
        {(["RESIDENTS", "ESPAI42", "AGENDA", "CONTACTE"] as EditorMode[]).map((m) => (
          <button key={m} className={mode === m ? "active" : ""} type="button" onClick={() => switchMode(m)}>
            {m}
          </button>
        ))}
      </div>

      {mode === "RESIDENTS" ? (
        <>
          <div className="editor-tabs">
            {content.sections.map((s, i) => (
              <button
                key={s.key}
                className={i === activeSection ? "active" : ""}
                type="button"
                onClick={() => setActiveSection(i)}
              >
                {s.title}
              </button>
            ))}
          </div>
          <section className="editor-section">
            <label>
              Títol secció
              <input value={section.title} onChange={(e) => updateSection(activeSection, (s) => ({ ...s, title: e.target.value }))} />
            </label>
            <label>
              Pàgina índex
              <input
                type="number"
                value={section.indexPage}
                onChange={(e) => updateSection(activeSection, (s) => ({ ...s, indexPage: Number(e.target.value) || s.indexPage }))}
              />
            </label>
            <label>
              Imatge/logo URL
              <input
                value={section.imagePath}
                onChange={(e) => updateSection(activeSection, (s) => ({ ...s, imagePath: e.target.value }))}
                placeholder="/editor-assets/imatge.png"
              />
            </label>
            <label>
              Pujar imatge
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && uploadImage(activeSection, e.target.files[0])}
              />
            </label>
          </section>
          <section className="editor-residents">
            <div className="editor-residents-head">
              <h2>Residents</h2>
              <button type="button" onClick={() => addResident(activeSection)}>
                + Afegir resident
              </button>
            </div>
            {section.residents.map((resident, idx) => (
              <div key={resident.id} className="editor-card">
                <div className="editor-row">
                  <label>
                    Pàgina
                    <input
                      type="number"
                      value={resident.page}
                      onChange={(e) => updateResident(activeSection, idx, (r) => ({ ...r, page: Number(e.target.value) || r.page }))}
                    />
                  </label>
                  <label>
                    Nom
                    <input
                      value={resident.name}
                      onChange={(e) => updateResident(activeSection, idx, (r) => ({ ...r, name: e.target.value }))}
                    />
                  </label>
                  <button type="button" className="danger" onClick={() => deleteResident(activeSection, idx)}>
                    Eliminar
                  </button>
                </div>
                <label>
                  Subtítol
                  <input
                    value={resident.subtitle}
                    onChange={(e) => updateResident(activeSection, idx, (r) => ({ ...r, subtitle: e.target.value }))}
                  />
                </label>
                <label>
                  Bio 1
                  <input value={resident.bio1} onChange={(e) => updateResident(activeSection, idx, (r) => ({ ...r, bio1: e.target.value }))} />
                </label>
                <label>
                  Bio 2
                  <input value={resident.bio2} onChange={(e) => updateResident(activeSection, idx, (r) => ({ ...r, bio2: e.target.value }))} />
                </label>
                <label>
                  Contacte 1
                  <input
                    value={resident.contact1}
                    onChange={(e) => updateResident(activeSection, idx, (r) => ({ ...r, contact1: e.target.value }))}
                  />
                </label>
                <label>
                  Contacte 2
                  <input
                    value={resident.contact2}
                    onChange={(e) => updateResident(activeSection, idx, (r) => ({ ...r, contact2: e.target.value }))}
                  />
                </label>
                <label>
                  Imatge/logo resident URL
                  <input
                    value={resident.imagePath ?? ""}
                    onChange={(e) => updateResident(activeSection, idx, (r) => ({ ...r, imagePath: e.target.value }))}
                    placeholder="(si buit, surt logo ESPai42)"
                  />
                </label>
                <label>
                  Pujar imatge resident
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && uploadResidentImage(activeSection, idx, e.target.files[0])}
                  />
                </label>
              </div>
            ))}
          </section>
        </>
      ) : (
        <section className="editor-static">
          <h2>Editor de textos: {mode}</h2>
          <div className="editor-tabs">
            {visibleStaticPages.map((p) => (
              <button
                key={p.num}
                className={selectedStaticPage === p.num ? "active" : ""}
                type="button"
                onClick={() => setSelectedStaticPage(p.num)}
              >
                {p.num} · {p.title}
              </button>
            ))}
          </div>
          {staticPage && (
            <>
              <label>
                Títol pàgina
                <input value={staticPage.title} onChange={(e) => updateStaticPageTitle(staticPage.num, e.target.value)} />
              </label>
              {staticPage.lines.map((line, i) => (
                <label key={`${staticPage.num}-${i}`}>
                  Línia {i + 1}
                  <input value={line} onChange={(e) => updateStaticPageText(staticPage.num, i, e.target.value.slice(0, 40))} />
                </label>
              ))}
            </>
          )}
        </section>
      )}
    </div>
  );
}
