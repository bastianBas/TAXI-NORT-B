import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge"; // Importamos Badge desde la carpeta UI

// --- CORRECCIÓN DE ICONOS DE LEAFLET EN REACT ---
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Icono personalizado para taxis (Rojo)
const taxiIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export function LocationTracker() {
  // Centro inicial del mapa (Copiapó)
  // Puedes cambiar estas coordenadas si quieres que inicie en otro lado
  const [center] = useState<[number, number]>([-27.366, -70.332]); 

  // CONSULTA AL SERVIDOR (Solo lectura)
  // Busca las posiciones guardadas en la base de datos
  const { data: locations = [] } = useQuery({
    queryKey: ["vehicle-locations"],
    queryFn: async () => {
      const res = await fetch("/api/vehicle-locations");
      if (!res.ok) return [];
      return res.json();
    },
    // Refrescar automáticamente cada 5 segundos para ver movimiento
    refetchInterval: 5000, 
  });

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden border shadow-sm relative z-0">
      <MapContainer 
        center={center} 
        zoom={14} 
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {locations.map((loc: any) => (
          <Marker 
            key={loc.vehicleId} 
            position={[loc.lat, loc.lng]} 
            icon={taxiIcon}
          >
            <Popup>
              <div className="space-y-2 min-w-[200px]">
                <h3 className="font-bold text-lg">{loc.driverName || "Conductor"}</h3>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Vehículo:</span>
                  <span className="font-medium">{loc.model || "Taxi"}</span>
                  
                  <span className="text-muted-foreground">Patente:</span>
                  <span className="font-mono bg-zinc-100 px-1 rounded">{loc.plate}</span>
                  
                  <span className="text-muted-foreground">Estado:</span>
                  <span>
                    {loc.isPaid ? (
                      <Badge className="bg-green-500 hover:bg-green-600">Pagado</Badge>
                    ) : (
                      <Badge variant="destructive">No Pagado</Badge>
                    )}
                  </span>
                  
                  <span className="text-muted-foreground">Velocidad:</span>
                  <span className="font-medium text-blue-600">
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