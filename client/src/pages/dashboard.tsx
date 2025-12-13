import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Users, DollarSign, CheckCircle2, Navigation, Loader2 } from "lucide-react";
import type { VehicleLocation, Driver, Vehicle, Payment } from "@shared/schema";

// Icono del auto para el mapa
const vehicleIcon = new Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3097/3097180.png", // Icono genérico de auto azul
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

const COPIAPO_CENTER: [number, number] = [-27.3668, -70.3319];

function SetViewOnMount({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

export default function Dashboard() {
  // 🟢 ESTA ES LA PARTE IMPORTANTE: Consultar la API cada 2 segundos
  const { data: vehicleLocations = [], isLoading: loadingLocs } = useQuery<VehicleLocation[]>({
    queryKey: ["/api/vehicle-locations"],
    queryFn: async () => {
      const res = await fetch("/api/vehicle-locations");
      if (!res.ok) throw new Error("Error fetching locations");
      return res.json();
    },
    refetchInterval: 3000, // Actualizar cada 3 segundos
  });

  const { data: drivers } = useQuery<Driver[]>({ queryKey: ["/api/drivers"] });
  const { data: vehicles } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });
  const { data: payments } = useQuery<Payment[]>({ queryKey: ["/api/payments"] });

  // Cálculos simples para las tarjetas
  const activeDrivers = drivers?.filter((d) => d.status === "active").length || 0;
  const totalVehicles = vehicles?.length || 0;
  const pendingPayments = payments?.filter((p) => p.status === "pending").length || 0;
  
  // Calcular cumplimiento
  const totalP = payments?.length || 0;
  const compliance = totalP > 0 ? Math.round(((totalP - pendingPayments) / totalP) * 100) : 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel de Control</h1>
        <p className="text-muted-foreground">Monitoreo de flota en tiempo real</p>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flota Total</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVehicles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conductores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDrivers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos Pendientes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPayments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumplimiento</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{compliance}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Mapa en Tiempo Real */}
      <Card className="col-span-4 border-blue-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-blue-600" />
            Mapa en Tiempo Real
            {loadingLocs && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[500px] w-full relative z-0">
            <MapContainer
              center={COPIAPO_CENTER}
              zoom={14}
              style={{ height: "100%", width: "100%", borderRadius: "0 0 0.5rem 0.5rem" }}
            >
              <SetViewOnMount center={COPIAPO_CENTER} zoom={14} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {vehicleLocations.map((location) => (
                <Marker
                  key={location.vehicleId}
                  position={[location.lat, location.lng]}
                  icon={vehicleIcon}
                >
                  <Popup>
                    <div className="text-sm font-sans">
                      <p className="font-bold text-base mb-1">{location.plate}</p>
                      <p className="text-gray-600 text-xs">
                        Actualizado: {new Date(location.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
            
            {/* Mensaje flotante si no hay datos */}
            {vehicleLocations.length === 0 && (
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/90 px-4 py-2 rounded-full shadow-lg text-sm text-gray-600 z-[1000]">
                Esperando señal GPS de conductores activos...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}