import { useEffect, useState } from "react";
// Importamos solo lo necesario de React-Leaflet
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// --- ARREGLO PARA ICONOS ROTOS EN VITE/LEAFLET ---
// Leaflet tiene un bug conocido en React donde los iconos por defecto no cargan.
// Esto lo soluciona forzando las imágenes desde un CDN.
const iconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const shadowUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

const defaultIcon = L.icon({
  iconUrl: iconUrl,
  iconRetinaUrl: iconRetinaUrl,
  shadowUrl: shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Forzamos el icono por defecto globalmente
L.Marker.prototype.options.icon = defaultIcon;

// Coordenadas iniciales (Copiapó)
const center: [number, number] = [-27.3668, -70.3319]; 

export default function FleetMap() {
  const [vehicles, setVehicles] = useState<any[]>([]);

  // Función simple para pedir datos
  const fetchFleet = async () => {
    try {
      const res = await fetch("/api/vehicle-locations");
      if (res.ok) {
        const data = await res.json();
        console.log("Datos recibidos en el mapa:", data); // Para depurar en consola
        setVehicles(data);
      }
    } catch (error) {
      console.error("Error cargando flota:", error);
    }
  };

  useEffect(() => {
    fetchFleet();
    const interval = setInterval(fetchFleet, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    // IMPORTANTE: El contenedor debe tener altura definida
    <div className="h-[500px] w-full rounded-xl overflow-hidden border border-gray-200 relative z-0">
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {vehicles.map((v) => {
            // Validación extra para evitar crashes
            const lat = parseFloat(v.lat);
            const lng = parseFloat(v.lng);
            if (isNaN(lat) || isNaN(lng)) return null;

            return (
              <Marker key={v.vehicleId} position={[lat, lng]}>
                <Popup>
                  <div className="font-bold">{v.model}</div>
                  <div>{v.plate}</div>
                  <div style={{ color: v.isPaid ? 'green' : 'red' }}>
                    {v.isPaid ? "PAGADO" : "NO PAGADO"}
                  </div>
                </Popup>
              </Marker>
            );
        })}
      </MapContainer>
    </div>
  );
}