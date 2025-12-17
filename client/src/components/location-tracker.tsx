import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge"; 

// FIX: Arreglo para que Leaflet encuentre las imágenes de los marcadores por defecto
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;


// --- DEFINICIÓN DE ICONOS USANDO TUS IMÁGENES ---
// Asegúrate de haber guardado 'car-red.png' y 'car-green.png' en la carpeta 'client/public/'

// 🔴 Icono ROJO (Pendiente)
const redTaxiIcon = new L.Icon({
  iconUrl: "/car-red.png", // Ruta a tu imagen en la carpeta public
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png", // Sombra genérica
  iconSize: [40, 50], // Tamaño ajustado para que se vea bien (puedes cambiarlo)
  iconAnchor: [20, 50], // Punto de anclaje (la punta del pin abajo al centro)
  popupAnchor: [0, -45], // Donde se abre el popup (arriba del icono)
  shadowSize: [50, 50]
});

// 🟢 Icono VERDE (Pagado)
const greenTaxiIcon = new L.Icon({
  iconUrl: "/car-green.png", // Ruta a tu imagen en la carpeta public
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [40, 50], // Tamaño ajustado
  iconAnchor: [20, 50],
  popupAnchor: [0, -45],
  shadowSize: [50, 50]
});


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
        
        {locations.map((loc: any) => {
          // 🟢 LÓGICA DE SELECCIÓN DE IMAGEN
          // Si está pagado, usa el icono verde; si no, el rojo.
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