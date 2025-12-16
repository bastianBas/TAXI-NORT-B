import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, Loader2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const insertPaymentSchema = z.object({
  routeSlipId: z.string().min(1, "Debes seleccionar una hoja de ruta"),
  amount: z.string().min(1, "El monto es obligatorio"),
  date: z.string().min(1, "La fecha es obligatoria"),
});

type FormData = z.infer<typeof insertPaymentSchema>;

interface PaymentFormProps {
  onSuccess: () => void;
  initialData?: any;
}

export function PaymentForm({ onSuccess, initialData }: PaymentFormProps) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(insertPaymentSchema),
    defaultValues: {
      routeSlipId: initialData?.routeSlipId || "",
      amount: initialData?.amount ? String(initialData.amount) : "",
      date: initialData?.date || new Date().toISOString().split('T')[0],
    }
  });

  const [routeSlips, setRouteSlips] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Cargar hojas de ruta pendientes (o todas si es edición)
    fetch("/api/route-slips")
      .then(res => res.json())
      .then(data => {
        // Si estamos editando, mostramos todas. Si es nuevo, solo las pendientes.
        const filtered = initialData 
          ? data 
          : data.filter((slip: any) => slip.paymentStatus !== 'paid');
        setRouteSlips(filtered);
      })
      .catch(console.error);
  }, [initialData]);

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("routeSlipId", data.routeSlipId);
      formData.append("amount", data.amount);
      formData.append("date", data.date);
      
      // Datos fijos requeridos por el backend
      formData.append("type", "transfer"); 
      
      // Buscar conductor/vehiculo de la hoja seleccionada
      const selectedSlip = routeSlips.find(s => s.id === data.routeSlipId);
      if (selectedSlip) {
        formData.append("driverId", selectedSlip.driverId);
        formData.append("vehicleId", selectedSlip.vehicleId);
      }

      if (file) {
        formData.append("proof", file);
      }

      const url = initialData ? `/api/payments/${initialData.id}` : "/api/payments";
      const method = initialData ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text(); // Leer error del servidor si existe
        throw new Error(errorText || "Error al guardar");
      }

      toast({ title: "Éxito", description: "Pago registrado correctamente" });
      onSuccess();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudo guardar el pago", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
      
      <div className="grid gap-2">
        <Label>Hoja de Ruta</Label>
        <Select 
          onValueChange={(val) => setValue("routeSlipId", val)} 
          defaultValue={initialData?.routeSlipId}
          disabled={!!initialData} // No cambiar la hoja si se está editando el pago
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar hoja pendiente" />
          </SelectTrigger>
          <SelectContent>
            {routeSlips.map((slip) => (
              <SelectItem key={slip.id} value={slip.id}>
                {slip.date} - {slip.driver?.name} ({slip.vehicle?.plate})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.routeSlipId && <p className="text-red-500 text-xs">{errors.routeSlipId.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Monto</Label>
          <Input type="number" {...register("amount")} placeholder="Ej: 5000" />
          {errors.amount && <p className="text-red-500 text-xs">{errors.amount.message}</p>}
        </div>
        <div className="grid gap-2">
          <Label>Fecha Pago</Label>
          <Input type="date" {...register("date")} />
        </div>
      </div>

      <div className="border border-dashed border-gray-300 dark:border-zinc-700 p-4 rounded-md text-center">
        <Label htmlFor="proof-upload" className="cursor-pointer flex flex-col items-center gap-2">
           <Upload className="h-8 w-8 text-gray-400" />
           <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
             {file ? file.name : (initialData?.proofOfPayment ? "Cambiar Comprobante Actual" : "Subir Comprobante")}
           </span>
           <span className="text-xs text-gray-400">Imagen o PDF</span>
        </Label>
        <Input 
          id="proof-upload" 
          type="file" 
          accept="image/*,application/pdf" 
          className="hidden" 
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setFile(e.target.files[0]);
            }
          }}
        />
        {file && <div className="mt-2 text-green-600 text-xs flex items-center justify-center gap-1"><Check className="h-3 w-3"/> Archivo listo</div>}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" type="button" onClick={onSuccess} disabled={isSubmitting}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Actualizar Pago" : "Registrar Pago"}
        </Button>
      </div>
    </form>
  );
}