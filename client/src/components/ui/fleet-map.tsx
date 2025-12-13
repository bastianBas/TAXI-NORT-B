import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- SOLUCIÓN AL PROBLEMA DE LOS ÍCONOS ROTOS ---
// Vite y Webpack a veces rompen los links a las imágenes de los pines. Esto lo arregla.
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: iconMarker,
    iconRetinaUrl: iconRetina,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;
// ------------------------------------------------

interface VehicleLocation {
  vehicleId: string;
  lat: number;
  lng: number;
  plate: string;
  driverName?: string;
  model?: string;
  status?: string;
}

export function FleetMap() {
  const [locations, setLocations] = useState<VehicleLocation[]>([]);

  // Función para cargar las ubicaciones
  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/vehicle-locations");
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch (error) {
      console.error("Error cargando mapa:", error);
    }
  };

  // Actualizar cada 5 segundos (polling)
  useEffect(() => {
    fetchLocations(); // Primera carga inmediata
    const interval = setInterval(fetchLocations, 5000); 
    return () => clearInterval(interval);
  }, []);

  // Coordenadas iniciales (Copiapó, Chile por defecto)
  const defaultCenter = { lat: -27.366, lng: -70.332 }; 

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border border-border shadow-sm relative z-0">
      <MapContainer 
        center={[defaultCenter.lat, defaultCenter.lng]} 
        zoom={13} 
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {locations.map((loc) => (
           // Solo mostramos si tiene coordenadas válidas
           loc.lat && loc.lng ? (
            <Marker key={loc.vehicleId} position={[loc.lat, loc.lng]}>
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">{loc.plate}</p>
                  <p>{loc.driverName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {loc.model}
                  </p>
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}
      </MapContainer>
      
      {/* Indicador de "En Vivo" */}
      <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-full text-xs font-semibold shadow-md z-[1000] flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        En Vivo ({locations.length} autos)
      </div>
    </div>
  );
}