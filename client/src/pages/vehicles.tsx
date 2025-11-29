import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
import { Plus, Pencil, Trash2, Truck as TruckIcon } from "lucide-react";
import type { Vehicle, InsertVehicle } from "@shared/schema";

export default function Vehicles() {
  const queryClientLocal = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState<InsertVehicle>({
    plate: "",
    model: "",
    color: "",
    ownerName: "",
    technicalReviewDate: "",
    status: "active",
  });
  const { toast } = useToast();

  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertVehicle) => apiRequest("POST", "/api/vehicles", data),
    onSuccess: (created) => {
      // cerrar diálogo / limpiar formulario
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Vehículo creado",
        description: "El vehículo ha sido agregado exitosamente",
      });

      // actualizar caché optimista si la API devuelve el objeto creado
      try {
        queryClientLocal.setQueryData<Vehicle[] | undefined>(["/api/vehicles"], (old) =>
          old ? [...old, created as Vehicle] : [created as Vehicle]
        );
      } catch {
        /* noop */
      }

      // asegurar refetch desde el servidor
      queryClientLocal.invalidateQueries({ queryKey: ["/api/vehicles"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertVehicle }) =>
      apiRequest("PUT", `/api/vehicles/${id}`, data),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Vehículo actualizado",
        description: "Los cambios han sido guardados",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/vehicles/${id}`),
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({
        title: "Vehículo eliminado",
        description: "El vehículo ha sido eliminado del sistema",
      });
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
      plate: "",
      model: "",
      color: "",
      ownerName: "",
      technicalReviewDate: "",
      status: "active",
    });
    setEditingVehicle(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      plate: vehicle.plate,
      model: vehicle.model,
      color: vehicle.color,
      ownerName: vehicle.ownerName,
      technicalReviewDate: vehicle.technicalReviewDate,
      status: vehicle.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este vehículo?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Vehículos</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona la flota de vehículos
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-vehicle">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Vehículo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingVehicle ? "Editar Vehículo" : "Nuevo Vehículo"}
                </DialogTitle>
                <DialogDescription>
                  {editingVehicle
                    ? "Modifica los datos del vehículo"
                    : "Completa los datos para agregar un nuevo vehículo"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="plate">Patente</Label>
                  <Input
                    id="plate"
                    value={formData.plate}
                    onChange={(e) =>
                      setFormData({ ...formData, plate: e.target.value.toUpperCase() })
                    }
                    placeholder="ABCD12"
                    required
                    data-testid="input-vehicle-plate"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Modelo</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                    placeholder="Toyota Corolla 2020"
                    required
                    data-testid="input-vehicle-model"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    placeholder="Blanco"
                    required
                    data-testid="input-vehicle-color"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Nombre del Propietario</Label>
                  <Input
                    id="ownerName"
                    value={formData.ownerName}
                    onChange={(e) =>
                      setFormData({ ...formData, ownerName: e.target.value })
                    }
                    required
                    data-testid="input-vehicle-owner"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="technicalReviewDate">Revisión Técnica</Label>
                  <Input
                    id="technicalReviewDate"
                    type="date"
                    value={formData.technicalReviewDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        technicalReviewDate: e.target.value,
                      })
                    }
                    required
                    data-testid="input-vehicle-review-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger id="status" data-testid="select-vehicle-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" data-testid="button-save-vehicle">
                  {editingVehicle ? "Guardar Cambios" : "Crear Vehículo"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Vehículos</CardTitle>
          <CardDescription>
            {vehicles?.length || 0} vehículos registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !vehicles || vehicles.length === 0 ? (
            <div className="text-center py-12">
              <TruckIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No hay vehículos</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Comienza agregando tu primer vehículo
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patente</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Propietario</TableHead>
                    <TableHead>Revisión Técnica</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id} data-testid={`row-vehicle-${vehicle.id}`}>
                      <TableCell>
                        <span className="font-mono font-semibold">{vehicle.plate}</span>
                      </TableCell>
                      <TableCell>{vehicle.model}</TableCell>
                      <TableCell>{vehicle.color}</TableCell>
                      <TableCell>{vehicle.ownerName}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {new Date(vehicle.technicalReviewDate).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={vehicle.status === "active" ? "default" : "secondary"}
                        >
                          {vehicle.status === "active" ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(vehicle)}
                            data-testid={`button-edit-vehicle-${vehicle.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(vehicle.id)}
                            data-testid={`button-delete-vehicle-${vehicle.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
    </div>
  );
}
