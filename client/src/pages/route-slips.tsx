import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, FileText, AlertTriangle } from "lucide-react";
import type { RouteSlip, InsertRouteSlip, Driver, Vehicle } from "@shared/schema";

export default function RouteSlips() {
  const queryClientLocal = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<InsertRouteSlip>({
    date: new Date().toISOString().split('T')[0],
    vehicleId: "",
    driverId: "",
    signature: "",
    paymentStatus: "pending",
    notes: "",
  });
  const { toast } = useToast();

  const { data: routeSlips, isLoading } = useQuery<RouteSlip[]>({
    queryKey: ["/api/route-slips"],
  });

  const { data: drivers } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertRouteSlip) => apiRequest("POST", "/api/route-slips", data),
    onSuccess: (created) => {
      // cerrar diálogo / limpiar formulario
      setIsDialogOpen(false);
      resetForm();

      // mostrar notificación (si la API marca duplicado, respetar)
      if ((created as any).isDuplicate) {
        toast({
          title: "Advertencia: Hoja de ruta duplicada",
          description: "Ya existe una hoja de ruta para este conductor, vehículo y fecha",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Hoja de ruta creada",
          description: "La hoja de ruta ha sido registrada exitosamente",
        });
      }

      // actualizar caché optimista (si la API devuelve el objeto creado)
      try {
        queryClientLocal.setQueryData<RouteSlip[] | undefined>(["/api/route-slips"], (old) =>
          old ? [...old, created as RouteSlip] : [created as RouteSlip]
        );
      } catch {
        /* noop */
      }

      // asegurar refetch desde el servidor
      queryClientLocal.invalidateQueries({ queryKey: ["/api/route-slips"] });
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
      date: new Date().toISOString().split('T')[0],
      vehicleId: "",
      driverId: "",
      signature: "",
      paymentStatus: "pending",
      notes: "",
    });
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

  const getDriverName = (driverId: string) => {
    return drivers?.find(d => d.id === driverId)?.name || "Desconocido";
  };

  const getVehiclePlate = (vehicleId: string) => {
    return vehicles?.find(v => v.id === vehicleId)?.plate || "Desconocido";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Hojas de Ruta</h1>
          <p className="text-sm text-muted-foreground">
            Registra y gestiona las hojas de ruta diarias
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-route-slip">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Hoja de Ruta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Nueva Hoja de Ruta</DialogTitle>
                <DialogDescription>
                  Completa los datos para registrar una nueva hoja de ruta
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
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
                    data-testid="input-route-slip-date"
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
                    <SelectTrigger id="driverId" data-testid="select-route-slip-driver">
                      <SelectValue placeholder="Selecciona un conductor" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers?.filter(d => d.status === "active").map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name} - {driver.rut}
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
                    <SelectTrigger id="vehicleId" data-testid="select-route-slip-vehicle">
                      <SelectValue placeholder="Selecciona un vehículo" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles?.filter(v => v.status === "active").map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.plate} - {vehicle.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signature">Firma/Timbre</Label>
                  <Input
                    id="signature"
                    value={formData.signature}
                    onChange={(e) =>
                      setFormData({ ...formData, signature: e.target.value })
                    }
                    placeholder="Opcional"
                    data-testid="input-route-slip-signature"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentStatus">Estado de Pago</Label>
                  <Select
                    value={formData.paymentStatus}
                    onValueChange={(value) =>
                      setFormData({ ...formData, paymentStatus: value })
                    }
                  >
                    <SelectTrigger id="paymentStatus" data-testid="select-route-slip-payment-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="completed">Completado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Observaciones adicionales (opcional)"
                    data-testid="input-route-slip-notes"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" data-testid="button-save-route-slip">
                  Crear Hoja de Ruta
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registro de Hojas de Ruta</CardTitle>
          <CardDescription>
            {routeSlips?.length || 0} hojas de ruta registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !routeSlips || routeSlips.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No hay hojas de ruta</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Comienza registrando la primera hoja de ruta
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Conductor</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Estado de Pago</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routeSlips.map((slip) => (
                    <TableRow key={slip.id} data-testid={`row-route-slip-${slip.id}`}>
                      <TableCell>
                        {new Date(slip.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{getDriverName(slip.driverId)}</TableCell>
                      <TableCell>
                        <span className="font-mono font-semibold">
                          {getVehiclePlate(slip.vehicleId)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            slip.paymentStatus === "completed" ? "default" : "secondary"
                          }
                        >
                          {slip.paymentStatus === "completed" ? "Completado" : "Pendiente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {slip.isDuplicate ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Duplicada
                          </Badge>
                        ) : (
                          <Badge variant="outline">Normal</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {slip.notes || "-"}
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
