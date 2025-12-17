import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge"; 

// --- 1. FUNCIÓN PARA CREAR EL ICONO PERSONALIZADO (SVG) ---
// Esta función dibuja el icono exactamente como en tu foto:
// Pin de color -> Círculo Blanco al centro -> Auto del mismo color adentro
const createCustomIcon = (isPaid: boolean) => {
  // Definimos el color según el estado
  const color = isPaid ? "#22c55e" : "#ef4444"; // Verde (#22c55e) o Rojo (#ef4444)

  // Creamos el dibujo vectorial (SVG)
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="45" height="55">
      <path d="M192 512c-15 0-25-10-25-10S0 300 0 192C0 86 86 0 192 0s192 86 192 192c0 108-167 310-167 310s-10 10-25 10z" fill="rgba(0,0,0,0.3)" transform="translate(3, 3)"/>
      
      <path d="M192 512c-15 0-25-10-25-10S0 300 0 192C0 86 86 0 192 0s192 86 192 192c0 108-167 310-167 310s-10 10-25 10z" fill="${color}"/>
      
      <circle cx="192" cy="192" r="120" fill="white"/>
      
      <path d="M112 144c-17.7 0-32 14.3-32 32l0 32-12.2 0c-15.3 0-29.2 8.7-35.8 22.4l-15 31.2C9.6 277.1 1.6 295.6 0 315.6c0 1.2 0 2.4 0 3.6l0 4.7c0 11.5 8.1 21.5 19.1 24.3l9.8 2.5c4.7 1.2 9.5 1.8 14.4 1.8l16 0 0 35.5c0 15.2 12.3 27.5 27.5 27.5l2 0c15.2 0 27.5-12.3 27.5-27.5l0-16.5 151.5 0 0 16.5c0 15.2 12.3 27.5 27.5 27.5l2 0c15.2 0 27.5-12.3 27.5-27.5l0-35.5 16 0c4.9 0 9.7-.6 14.4-1.8l9.8-2.5c11-2.8 19.1-12.9 19.1-24.3l0-4.7c0-1.2 0-2.4 0-3.6c-1.6-20-9.6-38.5-23-53.9l-15-31.2c-6.6-13.7-20.5-22.4-35.8-22.4l-12.2 0 0-32c0-17.7-14.3-32-32-32l-160 0zM80 320c8.8 0 16 7.2 16 16s-7.2 16-16 16s-16-7.2-16-16s7.2-16 16-16zm224 0c8.8 0 16 7.2 16 16s-7.2 16-16 16s-16-7.2-16-16s7.2-16 16-16z" fill="${color}" transform="translate(35, 30) scale(0.85)"/>
    </svg>
  `;

  return L.divIcon({
    className: "", // Sin clases extra para no afectar el SVG
    html: svgIcon,
    iconSize: [45, 55],    // Tamaño del icono
    iconAnchor: [22.5, 55], // La punta del pin (abajo al centro)
    popupAnchor: [0, -50]   // Donde se abre la ventanita (arriba)
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
    refetchInterval: 2000, 
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
            // 🟢 AQUÍ LLAMAMOS A LA FUNCIÓN QUE DIBUJA EL ICONO SEGÚN EL PAGO
            icon={createCustomIcon(loc.isPaid)}
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