import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { VehicleLocation } from "@shared/schema";
import { Loader2, Navigation } from "lucide-react";

// ÍCONO DE TAXI PERSONALIZADO
const createCarIcon = (status: string) => {
  const color = status === 'active' ? '#eab308' : '#64748b'; // Amarillo o Gris
  return L.divIcon({
    className: 'custom-car-icon',
    html: `
      <div style="
        background-color: ${color};
        width: 32px; height: 32px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center;
        font-size: 16px;
      ">🚕</div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// BOTÓN PARA RE-CENTRAR (Para no obligar al usuario)
function RecenterButton({ locations }: { locations: VehicleLocation[] }) {
  const map = useMap();
  const handleCenter = () => {
    if (locations.length > 0) map.flyTo([locations[0].lat, locations[0].lng], 15);
    else map.flyTo([-27.3665, -70.3323], 13);
  };
  return (
    <div className="leaflet-bottom leaflet-right">
      <div className="leaflet-control leaflet-bar">
        <button onClick={handleCenter} className="bg-white p-2 hover:bg-gray-100 flex items-center justify-center w-8 h-8 cursor-pointer">
          <Navigation className="h-4 w-4 text-slate-700" />
        </button>
      </div>
    </div>
  );
}

export default function FleetMap() {
  const { data: locations, isLoading } = useQuery<VehicleLocation[]>({
    queryKey: ["/api/vehicle-locations"],
    refetchInterval: 3000, // Actualizar mapa cada 3s
  });

  const defaultCenter: [number, number] = [-27.3665, -70.3323];

  if (isLoading) return <div className="h-[400px] flex items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="h-[500px] w-full rounded-md border overflow-hidden relative z-0">
      <MapContainer center={defaultCenter} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer 
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
        />
        {locations?.map((vehicle) => (
          <Marker key={vehicle.vehicleId} position={[vehicle.lat, vehicle.lng]} icon={createCarIcon(vehicle.status)}>
            <Popup>
              <div className="text-center">
                <strong className="block text-lg">{vehicle.plate}</strong>
                <span className="text-xs text-gray-500">{Math.round(vehicle.speed || 0)} km/h</span>
              </div>
            </Popup>
          </Marker>
        ))}
        <RecenterButton locations={locations || []} />
      </MapContainer>
    </div>
  );
}