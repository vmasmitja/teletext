import { Navigate, Route, Routes } from "react-router-dom";
import { DisplayPage } from "./pages/DisplayPage";
import { EditorPage } from "./pages/EditorPage";
import { MaquetacioPage } from "./pages/MaquetacioPage";
import { RemotePage } from "./pages/RemotePage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/tv" replace />} />
      <Route path="/tv" element={<DisplayPage />} />
      <Route path="/comandament" element={<RemotePage />} />
      <Route path="/editor" element={<EditorPage />} />
      <Route path="/maquetacio" element={<MaquetacioPage />} />
      <Route path="/display" element={<Navigate to="/tv" replace />} />
      <Route path="/pantalla" element={<Navigate to="/tv" replace />} />
      <Route path="/remote" element={<Navigate to="/comandament" replace />} />
      <Route path="/mando" element={<Navigate to="/comandament" replace />} />
      <Route path="*" element={<Navigate to="/tv" replace />} />
    </Routes>
  );
}
