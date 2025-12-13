import { useAuth } from "@/lib/auth";
import { FleetMap } from "@/components/ui/fleet-map"; // 🟢 Importamos el mapa desde su archivo
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* 1. Encabezado de la página */}
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      {/* 2. Sección del Mapa */}
      <div className="grid gap-4 grid-cols-1">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Mapa de Flota en Tiempo Real</CardTitle>
          </CardHeader>
          <CardContent className="pl-2 pr-2">
            {/* Aquí se renderiza el mapa que creamos en el otro archivo */}
            <FleetMap />
          </CardContent>
        </Card>
      </div>

      {/* (Opcional) Puedes agregar más tarjetas o estadísticas aquí abajo si quieres */}
    </div>
  );
}