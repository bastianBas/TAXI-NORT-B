import { useEffect, useState, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// 🟢 ÍCONO DE PIN CON AUTO (Diseño exacto del documento)
const carIconSvg = (color: string) => `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
  <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
    <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="rgba(0,0,0,0.3)"/>
  </filter>
  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" 
        fill="${color}" stroke="white" stroke-width="1" filter="url(#shadow)"/>
  <circle cx="12" cy="9" r="3.5" fill="white" opacity="0.2"/>
  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" 
        fill="white" transform="translate(0, 1) scale(0.85) transform-origin(12 9)"/>
</svg>
`;

const createCarIcon = (color: string) => L.divIcon({
  html: carIconSvg(color),
  className: 'custom-car-pin',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

const iconPaid = createCarIcon('#10B981');   // Verde
const iconUnpaid = createCarIcon('#EF4444'); // Rojo
const COPIAPO_CENTER: [number, number] = [-27.3668, -70.3319];

function ViewHandler({ locations, defaultCenter }: { locations: any[], defaultCenter: [number, number] }) {
  const map = useMap();
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (locations.length > 0) {
      const first = locations[0];
      const lat = Number(first.lat);
      const lng = Number(first.lng);
      
      // Solo centrar automáticamente la PRIMERA vez para no molestar la navegación
      if (!hasInitializedRef.current && !isNaN(lat) && !isNaN(lng)) {
        map.setView([lat, lng], 15);
        hasInitializedRef.current = true;
      }
    } else if (!hasInitializedRef.current) {
      map.setView(defaultCenter, 12);
      hasInitializedRef.current = true;
    }
  }, [map, locations, defaultCenter]);
  
  return null;
}

export default function FleetMap() {
  const [vehicles, setVehicles] = useState<any[]>([]);

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

  useEffect(() => {
    fetchFleet(); // 🟢 Llamada inmediata (Según análisis del documento)
    const interval = setInterval(fetchFleet, 1000); // 🟢 1 Segundo para fluidez (Según análisis)
    return () => clearInterval(interval);
  }, []);

  const initialCenter = useMemo(() => {
    if (vehicles.length > 0) {
      const f = vehicles[0];
      return [Number(f.lat), Number(f.lng)] as [number, number];
    }
    return COPIAPO_CENTER;
  }, [vehicles]);

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm relative z-0">
      <MapContainer center={initialCenter} zoom={12} style={{ height: "500px", width: "100%" }}>
        <ViewHandler locations={vehicles} defaultCenter={COPIAPO_CENTER} />
        
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {vehicles.map((v) => {
          const lat = Number(v.lat);
          const lng = Number(v.lng);
          const speedKmH = Math.round((v.speed || 0));

          if (isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker 
              key={v.vehicleId} 
              position={[lat, lng]} 
              icon={v.isPaid ? iconPaid : iconUnpaid}
            >
              <Popup>
                <div className="min-w-[200px] p-2 font-sans text-sm">
                  <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1 items-start">
                    <span className="font-bold text-gray-600">Conductor:</span>
                    <span className="font-medium text-black break-words leading-tight">
                      {v.driverName}
                    </span>
                    <span className="font-bold text-gray-600">Vehículo:</span>
                    <span className="font-medium text-black">{v.plate}</span>
                    <span className="font-bold text-gray-600">Estado:</span>
                    <span>
                      {v.isPaid ? (
                        <span className="text-green-700 font-bold bg-green-100 px-1.5 py-0.5 rounded text-xs">PAGADO</span>
                      ) : (
                        <span className="text-red-700 font-bold bg-red-100 px-1.5 py-0.5 rounded text-xs">NO PAGADA</span>
                      )}
                    </span>
                    <span className="font-bold text-gray-600">Velocidad:</span>
                    <span className="font-bold text-blue-600">{speedKmH} km/h</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-full text-xs font-semibold shadow-md z-[1000] flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        En Vivo ({vehicles.length})
      </div>
    </div>
  );
}