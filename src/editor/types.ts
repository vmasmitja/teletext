export type EditorSectionKey = "ART" | "ARTESANIA" | "MAKERS" | "SOSTENIBILITAT";

export type EditorResident = {
  id: string;
  page: number;
  name: string;
  subtitle: string;
  bio1: string;
  bio2: string;
  contact1: string;
  contact2: string;
};

export type EditorSection = {
  key: EditorSectionKey;
  title: string;
  indexPage: number;
  imagePath: string;
  residents: EditorResident[];
};

export type EditorContent = {
  updatedAt: string;
  sections: EditorSection[];
};
