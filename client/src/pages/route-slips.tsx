import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { RouteSlip, Driver, Vehicle } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Info, Clock, CheckCircle, AlertCircle, DollarSign } from "lucide-react";
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

  const getDriverInfo = (id: string) => {
    const d = drivers?.find((d) => d.id === id);
    return d ? d.name : "Desconocido";
  };

  const getVehicleInfo = (id: string) => {
    const v = vehicles?.find((v) => v.id === id);
    return v ? v.plate : "Desconocido";
  };

  if (isLoadingSlips) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  const displayedSlips = (routeSlips || []).filter((slip) => {
    if (["admin", "operator", "finance"].includes(user?.role || "")) return true;
    return slip.driverId === user?.id; 
  });

  const canCreate = ["admin", "operator"].includes(user?.role || "");

  return (
    <div className="space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Control Diario</h1>
          <p className="text-muted-foreground">
            Bitácora de servicios y estado de pagos.
          </p>
        </div>
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
              <p>No hay controles diarios registrados.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Conductor</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Horario</TableHead>
                    <TableHead>Estado Pago</TableHead> {/* NUEVA COLUMNA */}
                    <TableHead>Firma</TableHead>
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
                      <TableCell>{getDriverInfo(slip.driverId)}</TableCell>
                      <TableCell>{getVehicleInfo(slip.vehicleId)}</TableCell>
                      
                      {/* COLUMNA HORARIO */}
                      <TableCell className="font-mono text-sm">
                         <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1 text-xs">
                                <Clock className="h-3 w-3 text-muted-foreground" /> {slip.startTime} - {slip.endTime}
                            </span>
                         </div>
                      </TableCell>

                      {/* COLUMNA ESTADO DE PAGO (NUEVO) */}
                      <TableCell>
                        {slip.paymentStatus === "paid" ? (
                          <Badge className="bg-green-600 hover:bg-green-700 flex w-fit items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Pagado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600 flex w-fit items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Pendiente
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                         {slip.signatureUrl ? (
                           <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                             Firmado
                           </Badge>
                         ) : (
                           <span className="text-muted-foreground text-xs">-</span>
                         )}
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