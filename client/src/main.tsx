import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css"; // Asegúrate de que index.css exista

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("No se encontró el elemento root en el HTML");
}

createRoot(rootElement).render(<App />);