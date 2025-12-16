import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  Car, 
  Activity, 
  MapPin 
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationTracker } from "@/components/location-tracker";

export default function Dashboard() {
  const queryClient = useQueryClient();

  // 🟢 CORRECCIÓN CLAVE:
  // Al montar este componente (entrar al Dashboard), forzamos una limpieza y recarga
  // de las ubicaciones. Esto borra los puntos rojos viejos de la caché.
  useEffect(() => {
    queryClient.removeQueries({ queryKey: ["vehicle-locations"] });
    queryClient.invalidateQueries({ queryKey: ["vehicle-locations"] });
  }, []);

  // Consultas para las tarjetas de resumen (KPIs)
  const { data: drivers = [] } = useQuery({ 
    queryKey: ["drivers"], 
    queryFn: () => fetch("/api/drivers").then(res => res.json()) 
  });

  const { data: vehicles = [] } = useQuery({ 
    queryKey: ["vehicles"], 
    queryFn: () => fetch("/api/vehicles").then(res => res.json()) 
  });

  const { data: activeLocations = [] } = useQuery({
    queryKey: ["vehicle-locations"],
    queryFn: () => fetch("/api/vehicle-locations").then(res => res.json())
  });

  return (
    <div className="space-y-6">
      {/* TÍTULO */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Vista general de la flota y operaciones en tiempo real.
        </p>
      </div>

      {/* TARJETAS DE RESUMEN (KPIs) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conductores Totales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drivers.length}</div>
            <p className="text-xs text-muted-foreground">Registrados en plataforma</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vehículos Totales</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vehicles.length}</div>
            <p className="text-xs text-muted-foreground">Flota disponible</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Ruta Ahora</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLocations.length}</div>
            <p className="text-xs text-muted-foreground">Vehículos transmitiendo GPS</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cobertura</CardTitle>
            <MapPin className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Copiapó</div>
            <p className="text-xs text-muted-foreground">Zona principal</p>
          </CardContent>
        </Card>
      </div>

      {/* MAPA EN TIEMPO REAL */}
      <div className="grid gap-4 md:grid-cols-1">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Monitoreo de Flota en Vivo</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Contenedor del mapa con altura fija */}
            <div className="h-[500px] w-full rounded-b-lg overflow-hidden relative">
              <LocationTracker />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}