import { useEffect, useMemo, useRef, useState } from "react";
import type { EditorContent, EditorResident, EditorSection } from "../editor/types";
import { DEFAULT_EDITOR_CONTENT } from "../editor/defaultContent";
import "./EditorPage.css";

type AuthState = { token: string | null; error: string | null; loading: boolean };
type EditorMode = "RESIDENTS" | "ESPAI42" | "AGENDA" | "CONTACTE";
type PixelEditorTarget = { sectionIdx: number; residentIdx: number } | null;
type PixelPalette = "NONE" | "TELETEXT" | "GAMEBOY";

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
  const [pixelEditorTarget, setPixelEditorTarget] = useState<PixelEditorTarget>(null);
  const [pixelSourceDataUrl, setPixelSourceDataUrl] = useState<string | null>(null);
  const [pixelScale, setPixelScale] = useState(8);
  const [pixelGray, setPixelGray] = useState(false);
  const [pixelPalette, setPixelPalette] = useState<PixelPalette>("TELETEXT");
  const [pixelOutputWidth, setPixelOutputWidth] = useState(420);
  const [pixelCropZoom, setPixelCropZoom] = useState(1);
  const [pixelCropX, setPixelCropX] = useState(0);
  const [pixelCropY, setPixelCropY] = useState(0);
  const [pixelBrightness, setPixelBrightness] = useState(0);
  const [pixelInvert, setPixelInvert] = useState(false);
  const [pixelUploading, setPixelUploading] = useState(false);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);

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
    window.sessionStorage.setItem("editorToken", data.token);
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

  function openPixelEditor(sectionIdx: number, residentIdx: number, file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setPixelSourceDataUrl(String(reader.result || ""));
      setPixelEditorTarget({ sectionIdx, residentIdx });
      setPixelScale(8);
      setPixelGray(false);
      setPixelPalette("TELETEXT");
      setPixelOutputWidth(420);
      setPixelCropZoom(1);
      setPixelCropX(0);
      setPixelCropY(0);
      setPixelBrightness(0);
      setPixelInvert(false);
    };
    reader.readAsDataURL(file);
  }

  function closePixelEditor() {
    setPixelEditorTarget(null);
    setPixelSourceDataUrl(null);
    setPixelUploading(false);
  }

  useEffect(() => {
    if (!pixelEditorTarget || !pixelSourceDataUrl) return;
    const img = new Image();
    img.onload = () => {
      const srcCanvas = sourceCanvasRef.current;
      const dstCanvas = previewCanvasRef.current;
      if (!srcCanvas || !dstCanvas) return;
      srcCanvas.width = img.naturalWidth;
      srcCanvas.height = img.naturalHeight;
      const sctx = srcCanvas.getContext("2d");
      if (!sctx) return;
      sctx.clearRect(0, 0, srcCanvas.width, srcCanvas.height);
      sctx.drawImage(img, 0, 0);
      renderPixelPreview();
    };
    img.src = pixelSourceDataUrl;
  }, [pixelEditorTarget, pixelSourceDataUrl]);

  useEffect(() => {
    if (!pixelEditorTarget) return;
    renderPixelPreview();
  }, [pixelScale, pixelGray, pixelEditorTarget, pixelPalette, pixelOutputWidth, pixelCropZoom, pixelCropX, pixelCropY, pixelBrightness, pixelInvert]);

  function renderPixelPreview() {
    const srcCanvas = sourceCanvasRef.current;
    const dstCanvas = previewCanvasRef.current;
    const outCanvas = exportCanvasRef.current;
    if (!srcCanvas || !dstCanvas || !outCanvas || !srcCanvas.width || !srcCanvas.height) return;
    const dw = Math.max(160, Math.min(1200, pixelOutputWidth));
    const ratio = srcCanvas.height / srcCanvas.width;
    const dh = Math.max(1, Math.round(dw * ratio));
    const previewW = Math.min(520, dw);
    const previewH = Math.max(1, Math.round(previewW * ratio));
    renderProcessedCanvas(srcCanvas, outCanvas, dw, dh);
    renderProcessedCanvas(srcCanvas, dstCanvas, previewW, previewH);
  }

  function renderProcessedCanvas(srcCanvas: HTMLCanvasElement, targetCanvas: HTMLCanvasElement, targetW: number, targetH: number) {
    const srcW = srcCanvas.width;
    const srcH = srcCanvas.height;
    const zoom = Math.max(1, pixelCropZoom);
    const cropW = srcW / zoom;
    const cropH = srcH / zoom;
    const maxOffsetX = (srcW - cropW) / 2;
    const maxOffsetY = (srcH - cropH) / 2;
    const centerX = srcW / 2 + (pixelCropX / 100) * maxOffsetX;
    const centerY = srcH / 2 + (pixelCropY / 100) * maxOffsetY;
    const sx = Math.max(0, Math.min(srcW - cropW, centerX - cropW / 2));
    const sy = Math.max(0, Math.min(srcH - cropH, centerY - cropH / 2));
    const work = document.createElement("canvas");
    work.width = targetW;
    work.height = targetH;
    const wctx = work.getContext("2d");
    if (!wctx) return;
    wctx.imageSmoothingEnabled = false;
    wctx.clearRect(0, 0, targetW, targetH);
    wctx.drawImage(srcCanvas, sx, sy, cropW, cropH, 0, 0, targetW, targetH);
    const scale = Math.max(2, pixelScale);
    const tinyW = Math.max(1, Math.floor(targetW / scale));
    const tinyH = Math.max(1, Math.floor(targetH / scale));
    const tiny = document.createElement("canvas");
    tiny.width = tinyW;
    tiny.height = tinyH;
    const tctx = tiny.getContext("2d");
    if (!tctx) return;
    tctx.imageSmoothingEnabled = false;
    tctx.drawImage(work, 0, 0, tinyW, tinyH);
    const imgData = tctx.getImageData(0, 0, tinyW, tinyH);
    applyPixelFilters(imgData.data);
    tctx.putImageData(imgData, 0, 0);
    targetCanvas.width = targetW;
    targetCanvas.height = targetH;
    const dctx = targetCanvas.getContext("2d");
    if (!dctx) return;
    dctx.imageSmoothingEnabled = false;
    dctx.clearRect(0, 0, targetW, targetH);
    dctx.drawImage(tiny, 0, 0, targetW, targetH);
  }

  function applyPixelFilters(data: Uint8ClampedArray) {
    const paletteMap: Record<Exclude<PixelPalette, "NONE">, number[][]> = {
      TELETEXT: [
        [0, 0, 0],
        [255, 255, 255],
        [255, 0, 0],
        [0, 255, 255],
        [255, 0, 255],
        [0, 255, 0],
        [0, 0, 255],
        [255, 255, 0],
      ],
      GAMEBOY: [
        [15, 56, 15],
        [48, 98, 48],
        [139, 172, 15],
        [155, 188, 15],
      ],
    };
    const palette = pixelPalette === "NONE" ? null : paletteMap[pixelPalette];
    const brightnessOffset = Math.round((pixelBrightness / 100) * 70);
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i] + brightnessOffset;
      let g = data[i + 1] + brightnessOffset;
      let b = data[i + 2] + brightnessOffset;
      if (pixelGray) {
        const gray = Math.round(r * 0.3 + g * 0.59 + b * 0.11);
        r = gray;
        g = gray;
        b = gray;
      }
      if (pixelInvert) {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
      }
      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));
      if (palette) {
        let best = palette[0];
        let bestDist = Number.POSITIVE_INFINITY;
        for (const color of palette) {
          const dr = r - color[0];
          const dg = g - color[1];
          const db = b - color[2];
          const dist = dr * dr + dg * dg + db * db;
          if (dist < bestDist) {
            bestDist = dist;
            best = color;
          }
        }
        r = best[0];
        g = best[1];
        b = best[2];
      }
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }

  async function uploadPixelEditedResidentImage() {
    if (!auth.token || !pixelEditorTarget || !exportCanvasRef.current) return;
    setPixelUploading(true);
    const blob = await new Promise<Blob | null>((resolve) => exportCanvasRef.current!.toBlob(resolve, "image/png"));
    if (!blob) {
      setPixelUploading(false);
      return;
    }
    const form = new FormData();
    form.append("file", new File([blob], `resident-${Date.now()}.png`, { type: "image/png" }));
    const r = await fetch("/api/editor/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.token}` },
      body: form,
    });
    if (!r.ok) {
      setPixelUploading(false);
      return;
    }
    const data = (await r.json()) as { path: string };
    updateResident(pixelEditorTarget.sectionIdx, pixelEditorTarget.residentIdx, (resident) => ({ ...resident, imagePath: data.path }));
    closePixelEditor();
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
        <h1>Editor Teletext</h1>
        <div className="editor-header-actions">
          <a className="editor-layout-link" href={`/maquetacio?token=${encodeURIComponent(auth.token)}`} target="_blank" rel="noreferrer">
            Obrir maquetacio
          </a>
          <button type="button" onClick={save}>
            Guardar i publicar
          </button>
        </div>
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
                    onChange={(e) => e.target.files?.[0] && openPixelEditor(activeSection, idx, e.target.files[0])}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const fileInput = document.createElement("input");
                    fileInput.type = "file";
                    fileInput.accept = "image/*";
                    fileInput.onchange = (ev) => {
                      const f = (ev.target as HTMLInputElement).files?.[0];
                      if (f) uploadResidentImage(activeSection, idx, f);
                    };
                    fileInput.click();
                  }}
                >
                  Pujar directa (sense editar)
                </button>
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
      {pixelEditorTarget && (
        <div className="pixel-modal-backdrop">
          <div className="pixel-modal">
            <h3>Editar i pixelar imatge resident</h3>
            <label>
              Intensitat pixelat: {pixelScale}
              <input type="range" min={2} max={24} value={pixelScale} onChange={(e) => setPixelScale(Number(e.target.value))} />
            </label>
            <label>
              Mida eixida (ample): {pixelOutputWidth}px
              <input type="range" min={220} max={900} step={10} value={pixelOutputWidth} onChange={(e) => setPixelOutputWidth(Number(e.target.value))} />
            </label>
            <label>
              Zoom retall: {pixelCropZoom.toFixed(2)}x
              <input type="range" min={1} max={3} step={0.05} value={pixelCropZoom} onChange={(e) => setPixelCropZoom(Number(e.target.value))} />
            </label>
            <label>
              Retall horitzontal: {pixelCropX}
              <input type="range" min={-100} max={100} value={pixelCropX} onChange={(e) => setPixelCropX(Number(e.target.value))} />
            </label>
            <label>
              Retall vertical: {pixelCropY}
              <input type="range" min={-100} max={100} value={pixelCropY} onChange={(e) => setPixelCropY(Number(e.target.value))} />
            </label>
            <label>
              Brillantor: {pixelBrightness}
              <input type="range" min={-100} max={100} value={pixelBrightness} onChange={(e) => setPixelBrightness(Number(e.target.value))} />
            </label>
            <label>
              Paleta
              <select value={pixelPalette} onChange={(e) => setPixelPalette(e.target.value as PixelPalette)}>
                <option value="TELETEXT">Teletext (8 colors)</option>
                <option value="GAMEBOY">Game Boy (4 colors)</option>
                <option value="NONE">Sense paleta</option>
              </select>
            </label>
            <label className="pixel-check">
              <input type="checkbox" checked={pixelGray} onChange={(e) => setPixelGray(e.target.checked)} />
              Escala de grisos
            </label>
            <label className="pixel-check">
              <input type="checkbox" checked={pixelInvert} onChange={(e) => setPixelInvert(e.target.checked)} />
              Invertir colors
            </label>
            <canvas ref={previewCanvasRef} className="pixel-preview" />
            <canvas ref={exportCanvasRef} style={{ display: "none" }} />
            <canvas ref={sourceCanvasRef} style={{ display: "none" }} />
            <div className="pixel-actions">
              <button type="button" onClick={closePixelEditor} disabled={pixelUploading}>
                Cancelar edicio
              </button>
              <button type="button" onClick={uploadPixelEditedResidentImage} disabled={pixelUploading}>
                {pixelUploading ? "Pujant..." : "Aplicar i pujar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
