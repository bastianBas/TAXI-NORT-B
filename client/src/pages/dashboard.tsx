import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  Car, 
  Activity, 
  MapPin,
  TrendingUp
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationTracker } from "@/components/location-tracker"; // Asegúrate que esta ruta coincida con tu archivo

export default function Dashboard() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Limpieza inteligente: Solo invalidamos el GPS al entrar para forzar actualización inmediata
    // pero mantenemos los otros datos en caché si ya existen.
    queryClient.invalidateQueries({ queryKey: ["vehicle-locations"] });
  }, []);

  // 1. OPTIMIZACIÓN DE VELOCIDAD
  // Agregamos 'staleTime': Los datos de conductores no cambian cada segundo.
  // Esto evita que la página se congele cargando cosas innecesarias.
  const { data: drivers = [] } = useQuery({ 
    queryKey: ["drivers"], 
    queryFn: () => fetch("/api/drivers").then(res => res.json()),
    staleTime: 1000 * 60 * 5 // 5 minutos de memoria caché
  });

  const { data: vehicles = [] } = useQuery({ 
    queryKey: ["vehicles"], 
    queryFn: () => fetch("/api/vehicles").then(res => res.json()),
    staleTime: 1000 * 60 * 5 // 5 minutos de memoria caché
  });

  // El GPS sí necesita ser rápido
  const { data: activeLocations = [] } = useQuery({
    queryKey: ["vehicle-locations"],
    queryFn: () => fetch("/api/vehicle-locations").then(res => res.json()),
    refetchInterval: 5000 // Actualiza cada 5 segundos
  });

  return (
    <div className="space-y-6">
      {/* TÍTULO */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Panel de Control
        </h1>
        <p className="text-muted-foreground">
          Monitoreo en tiempo real y estadísticas de flota.
        </p>
      </div>

      {/* TARJETAS DE RESUMEN (KPIs) - DISEÑO MEJORADO */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        {/* TARJETA 1: CONDUCTORES */}
        <Card className="border-l-4 border-l-blue-500 shadow-sm dark:bg-zinc-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conductores
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{drivers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Registrados activos
            </p>
          </CardContent>
        </Card>

        {/* TARJETA 2: VEHÍCULOS */}
        <Card className="border-l-4 border-l-purple-500 shadow-sm dark:bg-zinc-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Flota Total
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Car className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{vehicles.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Vehículos habilitados
            </p>
          </CardContent>
        </Card>

        {/* TARJETA 3: GPS EN VIVO (DISEÑO DESTACADO) */}
        <Card className="border-l-4 border-l-green-500 shadow-md bg-gradient-to-br from-white to-green-50 dark:from-zinc-900 dark:to-zinc-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-green-700 dark:text-green-400 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              EN RUTA AHORA
            </CardTitle>
            <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 dark:text-green-100">
              {activeLocations.length}
            </div>
            <p className="text-xs font-medium text-green-600 dark:text-green-400 mt-1">
              Transmitiendo GPS
            </p>
          </CardContent>
        </Card>

        {/* TARJETA 4: COBERTURA */}
        <Card className="border-l-4 border-l-orange-500 shadow-sm dark:bg-zinc-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Zona Operativa
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">Copiapó</div>
            <p className="text-xs text-muted-foreground mt-1">
              Región de Atacama
            </p>
          </CardContent>
        </Card>
      </div>

      {/* MAPA EN TIEMPO REAL */}
      <div className="grid gap-4 md:grid-cols-1">
        <Card className="col-span-1 overflow-hidden border shadow-md dark:border-zinc-800">
          <CardHeader className="bg-muted/30 p-4 border-b dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                Mapa de Flota en Vivo
              </CardTitle>
              <div className="text-xs text-muted-foreground bg-background px-2 py-1 rounded border">
                Actualización: 5s
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Contenedor del mapa con altura fija */}
            <div className="h-[500px] w-full relative z-0">
              <LocationTracker />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}