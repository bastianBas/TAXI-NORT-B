import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { insertRouteSlipSchema, type InsertRouteSlip, type RouteSlip, type Driver, type Vehicle } from "@shared/schema";
import { apiRequestFormData } from "@/lib/queryClient";
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
import { Plus, Loader2, Clock, Stamp, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

interface Props {
  slipToEdit?: RouteSlip;
  trigger?: React.ReactNode;
}

export default function RouteSlipDialog({ slipToEdit, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: drivers } = useQuery<Driver[]>({ queryKey: ["/api/drivers"] });
  const { data: vehicles } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });

  const form = useForm<InsertRouteSlip>({
    resolver: zodResolver(insertRouteSlipSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      startTime: "08:00",
      endTime: "18:00",
      notes: "",
    },
  });

  // Efecto para cargar datos si estamos editando
  useEffect(() => {
    if (slipToEdit && open) {
      form.reset({
        date: slipToEdit.date,
        vehicleId: slipToEdit.vehicleId,
        driverId: slipToEdit.driverId,
        startTime: slipToEdit.startTime,
        endTime: slipToEdit.endTime,
        notes: slipToEdit.notes || "",
      });
    } else if (!slipToEdit && open) {
      form.reset({
        date: new Date().toISOString().split("T")[0],
        startTime: "08:00",
        endTime: "18:00",
        notes: "",
      });
    }
  }, [slipToEdit, open, form]);

  const mutation = useMutation({
    mutationFn: async (data: InsertRouteSlip) => {
      const formData = new FormData();
      formData.append("date", data.date);
      formData.append("vehicleId", data.vehicleId);
      formData.append("driverId", data.driverId);
      formData.append("startTime", data.startTime);
      formData.append("endTime", data.endTime);
      formData.append("notes", data.notes || "");

      if (selectedFile) {
        formData.append("signature", selectedFile);
      } else if (!slipToEdit) {
        throw new Error("Debe adjuntar la imagen de Firma/Timbre del Controlador.");
      }

      if (slipToEdit) {
        return apiRequestFormData(`/api/route-slips/${slipToEdit.id}`, "PUT", formData);
      } else {
        return apiRequestFormData("/api/route-slips", "POST", formData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/route-slips"] });
      toast({ 
        title: slipToEdit ? "Control Actualizado" : "Control Registrado", 
        description: "Los datos han sido guardados." 
      });
      setOpen(false);
      form.reset();
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const simulateClaveUnica = () => {
    window.open("https://claveunica.gob.cl", "_blank");
    toast({ title: "Simulación", description: "Portal de validación abierto." });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : (
          /* 🟢 AQUÍ ESTÁ EL CAMBIO DE ESTILO */
          <Button className="bg-slate-900 text-white hover:bg-slate-800">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Control Diario
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{slipToEdit ? "Editar Control Diario" : "Nuevo Control Diario"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col space-y-2 pt-8">
                 <Badge variant="outline" className="w-fit self-start">Controlador: Gastón Flores</Badge>
              </div>

              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehículo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {vehicles?.map((v) => (
                          <SelectItem key={v.id} value={v.id}>{v.plate} - {v.model}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="driverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conductor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {drivers?.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md bg-slate-50 dark:bg-slate-900/50">
              <h3 className="col-span-2 font-semibold flex items-center gap-2"><Clock className="h-4 w-4"/> Horarios de Servicio</h3>
              
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inicio Servicio</FormLabel>
                    <FormControl><Input type="time" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Término Servicio</FormLabel>
                    <FormControl><Input type="time" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border p-4 rounded-md space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold flex items-center gap-2"><Stamp className="h-4 w-4"/> Firma/Timbre Controlador</h3>
                <Button type="button" variant="ghost" size="sm" className="text-blue-600 gap-1 h-8" onClick={simulateClaveUnica}>
                   <ExternalLink className="h-3 w-3" /> Validar Clave Única
                </Button>
              </div>
              
              <div className="space-y-2">
                <Input type="file" accept="image/*" onChange={handleFileChange} />
                <p className="text-xs text-muted-foreground">
                    {slipToEdit ? "Suba una nueva imagen para reemplazar la actual (opcional)." : "Adjunte imagen de la firma o timbre digital validado."}
                </p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones (Opcional)</FormLabel>
                  <FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {slipToEdit ? "Guardar Cambios" : "Guardar Control"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}