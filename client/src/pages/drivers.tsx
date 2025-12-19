import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequestJson, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Driver } from "@shared/schema";
import { z } from "zod"; // 🟢 Importamos Zod
import { Plus, Pencil, Trash2, Loader2, UserSquare2, Car } from "lucide-react";

// 🟢 IMPORTS NUEVOS
import { validateRut } from "@/lib/rut-utils";
import { toTitleCase } from "@/lib/format-utils";
import { RutInput } from "@/components/rut-input";

// 🟢 ESQUEMA DE VALIDACIÓN ESTRICTO
const strictDriverSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().min(1, "El email es obligatorio").email("Email inválido"),
  rut: z.string()
    .min(1, "El RUT es obligatorio")
    .refine((val) => validateRut(val), { message: "RUT inválido (Dígito incorrecto)" }),
  phone: z.string().min(1, "El teléfono es obligatorio"),
  commune: z.string().min(1, "La comuna es obligatoria"),
  address: z.string().min(1, "La dirección es obligatoria"),
  licenseNumber: z.string().min(1, "N° Licencia obligatorio"),
  licenseClass: z.string().min(1, "Clase obligatoria"),
  licenseDate: z.string().min(1, "Vencimiento obligatorio"),
  status: z.string().default("active"),
});

type DriverFormValues = z.infer<typeof strictDriverSchema>;

export default function Drivers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const canEdit = ["admin", "operator"].includes(user?.role || "");

  const { data: drivers, isLoading } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const form = useForm<DriverFormValues>({
    resolver: zodResolver(strictDriverSchema), // 🟢 Usamos el esquema estricto
    defaultValues: {
      name: "",
      email: "",
      rut: "",
      phone: "",
      commune: "Copiapó",
      address: "",
      licenseNumber: "",
      licenseClass: "A2",
      licenseDate: "",
      status: "active",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: DriverFormValues) => {
      await apiRequestJson("/api/drivers", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      setOpen(false);
      form.reset();
      toast({ 
        title: "Conductor creado", 
        description: "Se ha creado también una cuenta de usuario. La contraseña es el RUT." 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: DriverFormValues) => {
      if (!editingId) return;
      await apiRequestJson(`/api/drivers/${editingId}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      setOpen(false);
      setEditingId(null);
      form.reset();
      toast({ title: "Actualizado", description: "Datos modificados." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequestJson(`/api/drivers/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({ title: "Eliminado", description: "Conductor eliminado." });
    },
  });

  const onSubmit = (data: DriverFormValues) => {
    if (editingId) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (driver: Driver) => {
    setEditingId(driver.id);
    form.reset({
      name: driver.name,
      email: driver.email || "",
      rut: driver.rut,
      phone: driver.phone,
      commune: driver.commune,
      address: driver.address || "",
      licenseNumber: driver.licenseNumber,
      licenseClass: driver.licenseClass,
      licenseDate: driver.licenseDate,
      status: driver.status,
    });
    setOpen(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    form.reset({
      name: "",
      email: "",
      rut: "",
      phone: "",
      commune: "Copiapó",
      address: "",
      licenseNumber: "",
      licenseClass: "A2",
      licenseDate: "",
      status: "active",
    });
    setOpen(true);
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conductores</h1>
          <p className="text-muted-foreground">Fichas de personal y licencias</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreate} className="bg-slate-900 text-white hover:bg-slate-800">
                <Plus className="mr-2 h-4 w-4" /> Nuevo Conductor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Ficha" : "Nueva Ficha de Conductor"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  
                  {/* DATOS PERSONALES */}
                  <div className="p-4 border rounded-md space-y-4">
                    <h3 className="font-semibold flex items-center gap-2"><UserSquare2 className="h-4 w-4" /> Datos Personales</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Nombre Completo *</FormLabel>
                          <FormControl>
                            <Input 
                                {...field} 
                                placeholder="Ej: Juan Andrés Pérez Cotapos"
                                // 🟢 AUTO-CAPITALIZAR 
                                onChange={(e) => field.onChange(toTitleCase(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Email (Para inicio de sesión) *</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} type="email" placeholder="conductor@taxinort.cl" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="rut" render={({ field }) => (
                        <FormItem>
                          <FormLabel>RUT (Será la contraseña) *</FormLabel>
                          <FormControl>
                            {/* 🟢 INPUT RUT INTELIGENTE */}
                            <RutInput {...field} placeholder="12.345.678-9" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono *</FormLabel>
                          <FormControl><Input {...field} placeholder="+56 9..." /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="commune" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Comuna *</FormLabel>
                          <FormControl>
                            <Input 
                                {...field}
                                // 🟢 AUTO-CAPITALIZAR 
                                onChange={(e) => field.onChange(toTitleCase(e.target.value))} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Dirección *</FormLabel>
                          <FormControl>
                            <Input 
                                {...field} 
                                value={field.value || ""} 
                                // 🟢 AUTO-CAPITALIZAR 
                                onChange={(e) => field.onChange(toTitleCase(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  {/* LICENCIA */}
                  <div className="p-4 border rounded-md bg-slate-50 dark:bg-slate-900/50 space-y-4">
                    <h3 className="font-semibold flex items-center gap-2"><Car className="h-4 w-4" /> Licencia de Conducir</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField control={form.control} name="licenseNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>N° Licencia *</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="licenseClass" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Clase *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="A1">A1</SelectItem>
                              <SelectItem value="A2">A2</SelectItem>
                              <SelectItem value="A3">A3</SelectItem>
                              <SelectItem value="B">B</SelectItem>
                              <SelectItem value="C">C</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="licenseDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Próx. Control *</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingId ? "Guardar Cambios" : "Registrar Conductor"}
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
                <TableHead>Nombre</TableHead>
                <TableHead>RUT</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Licencia</TableHead>
                <TableHead>Control</TableHead>
                <TableHead>Teléfono</TableHead>
                {canEdit && <TableHead className="w-[100px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay conductores registrados.
                  </TableCell>
                </TableRow>
              ) : (
                drivers?.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>{driver.rut}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{driver.email || "-"}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs border px-1 rounded bg-slate-100 dark:bg-slate-800 mr-1">
                        {driver.licenseClass}
                      </span>
                      {driver.licenseNumber}
                    </TableCell>
                    <TableCell>{driver.licenseDate}</TableCell>
                    <TableCell>{driver.phone}</TableCell>
                    {canEdit && (
                      <TableCell className="flex gap-2 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(driver)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(driver.id)}>
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