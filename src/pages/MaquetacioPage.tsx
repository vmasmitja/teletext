import { Navigate, useSearchParams } from "react-router-dom";
import { DisplayPage } from "./DisplayPage";

export function MaquetacioPage() {
  const [params] = useSearchParams();
  const queryToken = params.get("token");
  const storedToken = typeof window !== "undefined" ? window.sessionStorage.getItem("editorToken") : null;
  const token = queryToken || storedToken;

  if (!token) {
    return <Navigate to="/editor" replace />;
  }

  if (queryToken && queryToken !== storedToken) {
    window.sessionStorage.setItem("editorToken", queryToken);
  }

  return <DisplayPage layoutMode layoutToken={token} />;
}
