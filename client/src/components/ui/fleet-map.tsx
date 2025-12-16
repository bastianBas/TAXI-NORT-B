import { useEffect, useState, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet"; 
import "leaflet/dist/leaflet.css";

// --- DEFINICIÓN DE ÍCONOS DE COCHE PERSONALIZADOS (Se mantiene igual) ---

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

const createCarIcon = (color: string) => L.divIcon({
    html: carIconSvg(color),
    className: 'custom-car-icon',
    iconSize: [30, 30], 
    iconAnchor: [15, 30], 
});

const iconPaid = createCarIcon('#10B981'); 
const iconUnpaid = createCarIcon('#EF4444'); 

// 🟢 CORRECCIÓN 1: Centro Predeterminado en Copiapó
const COPIAPO_CENTER: [number, number] = [-27.3668, -70.3319]; 

// --- NUEVO COMPONENTE: Maneja la vista y el centrado dinámico ---
function ViewHandler({ locations, defaultCenter }: { locations: any[], defaultCenter: [number, number] }) {
    const map = useMap();
    const hasInitializedRef = useRef(false);

    useEffect(() => {
        if (locations.length > 0) {
            // Si hay autos activos, centramos en el primero
            const firstLocation = locations[0];
            const lat = Number(firstLocation.lat);
            const lng = Number(firstLocation.lng);
            
            if (!hasInitializedRef.current || map.getZoom() < 13) {
                // Centramos y hacemos zoom en el primer auto activo (si no se ha inicializado o si el zoom es muy bajo)
                map.setView([lat, lng], 14);
                hasInitializedRef.current = true;
            } else {
                // Solo movemos el centro sin cambiar el zoom si ya está inicializado
                map.panTo([lat, lng]);
            }
        } else if (!hasInitializedRef.current) {
            // Si no hay autos y no se ha inicializado, centramos en Copiapó (default)
            map.setView(defaultCenter, 12);
            hasInitializedRef.current = true;
        }
    }, [map, locations, defaultCenter]);

    return null;
}
// -----------------------------------------------------------------


export function FleetMap() {
  const [vehicles, setVehicles] = useState<any[]>([]);

  // Función para obtener datos de la API (incluye el filtro de timeout de 30s)
  const fetchFleet = async () => {
    try {
      const res = await fetch("/api/vehicle-locations");
      if (res.ok) {
        const data = await res.json();
        // Los datos ya están filtrados por el servidor por el timestamp de 30s
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
  
  // Usamos useMemo para establecer el centro inicial
  const initialCenter = useMemo(() => {
      // Si hay vehículos de prueba (TEST-OK) o reales, centramos en el primero.
      // Sino, usamos el centro de Copiapó.
      if (vehicles.length > 0) {
          const first = vehicles[0];
          return [Number(first.lat), Number(first.lng)] as [number, number];
      }
      return COPIAPO_CENTER;
  }, [vehicles]);


  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm relative z-0">
      <MapContainer 
        // 🟢 CORRECCIÓN 2: Usamos el centro inicial, que será Copiapó si no hay autos
        center={initialCenter} 
        zoom={12} 
        style={{ height: "500px", width: "100%" }}
      >
        {/* 🟢 CORRECCIÓN 3: Usamos el nuevo componente para manejar el centrado dinámico */}
        <ViewHandler locations={vehicles} defaultCenter={COPIAPO_CENTER} />
        
        {/* Capa de OpenStreetMap (Gratis) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marcadores de Vehículos (Se mantienen igual) */}
        {vehicles.map((v) => {
          const lat = Number(v.lat);
          const lng = Number(v.lng);
          if (isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker 
              key={v.vehicleId} 
              position={[lat, lng]} 
              icon={v.isPaid ? iconPaid : iconUnpaid}
            >
              <Popup>
                {/* ... Código del Popup ... */}
                <div className="min-w-[200px] p-1 font-sans text-sm">
                  <div className="border-b pb-2 mb-2">
                    <h3 className="font-bold text-base">{v.model}</h3>
                    <span className="text-xs bg-gray-100 px-1 rounded border text-gray-600">{v.plate}</span>
                  </div>
                  
                  <div className="mb-2">
                    <span className="text-[10px] text-gray-400 uppercase font-bold">Conductor</span>
                    <p className="font-medium">{v.driverName}</p>
                  </div>

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