import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { RouteSlip, Driver, Vehicle } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, CheckCircle, AlertCircle, Info } from "lucide-react";
// IMPORTANTE: Importamos el diálogo nuevo
import RouteSlipDialog from "@/components/route-slips/route-slip-dialog";

export default function RouteSlips() {
  const { user } = useAuth();

  const { data: routeSlips, isLoading: isLoadingSlips } = useQuery<RouteSlip[]>({
    queryKey: ["/api/route-slips"],
  });

  const { data: drivers } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const getDriverName = (id: string) => {
    return drivers?.find((d) => d.id === id)?.name || "Desconocido";
  };

  const getVehiclePlate = (id: string) => {
    return vehicles?.find((v) => v.id === id)?.plate || "Desconocido";
  };

  if (isLoadingSlips) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  // --- FILTRO DE SEGURIDAD Y PRIVACIDAD ---
  const displayedSlips = (routeSlips || []).filter((slip) => {
    // 1. Si el usuario es Admin, Operador o Finanzas, ve TODO.
    if (["admin", "operator", "finance"].includes(user?.role || "")) {
      return true;
    }
    // 2. Si es Conductor, SOLO ve las hojas asignadas a su ID.
    return slip.driverId === user?.id; 
  });

  // Solo admins y operadores pueden crear hojas nuevas
  const canCreate = ["admin", "operator"].includes(user?.role || "");

  return (
    <div className="space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hojas de Ruta</h1>
          <p className="text-muted-foreground">
            {user?.role === "driver" 
              ? "Tus hojas de ruta asignadas" 
              : "Historial completo de la flota"}
          </p>
        </div>
        {/* BOTÓN NUEVO AQUÍ: Se muestra solo si tiene permiso */}
        {canCreate && <RouteSlipDialog />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Registros
          </CardTitle>
        </CardHeader>
        <CardContent>
          {displayedSlips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
              <Info className="h-10 w-10 text-gray-300" />
              <p>No tienes hojas de ruta registradas.</p>
              {user?.role === "driver" && (
                <p className="text-xs text-gray-400 max-w-xs text-center">
                  Si crees que esto es un error, contacta al administrador.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Conductor</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Estado Pago</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedSlips.map((slip) => (
                    <TableRow key={slip.id}>
                      <TableCell className="font-medium">
                        {slip.date}
                        {slip.isDuplicate && (
                          <Badge variant="destructive" className="ml-2 text-[10px]">DUPLICADO</Badge>
                        )}
                      </TableCell>
                      <TableCell>{getDriverName(slip.driverId)}</TableCell>
                      <TableCell>{getVehiclePlate(slip.vehicleId)}</TableCell>
                      <TableCell>
                        {slip.paymentStatus === "paid" ? (
                          <Badge className="bg-green-500 hover:bg-green-600 flex w-fit items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Pagado
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="flex w-fit items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Pendiente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${(slip.totalAmount || 0).toLocaleString("es-CL")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}