import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css"; 
// 🟢 VITAL: Esto hace que el mapa sea visible
import "leaflet/dist/leaflet.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("No se encontró el elemento root en el HTML");
}

createRoot(rootElement).render(<App />);