import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet"; // <--- Importación más segura
import "leaflet/dist/leaflet.css";

// --- CONFIGURACIÓN DE ICONOS ---
// Usamos L.Icon para evitar conflictos de importación

// Icono Verde (Pagado)
const iconPaid = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Icono Rojo (No Pagado)
const iconUnpaid = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Icono Azul (Por defecto/Sin datos)
const iconDefault = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Coordenadas iniciales (Copiapó)
const center: [number, number] = [-27.3668, -70.3319]; 

function SetViewOnMount({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center, 13); }, [map, center]);
  return null;
}

export default function FleetMap() {
  const [vehicles, setVehicles] = useState<any[]>([]);

  // Función para obtener los datos del backend
  const fetchFleet = async () => {
    try {
      const res = await fetch("/api/vehicle-locations");
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
      }
    } catch (error) {
      console.error("Error cargando flota:", error);
    }
  };

  // Actualización automática cada 3 segundos
  useEffect(() => {
    fetchFleet();
    const interval = setInterval(fetchFleet, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-gray-200 relative z-0 shadow-md">
      <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
        <SetViewOnMount center={center} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {vehicles.map((v) => {
          const lat = Number(v.lat);
          const lng = Number(v.lng);
          if (isNaN(lat) || isNaN(lng)) return null;

          // Selección de icono
          let finalIcon = iconDefault;
          if (v.isPaid === true) finalIcon = iconPaid;
          if (v.isPaid === false) finalIcon = iconUnpaid;

          return (
            <Marker 
              key={v.vehicleId} 
              position={[lat, lng]} 
              icon={finalIcon}
            >
              <Popup>
                <div className="p-1 font-sans text-sm min-w-[200px]">
                  {/* Modelo y Patente */}
                  <div className="border-b pb-2 mb-2 flex justify-between items-center">
                    <h3 className="font-bold text-base text-gray-800">{v.model}</h3>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded border border-gray-300 font-mono text-gray-600">
                      {v.plate}
                    </span>
                  </div>
                  
                  {/* Conductor */}
                  <div className="mb-3">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Conductor</span>
                    <p className="font-medium text-gray-700 text-sm">{v.driverName}</p>
                  </div>

                  {/* Estado (Rojo/Verde) */}
                  <div className="mt-2">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-1">
                      Estado Hoja de Ruta
                    </span>
                    
                    {v.isPaid ? (
                      <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-md border border-green-200">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="font-bold text-xs">PAGADA</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-md border border-red-200">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                        <span className="font-bold text-xs">NO PAGADA</span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}