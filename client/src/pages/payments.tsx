import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequestFormData } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
// 🟢 CORRECCIÓN: Se agregó Loader2 a los imports
import { Plus, CreditCard, Upload, DollarSign, FileText, Loader2 } from "lucide-react";
import type { Payment, InsertPayment, Driver, Vehicle, RouteSlip } from "@shared/schema";

export default function Payments() {
  const queryClientLocal = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [selectedRouteSlipId, setSelectedRouteSlipId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const { data: payments, isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  const { data: routeSlips } = useQuery<RouteSlip[]>({
    queryKey: ["/api/route-slips"],
  });

  const { data: drivers } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const pendingRouteSlips = routeSlips?.filter(slip => slip.paymentStatus !== "paid") || [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const slip = routeSlips?.find(s => s.id === selectedRouteSlipId);
      if (!slip) throw new Error("Debe seleccionar una Hoja de Ruta válida.");

      const formDataObj = new FormData();
      formDataObj.append("routeSlipId", slip.id);
      formDataObj.append("driverId", slip.driverId);
      formDataObj.append("vehicleId", slip.vehicleId);
      formDataObj.append("date", slip.date);
      
      formDataObj.append("type", "daily");
      formDataObj.append("amount", "1800");
      formDataObj.append("status", "completed");

      if (selectedFile) {
        formDataObj.append("file", selectedFile);
      } else {
         throw new Error("Debe adjuntar el comprobante de transferencia/depósito.");
      }

      return apiRequestFormData("/api/payments", "POST", formDataObj);
    },
    onSuccess: () => {
      setIsDialogOpen(false);
      setSelectedRouteSlipId("");
      setSelectedFile(null);
      toast({
        title: "Pago registrado",
        description: "La hoja de ruta ha sido marcada como PAGADA.",
      });

      queryClientLocal.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClientLocal.invalidateQueries({ queryKey: ["/api/route-slips"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const getDriverName = (driverId: string) => drivers?.find(d => d.id === driverId)?.name || "Desconocido";
  const getVehiclePlate = (vehicleId: string) => vehicles?.find(v => v.id === vehicleId)?.plate || "Desconocido";

  const getRouteSlipLabel = (slip: RouteSlip) => {
     const driver = getDriverName(slip.driverId);
     return `${slip.date} - ${driver}`;
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pagos</h1>
          <p className="text-sm text-muted-foreground">
            Registro de pagos diarios de Hojas de Ruta
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-payment">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Pago
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Registrar Pago Diario</DialogTitle>
                <DialogDescription>
                  Seleccione la hoja de ruta que desea pagar. Valor fijo: $1.800.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                
                <div className="space-y-2">
                  <Label>Hoja de Ruta (Pendiente de Pago)</Label>
                  <Select value={selectedRouteSlipId} onValueChange={setSelectedRouteSlipId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione hoja de ruta..." />
                    </SelectTrigger>
                    <SelectContent>
                      {pendingRouteSlips.length === 0 ? (
                        <SelectItem value="none" disabled>No hay hojas pendientes</SelectItem>
                      ) : (
                        pendingRouteSlips.map((slip) => (
                          <SelectItem key={slip.id} value={slip.id}>
                            <span className="flex items-center gap-2">
                               <FileText className="h-4 w-4 text-muted-foreground"/> 
                               {getRouteSlipLabel(slip)}
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedRouteSlipId && (
                    <div className="p-3 bg-muted/50 rounded-md text-sm space-y-1">
                        <p><strong>Monto a Pagar:</strong> $1.800 (Diario)</p>
                        <p className="text-muted-foreground text-xs">El pago se vinculará automáticamente al conductor y vehículo de la hoja seleccionada.</p>
                    </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="proofOfPayment">Comprobante (Transferencia/Depósito)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="proofOfPayment"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                    />
                    {selectedFile && (
                      <Badge variant="outline" className="gap-1">
                        <Upload className="h-3 w-3" />
                        Adjunto
                      </Badge>
                    )}
                  </div>
                </div>

              </div>
              <DialogFooter>
                <Button type="submit" disabled={!selectedRouteSlipId || !selectedFile || createMutation.isPending}>
                  {createMutation.isPending ? "Procesando..." : "Confirmar Pago"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pagos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Hojas Pendientes</CardTitle>
             <FileText className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">{pendingRouteSlips.length}</div>
             <p className="text-xs text-muted-foreground">Por pagar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recaudación Total</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
               {formatAmount((payments?.length || 0) * 1800)}
            </div>
            <p className="text-xs text-muted-foreground">Estimada</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
          <CardDescription>
            {payments?.length || 0} pagos registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
               <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : !payments || payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No hay pagos registrados</h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha Hoja</TableHead>
                    <TableHead>Conductor</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Comprobante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {payment.date}
                      </TableCell>
                      <TableCell>{getDriverName(payment.driverId)}</TableCell>
                      <TableCell>
                        <span className="font-mono font-semibold">
                          {getVehiclePlate(payment.vehicleId)}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatAmount(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-600 hover:bg-green-700">
                           Pagado
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payment.proofOfPayment ? (
                          <Badge variant="outline" className="gap-1">
                            <Upload className="h-3 w-3" />
                            Ver Archivo
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
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