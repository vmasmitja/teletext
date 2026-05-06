import { useEffect, useMemo, useState } from "react";
import type { TeletextPageDef } from "../content";
import { DEFAULT_EDITOR_CONTENT } from "../editor/defaultContent";
import { buildRuntimeContent } from "../editor/runtime";
import type { EditorContent, EditorSection } from "../editor/types";

const EMPTY_SECTIONS: EditorSection[] = [];

export function useRuntimeContent(contentVersion: number) {
  const [editorContent, setEditorContent] = useState<EditorContent>(DEFAULT_EDITOR_CONTENT);

  useEffect(() => {
    let alive = true;
    fetch("/api/editor/public-content")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("content fetch failed"))))
      .then((data: EditorContent) => {
        if (!alive) return;
        if (data?.sections?.length) setEditorContent(data);
      })
      .catch(() => {
        if (alive) setEditorContent(DEFAULT_EDITOR_CONTENT);
      });
    return () => {
      alive = false;
    };
  }, [contentVersion]);

  const built = useMemo(() => buildRuntimeContent(editorContent), [editorContent]);

  const sectionByIndexPage = useMemo(() => {
    const map = new Map<number, EditorSection>();
    (editorContent.sections ?? EMPTY_SECTIONS).forEach((s) => map.set(s.indexPage, s));
    return map;
  }, [editorContent]);

  const residentByPage = useMemo(() => {
    const map = new Map<number, { imagePath?: string }>();
    (editorContent.sections ?? EMPTY_SECTIONS).forEach((s) => {
      s.residents.forEach((r) => map.set(r.page, { imagePath: r.imagePath }));
    });
    return map;
  }, [editorContent]);

  const getPage = (num: number): TeletextPageDef | undefined => built.map.get(num);

  return {
    editorContent,
    knownPageNums: built.knownPageNums,
    sectionByIndexPage,
    residentByPage,
    getPage,
  };
}
