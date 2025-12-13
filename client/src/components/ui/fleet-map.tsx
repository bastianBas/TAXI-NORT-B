import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
// Importamos L de Leaflet para usar L.divIcon
import L from "leaflet"; 
import "leaflet/dist/leaflet.css";

// --- DEFINICIÓN DE ÍCONOS DE COCHE PERSONALIZADOS ---

// 1. Plantilla SVG de un coche (Icono de Lucide-React, adaptado a SVG)
const carIconSvg = (color: string) => `
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" 
        fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
        style="position: absolute; bottom: 0; left: 0; transform: translate(-50%, -10%);">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.3 16.6 10 15 10c-1.8 0-3.5.7-4.7 1.9"/>
        <path d="M9 18v-5h2"/>
        <path d="M10 20c-1.1 0-2-.9-2-2h-1c-1.1 0-2 .9-2 2h4Z"/>
        <path d="M17 20c-1.1 0-2-.9-2-2h-1c-1.1 0-2 .9-2 2h4Z"/>
        <path d="M22 10h-2V7a1 1 0 0 0-1-1H7.85c-.83 0-1.63.3-2.22.82L3 8"/>
    </svg>
`;

// 2. Función para crear el ícono con el color dinámico
const createCarIcon = (color: string) => L.divIcon({
    html: carIconSvg(color),
    className: 'custom-car-icon',
    // Ajustamos el tamaño para que se vea bien
    iconSize: [30, 30], 
    // Ajustamos el anclaje para que la base de las ruedas esté en la coordenada
    iconAnchor: [15, 30], 
});

// 3. Creación de las instancias de íconos (Verde/Rojo)
const iconPaid = createCarIcon('#10B981'); // Verde esmeralda de Tailwind
const iconUnpaid = createCarIcon('#EF4444'); // Rojo de Tailwind

// Centro del mapa (Santiago)
const center: [number, number] = [-33.4489, -70.6693]; 

// Componente auxiliar para centrar el mapa al cargar
function SetViewOnMount({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 12);
  }, [map, center]);
  return null;
}

export default function FleetMap() {
  const [vehicles, setVehicles] = useState<any[]>([]);

  // Función para obtener datos de la API
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

  // Actualizar cada 5 segundos (Polling)
  useEffect(() => {
    fetchFleet();
    const interval = setInterval(fetchFleet, 5000); 
    return () => clearInterval(interval);
  }, []);

  return (
    // Contenedor visual del mapa
    <div className="h-full w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm relative z-0">
      {/* Asegúrate de que este contenedor tiene altura (h-full en este caso, 
        que depende del contenedor padre. Si no funciona, pon h-[500px]) 
      */}
      <MapContainer center={center} zoom={12} style={{ height: "500px", width: "100%" }}>
        <SetViewOnMount center={center} />
        
        {/* Capa de OpenStreetMap (Gratis) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marcadores de Vehículos */}
        {vehicles.map((v) => {
          const lat = Number(v.lat);
          const lng = Number(v.lng);
          // Si las coordenadas no son válidas, no mostramos nada
          if (isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker 
              key={v.vehicleId} 
              position={[lat, lng]} 
              // Usamos el ícono de auto verde o rojo
              icon={v.isPaid ? iconPaid : iconUnpaid}
            >
              <Popup>
                {/* Diseño del Popup (Se mantiene igual) */}
                <div className="min-w-[200px] p-1 font-sans text-sm">
                  <div className="border-b pb-2 mb-2">
                    <h3 className="font-bold text-base">{v.model}</h3>
                    <span className="text-xs bg-gray-100 px-1 rounded border text-gray-600">{v.plate}</span>
                  </div>
                  
                  <div className="mb-2">
                    <span className="text-[10px] text-gray-400 uppercase font-bold">Conductor</span>
                    <p className="font-medium">{v.driverName}</p>
                  </div>

                  {/* Etiqueta de Estado (Roja o Verde) */}
                  <div>
                    {v.isPaid ? (
                      <span className="text-green-700 font-bold text-xs bg-green-100 px-2 py-1 rounded-full border border-green-200">
                        PAGADA
                      </span>
                    ) : (
                      <span className="text-red-700 font-bold text-xs bg-red-100 px-2 py-1 rounded-full border border-red-200">
                        NO PAGADA
                      </span>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Indicador de "En Vivo" */}
      <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-full text-xs font-semibold shadow-md z-[1000] flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        En Vivo ({vehicles.length} autos)
      </div>
    </div>
  );
}