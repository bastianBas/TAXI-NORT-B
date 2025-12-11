import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { insertRouteSlipSchema, type InsertRouteSlip, type Driver, type Vehicle } from "@shared/schema";
import { apiRequestJson } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import { useState } from "react";

export default function RouteSlipDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Obtener datos para los selectores
  const { data: drivers } = useQuery<Driver[]>({ queryKey: ["/api/drivers"] });
  const { data: vehicles } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });

  // 2. Configurar el formulario
  const form = useForm<InsertRouteSlip>({
    resolver: zodResolver(insertRouteSlipSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0], // Fecha de hoy YYYY-MM-DD
      totalAmount: 0,
      expenses: 0,
      netAmount: 0,
      paymentStatus: "pending",
      notes: "",
    },
  });

  // 3. Mutación para guardar
  const createMutation = useMutation({
    mutationFn: async (data: InsertRouteSlip) => {
      // Forzar conversión a números por si el input devuelve string
      const payload = {
        ...data,
        totalAmount: Number(data.totalAmount),
        expenses: Number(data.expenses),
        netAmount: Number(data.totalAmount) - Number(data.expenses),
      };
      return apiRequestJson("/api/route-slips", "POST", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/route-slips"] });
      toast({ title: "Hoja de ruta creada", description: "El registro se ha guardado exitosamente." });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Calcular neto automáticamente cuando cambian total o gastos
  const calculateNet = () => {
    // Usamos un pequeño timeout para asegurar que el valor ya se actualizó en el form
    setTimeout(() => {
        const total = Number(form.getValues("totalAmount")) || 0;
        const expenses = Number(form.getValues("expenses")) || 0;
        form.setValue("netAmount", total - expenses);
    }, 0);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Hoja de Ruta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Hoja de Ruta</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* FECHA */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* VEHÍCULO */}
              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehículo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar vehículo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicles?.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.plate} - {v.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* CONDUCTOR */}
              <FormField
                control={form.control}
                name="driverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conductor</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar conductor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {drivers?.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name} ({d.rut})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* TOTAL */}
              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto Total ($)</FormLabel>
                    <FormControl>
                      {/* SOLUCIÓN LÍNEA 181: Agregamos value={field.value ?? ''} */}
                      <Input 
                        type="number" 
                        {...field} 
                        value={field.value ?? ''} 
                        onChange={(e) => {
                          field.onChange(e);
                          calculateNet();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* GASTOS */}
              <FormField
                control={form.control}
                name="expenses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gastos ($)</FormLabel>
                    <FormControl>
                      {/* SOLUCIÓN LÍNEA 203: Agregamos value={field.value ?? ''} */}
                      <Input 
                        type="number" 
                        {...field}
                        value={field.value ?? ''} 
                        onChange={(e) => {
                          field.onChange(e);
                          calculateNet();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* NETO (Solo lectura) */}
              <FormField
                control={form.control}
                name="netAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto Neto ($)</FormLabel>
                    <FormControl>
                      {/* SOLUCIÓN LÍNEA 225: Agregamos value={field.value ?? ''} */}
                      <Input 
                        type="number" 
                        {...field} 
                        value={field.value ?? ''} 
                        readOnly 
                        className="bg-muted" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* NOTAS */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones (Opcional)</FormLabel>
                  <FormControl>
                    {/* SOLUCIÓN LÍNEA 241: Agregamos value={field.value ?? ''} */}
                    <Textarea {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Hoja
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}