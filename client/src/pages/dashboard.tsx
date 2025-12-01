import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Users, DollarSign, CheckCircle2, Navigation } from "lucide-react";
import type { VehicleLocation, Driver, Vehicle, Payment } from "@shared/schema";

const vehicleIcon = new Icon({
  iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='%232563eb'%3E%3Cpath d='M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z'/%3E%3C/svg%3E",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
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
  const [vehicleLocations, setVehicleLocations] = useState<VehicleLocation[]>([]);

  const { data: drivers } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: payments } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "gps-update") {
        setVehicleLocations(data.locations);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const activeDrivers = drivers?.filter(d => d.status === "active").length || 0;
  const totalVehicles = vehicles?.length || 0;
  const pendingPayments = payments?.filter(p => p.status === "pending").length || 0;
  const totalPayments = payments?.length || 0;
  const compliancePercentage = totalPayments > 0 
    ? Math.round(((totalPayments - pendingPayments) / totalPayments) * 100) 
    : 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Vista general del sistema de gestión de flotas
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vehículos</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-vehicles">{totalVehicles}</div>
            <p className="text-xs text-muted-foreground">
              Flota activa
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conductores Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-drivers">{activeDrivers}</div>
            <p className="text-xs text-muted-foreground">
              De {drivers?.length || 0} totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos Pendientes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-payments">{pendingPayments}</div>
            <p className="text-xs text-muted-foreground">
              De {totalPayments} totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumplimiento</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-compliance">{compliancePercentage}%</div>
            <p className="text-xs text-muted-foreground">
              Pagos completados
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Ubicación en Tiempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] rounded-md overflow-hidden border" data-testid="map-container">
            <MapContainer
              center={COPIAPO_CENTER}
              zoom={14}
              style={{ height: "100%", width: "100%" }}
            >
              <SetViewOnMount center={COPIAPO_CENTER} zoom={14} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {vehicleLocations.map((location) => (
                <Marker
                  key={location.vehicleId}
                  position={[location.lat, location.lng]}
                  icon={vehicleIcon}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold font-mono">{location.plate}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        Estado: {location.status}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Última actualización: {new Date(location.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          {vehicleLocations.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              Esperando datos GPS...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
