import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequestFormData } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth"; // 🟢 Importar useAuth
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
import { Plus, CreditCard, Upload, DollarSign, FileText, Loader2, Pencil, Eye, X, ExternalLink } from "lucide-react";
import type { Payment, InsertPayment, Driver, Vehicle, RouteSlip } from "@shared/schema";

export default function Payments() {
  const { user } = useAuth(); // 🟢 Obtenemos usuario logueado
  const queryClientLocal = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  
  // Estado para el visor de archivos
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  
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

  const canEdit = ["admin", "finance"].includes(user?.role || "");

  // 🟢 Si es conductor, buscamos su ficha de driver
  const myDriverInfo = user?.role === "driver" ? drivers?.find(d => d.userId === user.id) : null;

  // Efecto para cargar datos al editar
  useEffect(() => {
    if (isDialogOpen) {
      if (editingPayment) {
        setSelectedRouteSlipId(editingPayment.routeSlipId);
      } else {
        setSelectedRouteSlipId("");
      }
      setSelectedFile(null);
    }
  }, [isDialogOpen, editingPayment]);

  const mutation = useMutation({
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
      } else if (!editingPayment) {
         throw new Error("Debe adjuntar el comprobante de transferencia/depósito.");
      }

      if (editingPayment) {
        return apiRequestFormData(`/api/payments/${editingPayment.id}`, "PUT", formDataObj);
      } else {
        return apiRequestFormData("/api/payments", "POST", formDataObj);
      }
    },
    onSuccess: () => {
      setIsDialogOpen(false);
      setEditingPayment(null);
      toast({
        title: editingPayment ? "Pago Actualizado" : "Pago Registrado",
        description: "Los cambios han sido guardados exitosamente.",
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
    mutation.mutate();
  };

  const handleOpenCreate = () => {
    setEditingPayment(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setIsDialogOpen(true);
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
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  };

  // 🟢 FILTRADO INTELIGENTE DE HOJAS PENDIENTES
  const pendingRouteSlips = routeSlips?.filter(slip => {
    const isPending = slip.paymentStatus !== "paid";
    
    if (user?.role === "admin" || user?.role === "operator") {
        // Admin ve todas las pendientes
        return isPending;
    } else if (user?.role === "driver" && myDriverInfo) {
        // Conductor solo ve las SUYAS que estén pendientes
        return isPending && slip.driverId === myDriverInfo.id;
    }
    return false; // Otros roles no ven nada
  }) || [];

  // Filtramos hojas para el SELECT del Dialog (pendientes filtradas + la actual si se edita)
  const availableRouteSlips = pendingRouteSlips.concat(
    editingPayment && routeSlips ? routeSlips.filter(s => s.id === editingPayment.routeSlipId) : []
  );

  // 🟢 FILTRADO DE PAGOS REALIZADOS
  const myPayments = payments?.filter(payment => {
    if (user?.role === "admin" || user?.role === "finance") return true;
    if (user?.role === "driver" && myDriverInfo) return payment.driverId === myDriverInfo.id;
    return false;
  }) || [];

  const isPdf = (filename: string) => filename.toLowerCase().endsWith(".pdf");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pagos</h1>
          <p className="text-sm text-muted-foreground">Registro de pagos diarios de Hojas de Ruta</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            {/* 🟢 AQUÍ ESTÁ EL CAMBIO DE ESTILO */}
            <Button onClick={handleOpenCreate} className="bg-slate-900 text-white hover:bg-slate-800">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Pago
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingPayment ? "Editar Pago" : "Registrar Pago Diario"}</DialogTitle>
                <DialogDescription>
                  {editingPayment ? "Modifique la hoja de ruta o el comprobante." : "Seleccione la hoja de ruta que desea pagar. Valor fijo: $1.800."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                
                <div className="space-y-2">
                  <Label>Hoja de Ruta</Label>
                  <Select value={selectedRouteSlipId} onValueChange={setSelectedRouteSlipId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione hoja de ruta..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRouteSlips.length === 0 ? (
                        <SelectItem value="none" disabled>No tienes hojas pendientes</SelectItem>
                      ) : (
                        // Usamos un Set para evitar duplicados si se está editando
                        Array.from(new Set(availableRouteSlips.map(s => s.id))).map(id => {
                          const slip = availableRouteSlips.find(s => s.id === id)!;
                          return (
                            <SelectItem key={slip.id} value={slip.id}>
                                <span className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground"/> 
                                {getRouteSlipLabel(slip)} 
                                {editingPayment && slip.id === editingPayment.routeSlipId && " (Actual)"}
                                </span>
                            </SelectItem>
                          );
                        })
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
                  <Label htmlFor="proofOfPayment">Comprobante</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="proofOfPayment"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                    />
                    {selectedFile && (
                      <Badge variant="outline" className="gap-1"><Upload className="h-3 w-3" /> Nuevo</Badge>
                    )}
                  </div>
                  {editingPayment && !selectedFile && (
                    <p className="text-xs text-muted-foreground">Deje vacío para mantener el archivo actual.</p>
                  )}
                </div>

              </div>
              <DialogFooter>
                <Button type="submit" disabled={!selectedRouteSlipId || (!selectedFile && !editingPayment) || mutation.isPending}>
                  {mutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* --- VISOR DE ARCHIVOS --- */}
      <Dialog open={!!viewingFile} onOpenChange={(open) => !open && setViewingFile(null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Visualizador de Comprobante</DialogTitle>
            <DialogDescription>Documento adjunto al pago.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 bg-slate-100 rounded-md overflow-hidden flex items-center justify-center border relative">
             {viewingFile && (
                isPdf(viewingFile) ? (
                  <iframe 
                    src={`/uploads/${viewingFile}`} 
                    className="w-full h-full" 
                    title="Comprobante PDF"
                  />
                ) : (
                  <img 
                    src={`/uploads/${viewingFile}`} 
                    alt="Comprobante" 
                    className="max-w-full max-h-full object-contain" 
                  />
                )
             )}
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setViewingFile(null)}>Cerrar</Button>
             {viewingFile && (
               <Button asChild>
                 <a href={`/uploads/${viewingFile}`} target="_blank" rel="noreferrer">
                   <ExternalLink className="mr-2 h-4 w-4" /> Abrir en nueva pestaña
                 </a>
               </Button>
             )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{user?.role === 'driver' ? 'Mis Pagos' : 'Total Pagos'}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myPayments.length}</div>
            <p className="text-xs text-muted-foreground">Registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">{user?.role === 'driver' ? 'Mis Pendientes' : 'Hojas Pendientes'}</CardTitle>
             <FileText className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
             {/* 🟢 Muestra el conteo filtrado */}
             <div className="text-2xl font-bold">{pendingRouteSlips.length}</div>
             <p className="text-xs text-muted-foreground">Por pagar</p>
          </CardContent>
        </Card>
        {/* Ocultamos Recaudación Total al conductor */}
        {user?.role !== 'driver' && (
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
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{user?.role === 'driver' ? 'Mi Historial de Pagos' : 'Historial de Pagos'}</CardTitle>
          <CardDescription>{myPayments.length} pagos registrados</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : myPayments.length === 0 ? (
            <div className="text-center py-12"><CreditCard className="mx-auto h-12 w-12 text-muted-foreground/50" /><h3 className="mt-4 text-lg font-medium">No hay pagos registrados</h3></div>
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
                    {/* Solo Admin/Finance pueden editar */}
                    {canEdit && <TableHead className="w-[50px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.date}</TableCell>
                      <TableCell>{getDriverName(payment.driverId)}</TableCell>
                      <TableCell><span className="font-mono font-semibold">{getVehiclePlate(payment.vehicleId)}</span></TableCell>
                      <TableCell className="font-semibold">{formatAmount(payment.amount)}</TableCell>
                      <TableCell><Badge className="bg-green-600 hover:bg-green-700">Pagado</Badge></TableCell>
                      <TableCell>
                        {payment.proofOfPayment ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2 h-8 text-xs border-dashed"
                            onClick={() => setViewingFile(payment.proofOfPayment!)}
                          >
                            <Eye className="h-3 w-3" /> Ver Archivo
                          </Button>
                        ) : (<span className="text-muted-foreground text-sm">-</span>)}
                      </TableCell>
                      {canEdit && (
                      <TableCell>
                         <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(payment)}>
                           <Pencil className="h-4 w-4" />
                         </Button>
                      </TableCell>
                      )}
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