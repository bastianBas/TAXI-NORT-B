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
import { Plus, CreditCard, Upload, DollarSign } from "lucide-react";
import type { Payment, InsertPayment, Driver, Vehicle } from "@shared/schema";

export default function Payments() {
  const queryClientLocal = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<InsertPayment>({
    type: "daily",
    amount: 1800,
    driverId: "",
    vehicleId: "",
    date: new Date().toISOString().split('T')[0],
    proofOfPayment: "",
    status: "pending",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const { data: payments, isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  const { data: drivers } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertPayment) => {
      const formDataObj = new FormData();
      
      formDataObj.append("type", data.type);
      formDataObj.append("amount", data.amount.toString());
      formDataObj.append("driverId", data.driverId);
      formDataObj.append("vehicleId", data.vehicleId);
      formDataObj.append("date", data.date);
      
      // CORRECCIÓN: Usamos el operador ?? para asegurar un valor por defecto
      formDataObj.append("status", data.status ?? "pending");

      if (selectedFile) {
        formDataObj.append("file", selectedFile);
      }

      return apiRequestFormData("/api/payments", "POST", formDataObj);
    },
    onSuccess: (created) => {
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Pago registrado",
        description: "El pago ha sido registrado exitosamente",
      });

      queryClientLocal.invalidateQueries({ queryKey: ["/api/payments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      type: "daily",
      amount: 1800,
      driverId: "",
      vehicleId: "",
      date: new Date().toISOString().split('T')[0],
      proofOfPayment: "",
      status: "pending",
    });
    setSelectedFile(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleTypeChange = (value: string) => {
    const amount = value === "daily" ? 1800 : 43200;
    setFormData({ ...formData, type: value, amount });
  };

  const getDriverName = (driverId: string) => {
    return drivers?.find(d => d.id === driverId)?.name || "Desconocido";
  };

  const getVehiclePlate = (vehicleId: string) => {
    return vehicles?.find(v => v.id === vehicleId)?.plate || "Desconocido";
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
            Gestiona los pagos de conductores y vehículos
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-payment">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Pago
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Registrar Pago</DialogTitle>
                <DialogDescription>
                  Completa los datos para registrar un nuevo pago
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Pago</Label>
                  <Select
                    value={formData.type}
                    onValueChange={handleTypeChange}
                  >
                    <SelectTrigger id="type" data-testid="select-payment-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diario (CLP $1,800)</SelectItem>
                      <SelectItem value="monthly">Mensual (CLP $43,200)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Monto</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: parseInt(e.target.value) })
                    }
                    required
                    data-testid="input-payment-amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Fecha</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    required
                    data-testid="input-payment-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driverId">Conductor</Label>
                  <Select
                    value={formData.driverId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, driverId: value })
                    }
                  >
                    <SelectTrigger id="driverId" data-testid="select-payment-driver">
                      <SelectValue placeholder="Selecciona un conductor" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers?.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleId">Vehículo</Label>
                  <Select
                    value={formData.vehicleId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, vehicleId: value })
                    }
                  >
                    <SelectTrigger id="vehicleId" data-testid="select-payment-vehicle">
                      <SelectValue placeholder="Selecciona un vehículo" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles?.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.plate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proofOfPayment">Comprobante de Pago</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="proofOfPayment"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      data-testid="input-payment-proof"
                    />
                    {selectedFile && (
                      <Badge variant="outline" className="gap-1">
                        <Upload className="h-3 w-3" />
                        {selectedFile.name}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger id="status" data-testid="select-payment-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="completed">Completado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" data-testid="button-save-payment">
                  Registrar Pago
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
            <p className="text-xs text-muted-foreground">Registrados en el sistema</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments?.filter(p => p.status === "pending").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Por completar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments?.filter(p => p.status === "completed").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Procesados</p>
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !payments || payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No hay pagos</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Comienza registrando el primer pago
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Conductor</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Comprobante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                      <TableCell>
                        {new Date(payment.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {payment.type === "daily" ? "Diario" : "Mensual"}
                        </Badge>
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
                        <Badge
                          variant={
                            payment.status === "completed" ? "default" : "secondary"
                          }
                        >
                          {payment.status === "completed" ? "Completado" : "Pendiente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payment.proofOfPayment ? (
                          <Badge variant="outline" className="gap-1">
                            <Upload className="h-3 w-3" />
                            Adjunto
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sin comprobante</span>
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