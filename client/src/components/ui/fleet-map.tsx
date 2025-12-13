import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";

// Configuración de iconos (Verde para pagado, Rojo para deuda)
const iconPaid = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const iconUnpaid = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const center: [number, number] = [-27.3668, -70.3319]; // Copiapó (o ajusta a Santiago)

function SetViewOnMount({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center, 13); }, [map, center]);
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
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    fetchFleet();
    const interval = setInterval(fetchFleet, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-gray-200 relative z-0">
      <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
        <SetViewOnMount center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
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
                <div className="text-sm font-sans">
                  <strong className="block text-base">{v.model}</strong>
                  <span className="text-xs bg-gray-100 px-1 rounded">{v.plate}</span>
                  <div className="mt-2">
                    <span className="text-xs text-gray-400 uppercase font-bold">Conductor:</span>
                    <p>{v.driverName}</p>
                  </div>
                  <div className="mt-1">
                    {v.isPaid ? (
                      <span className="text-green-700 font-bold text-xs bg-green-100 px-2 py-1 rounded-full">PAGADA</span>
                    ) : (
                      <span className="text-red-700 font-bold text-xs bg-red-100 px-2 py-1 rounded-full">NO PAGADA</span>
                    )}
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