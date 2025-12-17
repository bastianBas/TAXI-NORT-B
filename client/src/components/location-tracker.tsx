import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge"; 

// Arreglo para que Leaflet encuentre los marcadores por defecto si hicieran falta
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;


// --- DEFINICIÓN DE ICONOS ---
// 🔴 Icono ROJO (Pendiente)
const redTaxiIcon = new L.Icon({
  // 🟢 CORRECCIÓN: La ruta empieza con '/'
  iconUrl: "/car-red.png", 
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [40, 50], // Ajusta este tamaño si se ven muy grandes o chicos
  iconAnchor: [20, 50], // La punta del pin
  popupAnchor: [0, -45], // Donde se abre el popup
  shadowSize: [50, 50]
});

// 🟢 Icono VERDE (Pagado)
const greenTaxiIcon = new L.Icon({
  // 🟢 CORRECCIÓN: La ruta empieza con '/'
  iconUrl: "/car-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [40, 50],
  iconAnchor: [20, 50],
  popupAnchor: [0, -45],
  shadowSize: [50, 50]
});


export function LocationTracker() {
  // Centro inicial del mapa (Copiapó)
  const [center] = useState<[number, number]>([-27.366, -70.332]); 

  const { data: locations = [] } = useQuery({
    queryKey: ["vehicle-locations"],
    queryFn: async () => {
      const res = await fetch("/api/vehicle-locations");
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 2000, // Actualización cada 2 segundos
  });

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden border shadow-sm relative z-0">
      <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {locations.map((loc: any) => {
          // Seleccionamos el icono según si está pagado o no
          const iconToUse = loc.isPaid ? greenTaxiIcon : redTaxiIcon;

          return (
            <Marker 
              key={loc.vehicleId} 
              position={[loc.lat, loc.lng]} 
              icon={iconToUse}
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
          );
        })}
      </MapContainer>
    </div>
  );
}