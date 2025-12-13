import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { RouteSlip, Driver, Vehicle } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Info, Clock, CheckCircle, AlertCircle, Pencil, DollarSign, Eye } from "lucide-react";
import RouteSlipDialog from "@/components/route-slips/route-slip-dialog";
import PdfViewerModal from "@/components/route-slips/pdf-viewer-modal"; 
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

// Interfaz auxiliar para el PDF (id es string)
interface PdfData {
  id: string; 
  date: string;
  driverName: string;
  vehiclePlate: string;
  startTime: string;
  endTime: string;
  paymentStatus: string;
  firma: string | null;
}

export default function RouteSlips() {
  const { user } = useAuth();
  
  // Estado para el modal de PDF
  const [selectedSlip, setSelectedSlip] = useState<PdfData | null>(null);
  const [isPdfOpen, setIsPdfOpen] = useState(false);

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

  // Función para abrir el PDF
  const handleOpenPdf = (slip: RouteSlip) => {
    const pdfData: PdfData = {
      id: slip.id, // slip.id ya es string en tu schema, así que esto es compatible
      date: slip.date,
      driverName: getDriverInfo(slip.driverId),
      vehiclePlate: getVehicleInfo(slip.vehicleId),
      startTime: slip.startTime,
      endTime: slip.endTime,
      paymentStatus: slip.paymentStatus,
      firma: slip.signatureUrl
    };
    setSelectedSlip(pdfData);
    setIsPdfOpen(true);
  };

  if (isLoadingSlips) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  // Identificar conductor
  const currentDriver = user?.role === "driver" 
    ? drivers?.find(d => d.userId === user.id) 
    : null;

  const displayedSlips = (routeSlips || []).filter((slip) => {
    if (["admin", "operator", "finance"].includes(user?.role || "")) return true;
    if (user?.role === "driver" && currentDriver) {
        return slip.driverId === currentDriver.id;
    }
    return false; 
  });

  const canEdit = ["admin", "operator"].includes(user?.role || "");
  const isDriver = user?.role === "driver";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Control Diario</h1>
          <p className="text-muted-foreground">Bitácora de servicios y estado de pagos.</p>
        </div>
        {canEdit && <RouteSlipDialog />}
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
              <p>No hay controles diarios registrados para ti.</p>
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
                    <TableHead>Estado Pago</TableHead>
                    <TableHead>Firma</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
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
                      
                      <TableCell className="font-mono text-sm">
                         <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1 text-xs">
                                <Clock className="h-3 w-3 text-muted-foreground" /> {slip.startTime} - {slip.endTime}
                            </span>
                         </div>
                      </TableCell>

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

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 items-center">
                          
                          {/* BOTÓN VER PDF (Para todos) */}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 gap-1 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                            onClick={() => handleOpenPdf(slip)}
                            title="Ver Hoja de Ruta"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* BOTÓN PAGAR (Solo Conductor) */}
                          {isDriver && slip.paymentStatus !== "paid" && (
                            <Link href="/payments">
                              <Button size="sm" variant="outline" className="h-8 gap-1 text-green-600 border-green-200 hover:bg-green-50">
                                <DollarSign className="h-3 w-3" />
                              </Button>
                            </Link>
                          )}

                          {/* EDITAR (Solo Admin/Op) */}
                          {canEdit && (
                            <RouteSlipDialog 
                              slipToEdit={slip} 
                              trigger={
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              }
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Modal Renderizado */}
      <PdfViewerModal 
        isOpen={isPdfOpen} 
        onClose={() => setIsPdfOpen(false)} 
        data={selectedSlip} 
      />
    </div>
  );
}