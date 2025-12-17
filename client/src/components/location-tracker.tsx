import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge"; 

// --- GENERADOR DE ICONO DE AUTO (SVG) ---
// Esto dibuja el auto y el pin usando código, así nunca sale error de imagen rota.
const getCarIcon = (isPaid: boolean) => {
  const color = isPaid ? "#16a34a" : "#dc2626"; // Verde (Paid) o Rojo (Pendiente)

  // Diseño SVG: Un Pin con un círculo blanco y un auto adentro
  const svgHtml = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 80" width="40" height="60">
      <ellipse cx="25" cy="78" rx="15" ry="4" fill="black" opacity="0.3"/>
      
      <path d="M25 2C12.8 2 3 11.8 3 24c0 15 22 46 22 46s22-31 22-46c0-12.2-9.8-22-22-22z" fill="${color}" stroke="white" stroke-width="2"/>
      
      <circle cx="25" cy="24" r="14" fill="white"/>
      
      <path d="M15 28.5c-1 0-1.5-.5-1.5-1.5v-1c0-.5-.5-1-1-1h-1c-.5 0-1 .5-1 1v4c0 .5.5 1 1 1h1c.5 0 1-.5 1-1v-1c0-.2.2-.5.5-.5h22c.2 0 .5.2.5.5v1c0 .5.5 1 1 1h1c.5 0 1-.5 1-1v-4c0-.5-.5-1-1-1h-1c-.5 0-1 .5-1 1v1c0 1-.5 1.5-1.5 1.5H15zm-2.5-9c-1.5 0-3 1-3.5 3l-1.5 4.5c-.3.8.3 1.5 1.2 1.5h32.6c.9 0 1.5-.7 1.2-1.5l-1.5-4.5c-.5-2-2-3-3.5-3h-25z M16.5 29a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm17 0a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" fill="${color}" transform="translate(0, -3)"/>
    </svg>
  `;

  return L.divIcon({
    className: "custom-car-icon", // Clase vacía para evitar estilos default cuadrados
    html: svgHtml,
    iconSize: [40, 60],    // Tamaño del icono
    iconAnchor: [20, 60],  // La punta del pin (abajo al centro)
    popupAnchor: [0, -55]  // Donde sale el popup (arriba)
  });
};

export function LocationTracker() {
  const [center] = useState<[number, number]>([-27.366, -70.332]); // Copiapó

  const { data: locations = [] } = useQuery({
    queryKey: ["vehicle-locations"],
    queryFn: async () => {
      const res = await fetch("/api/vehicle-locations");
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 2000, // Actualización rápida (2s)
  });

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden border shadow-sm relative z-0">
      <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {locations.map((loc: any) => (
          <Marker 
            key={loc.vehicleId} 
            position={[loc.lat, loc.lng]} 
            // 🟢 USAMOS EL GENERADOR DE ICONO DE AUTO
            icon={getCarIcon(loc.isPaid)}
          >
            <Popup>
              <div className="space-y-2 min-w-[200px]">
                <h3 className="font-bold text-lg">{loc.driverName || "Conductor"}</h3>
                
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Vehículo:</span>
                  <span className="font-medium">{loc.model || "Taxi"}</span>
                  
                  <span className="text-muted-foreground">Patente:</span>
                  <span className="font-mono bg-zinc-100 px-1 rounded dark:bg-zinc-800">{loc.plate}</span>
                  
                  {/* Etiqueta de Estado */}
                  <span className="text-muted-foreground">Estado Hoja:</span>
                  <span>
                    {loc.isPaid ? (
                      <Badge className="bg-green-500 hover:bg-green-600">Pagado</Badge>
                    ) : (
                      <Badge variant="destructive">Pendiente</Badge>
                    )}
                  </span>
                  
                  <span className="text-muted-foreground">Velocidad:</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {Math.round(loc.speed || 0)} km/h
                  </span>
                </div>
                
                <div className="text-xs text-muted-foreground pt-2 border-t mt-2">
                  Última señal: {new Date(loc.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}