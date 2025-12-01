import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { Plus, Pencil, Trash2, UserCircle } from "lucide-react";
import type { Driver, InsertDriver } from "@shared/schema";

export default function Drivers() {
  const queryClientLocal = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState<InsertDriver>({
    name: "",
    rut: "",
    phone: "",
    licenseNumber: "",
    status: "active",
  });
  const { toast } = useToast();

  const { data: drivers, isLoading } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const createMutation = useMutation({
   mutationFn: (data: InsertDriver) => apiRequest("POST", "/api/drivers", data),
   onSuccess: (created) => {
    // cerrar diálogo / limpiar formulario
     setIsDialogOpen(false);
     setFormData({ name: "", rut: "", phone: "", licenseNumber: "", status: "active" });
     toast({ title: "Conductor creado", description: "El conductor ha sido agregado exitosamente" });

     // actualizar caché optimista (si la API devuelve el objeto creado)
     try {
       queryClientLocal.setQueryData<Driver[] | undefined>(["/api/drivers"], (old) =>
         old ? [...old, created as Driver] : [created as Driver]
       );
     } catch {
       /* noop */
     }
 
     // garantizar recarga desde el servidor
     queryClientLocal.invalidateQueries({ queryKey: ["/api/drivers"] });
   },
   onError: (error: Error) => {
     toast({ title: "Error", description: error.message, variant: "destructive" });
   },
 });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertDriver }) =>
      apiRequest("PUT", `/api/drivers/${id}`, data),
    onSuccess: (updated: Driver | undefined) => {
      // si la API devuelve el objeto actualizado, reemplazarlo en la caché
      try {
        if (updated && (updated as any).id) {
          queryClientLocal.setQueryData<Driver[] | undefined>(["/api/drivers"], (old) =>
            old ? old.map(d => (d.id === (updated as Driver).id ? (updated as Driver) : d)) : [updated as Driver]
          );
        }
      } catch {
        /* noop */
      }

      // asegurar reconsulta desde el servidor por si hay más cambios
      queryClientLocal.invalidateQueries({ queryKey: ["/api/drivers"] });
       // cerrar diálogo y limpiar estado de edición
       setIsDialogOpen(false);
       resetForm();
       setEditingDriver(null);

      toast({ title: "Conductor actualizado" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/drivers/${id}`),
    onSuccess: (_data, id) => {
      // eliminar del caché inmediatamente
      try {
        queryClientLocal.setQueryData<Driver[] | undefined>(["/api/drivers"], (old) =>
          old ? old.filter(d => d.id !== id) : []
        );
      } catch {
        /* noop */
      }

      // asegurar reconsulta desde el servidor
      queryClientLocal.invalidateQueries({ queryKey: ["/api/drivers"] });

      toast({ title: "Conductor eliminado" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      rut: "",
      phone: "",
      licenseNumber: "",
      status: "active",
    });
    setEditingDriver(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDriver) {
      updateMutation.mutate({ id: editingDriver.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      rut: driver.rut,
      phone: driver.phone,
      licenseNumber: driver.licenseNumber,
      status: driver.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este conductor?")) {
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
          <h1 className="text-2xl font-semibold">Conductores</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona los conductores de la flota
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-driver">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Conductor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingDriver ? "Editar Conductor" : "Nuevo Conductor"}
                </DialogTitle>
                <DialogDescription>
                  {editingDriver
                    ? "Modifica los datos del conductor"
                    : "Completa los datos para agregar un nuevo conductor"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    data-testid="input-driver-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rut">RUT</Label>
                  <Input
                    id="rut"
                    value={formData.rut}
                    onChange={(e) =>
                      setFormData({ ...formData, rut: e.target.value })
                    }
                    placeholder="12.345.678-9"
                    required
                    data-testid="input-driver-rut"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+56 9 1234 5678"
                    required
                    data-testid="input-driver-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">Número de Licencia</Label>
                  <Input
                    id="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, licenseNumber: e.target.value })
                    }
                    required
                    data-testid="input-driver-license"
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
                    <SelectTrigger id="status" data-testid="select-driver-status">
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
                <Button type="submit" data-testid="button-save-driver">
                  {editingDriver ? "Guardar Cambios" : "Crear Conductor"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Conductores</CardTitle>
          <CardDescription>
            {drivers?.length || 0} conductores registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !drivers || drivers.length === 0 ? (
            <div className="text-center py-12">
              <UserCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No hay conductores</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Comienza agregando tu primer conductor
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>RUT</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Licencia</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
                    <TableRow key={driver.id} data-testid={`row-driver-${driver.id}`}>
                      <TableCell className="font-medium">{driver.name}</TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{driver.rut}</span>
                      </TableCell>
                      <TableCell>{driver.phone}</TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{driver.licenseNumber}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={driver.status === "active" ? "default" : "secondary"}
                        >
                          {driver.status === "active" ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(driver)}
                            data-testid={`button-edit-driver-${driver.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(driver.id)}
                            data-testid={`button-delete-driver-${driver.id}`}
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
