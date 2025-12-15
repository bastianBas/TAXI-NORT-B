import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequestJson } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Trash2, Car, User, FileText, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVehicleSchema, type Vehicle, type InsertVehicle } from "@shared/schema";
import { useState } from "react";

export default function Vehicles() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const isAdmin = user?.role === "admin" || user?.role === "operator";

  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const form = useForm<InsertVehicle>({
    resolver: zodResolver(insertVehicleSchema),
    defaultValues: {
      plate: "",
      model: "",
      color: "",
      ownerName: "",
      ownerRut: "",
      technicalReviewDate: "",
      circulationPermitDate: "",
      soapDate: "",
      authorizationDate: "",
      status: "active",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertVehicle) => {
      await apiRequestJson("/api/vehicles", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setOpen(false);
      form.reset();
      toast({ title: "Éxito", description: "Vehículo registrado correctamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertVehicle) => {
      if (!editingId) return;
      await apiRequestJson(`/api/vehicles/${editingId}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setOpen(false);
      setEditingId(null);
      form.reset();
      toast({ title: "Actualizado", description: "Datos del vehículo modificados" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequestJson(`/api/vehicles/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Eliminado", description: "Vehículo eliminado" });
    }
  });

  const onSubmit = (data: InsertVehicle) => {
    if (editingId) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    form.reset({
      plate: vehicle.plate,
      model: vehicle.model,
      color: vehicle.color,
      ownerName: vehicle.ownerName,
      ownerRut: vehicle.ownerRut,
      technicalReviewDate: vehicle.technicalReviewDate,
      circulationPermitDate: vehicle.circulationPermitDate,
      soapDate: vehicle.soapDate,
      authorizationDate: vehicle.authorizationDate,
      status: vehicle.status,
    });
    setOpen(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    form.reset({
      plate: "",
      model: "",
      color: "",
      ownerName: "",
      ownerRut: "",
      technicalReviewDate: "",
      circulationPermitDate: "",
      soapDate: "",
      authorizationDate: "",
      status: "active",
    });
    setOpen(true);
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vehículos</h1>
          <p className="text-muted-foreground">Flota y documentación</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreate} className="bg-slate-900 text-white hover:bg-slate-800">
                <Plus className="mr-2 h-4 w-4" /> Nuevo Vehículo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Vehículo" : "Registrar Nuevo Vehículo"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  
                  {/* SECCIÓN 1: DATOS DEL VEHÍCULO */}
                  <div className="p-4 border rounded-md space-y-4">
                    <h3 className="font-semibold flex items-center gap-2"><Car className="h-4 w-4"/> Datos del Vehículo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* 🟢 PATENTE EN MAYÚSCULAS */}
                      <FormField control={form.control} name="plate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patente</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value?.toUpperCase() || ""} 
                              onChange={e => field.onChange(e.target.value.toUpperCase())}
                              placeholder="ABCD-12" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* 🟢 MODELO EN MAYÚSCULAS */}
                      <FormField control={form.control} name="model" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modelo</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value?.toUpperCase() || ""} 
                              onChange={e => field.onChange(e.target.value.toUpperCase())}
                              placeholder="EJ: TOYOTA YARIS" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* 🟢 COLOR EN MAYÚSCULAS */}
                      <FormField control={form.control} name="color" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value?.toUpperCase() || ""} 
                              onChange={e => field.onChange(e.target.value.toUpperCase())}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  {/* SECCIÓN 2: DATOS DEL PROPIETARIO */}
                  <div className="p-4 border rounded-md space-y-4 bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="font-semibold flex items-center gap-2"><User className="h-4 w-4"/> Propietario</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* 🟢 NOMBRE PROPIETARIO EN MAYÚSCULAS */}
                      <FormField control={form.control} name="ownerName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre Completo</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value?.toUpperCase() || ""} 
                              onChange={e => field.onChange(e.target.value.toUpperCase())}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* 🟢 RUT PROPIETARIO EN MAYÚSCULAS */}
                      <FormField control={form.control} name="ownerRut" render={({ field }) => (
                        <FormItem>
                          <FormLabel>RUT Propietario</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value?.toUpperCase() || ""} 
                              onChange={e => field.onChange(e.target.value.toUpperCase())}
                              placeholder="12.345.678-K" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  {/* SECCIÓN 3: DOCUMENTACIÓN */}
                  <div className="p-4 border rounded-md space-y-4">
                    <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4"/> Vencimiento Documentos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="technicalReviewDate" render={({ field }) => (
                        <FormItem><FormLabel>Revisión Técnica</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="circulationPermitDate" render={({ field }) => (
                        <FormItem><FormLabel>Permiso de Circulación</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="soapDate" render={({ field }) => (
                        <FormItem><FormLabel>Vencimiento SOAP</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="authorizationDate" render={({ field }) => (
                        <FormItem><FormLabel>Vencimiento Cartón (CIRNSTP)</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingId ? "Guardar Cambios" : "Guardar Vehículo"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patente</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Propietario</TableHead>
                <TableHead>Rev. Técnica</TableHead>
                <TableHead>Cartón Recorrido</TableHead>
                {isAdmin && <TableHead className="w-[100px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay vehículos registrados.
                  </TableCell>
                </TableRow>
              ) : (
                vehicles?.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-mono font-bold">{vehicle.plate}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{vehicle.model}</span>
                        <span className="text-xs text-muted-foreground">{vehicle.color}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="capitalize">{vehicle.ownerName}</span>
                        <span className="text-xs text-muted-foreground">{vehicle.ownerRut}</span>
                      </div>
                    </TableCell>
                    <TableCell>{vehicle.technicalReviewDate}</TableCell>
                    <TableCell>{vehicle.authorizationDate}</TableCell>
                    {isAdmin && (
                      <TableCell className="flex gap-2 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(vehicle)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(vehicle.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}