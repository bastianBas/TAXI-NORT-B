import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, Loader2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Esquema de validación
const insertRouteSlipSchema = z.object({
  date: z.string().min(1, "La fecha es obligatoria"),
  vehicleId: z.string().min(1, "El vehículo es obligatorio"),
  driverId: z.string().min(1, "El conductor es obligatorio"),
  startTime: z.string().min(1, "Hora inicio obligatoria"),
  endTime: z.string().min(1, "Hora término obligatoria"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof insertRouteSlipSchema>;

interface RouteSlipFormProps {
  onSuccess: () => void;
  initialData?: any; // Datos para editar
}

// 🟢 HELPER: Convierte el archivo a Base64 para enviarlo en el JSON
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export function RouteSlipForm({ onSuccess, initialData }: RouteSlipFormProps) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(insertRouteSlipSchema),
    defaultValues: {
      date: initialData?.date || new Date().toISOString().split('T')[0],
      vehicleId: initialData?.vehicleId || "",
      driverId: initialData?.driverId || "",
      startTime: initialData?.startTime || "08:00",
      endTime: initialData?.endTime || "18:00",
      notes: initialData?.notes || ""
    }
  });

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/vehicles").then(res => res.json()).then(setVehicles).catch(console.error);
    fetch("/api/drivers").then(res => res.json()).then(setDrivers).catch(console.error);
  }, []);

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      
      // 🟢 MODIFICACIÓN: Creamos un objeto JSON en lugar de FormData
      const payload: any = { ...data };
      
      // Si hay una nueva firma seleccionada, la convertimos a Base64
      if (file) {
        try {
          const base64Signature = await fileToBase64(file);
          payload.signatureUrl = base64Signature;
        } catch (e) {
          console.error("Error al procesar la imagen de la firma", e);
        }
      }

      let url = "/api/route-slips";
      let method = "POST";

      if (initialData && initialData.id) {
        url = `/api/route-slips/${initialData.id}`;
        method = "PUT";
      }

      // 🟢 MODIFICACIÓN: Enviamos como JSON para asegurar que el backend reciba todo
      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorMsg = await res.text();
        throw new Error(errorMsg || "Error al guardar");
      }

      toast({ 
        title: initialData ? "Control Actualizado" : "Control Creado", 
        description: "Los datos y el registro histórico se guardaron correctamente." 
      });
      onSuccess(); 
    } catch (error: any) {
      console.error(error);
      toast({ 
        title: "Error", 
        description: error.message || "No se pudo guardar el registro.", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
      
      <div className="grid gap-2">
        <Label>Fecha</Label>
        <Input type="date" {...register("date")} />
        {errors.date && <p className="text-red-500 text-xs">{errors.date.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Vehículo</Label>
          <Select 
            onValueChange={(val) => setValue("vehicleId", val)} 
            defaultValue={initialData?.vehicleId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar auto" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.plate} - {v.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.vehicleId && <p className="text-red-500 text-xs">{errors.vehicleId.message}</p>}
        </div>

        <div className="grid gap-2">
          <Label>Conductor</Label>
          <Select 
            onValueChange={(val) => setValue("driverId", val)}
            defaultValue={initialData?.driverId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar conductor" />
            </SelectTrigger>
            <SelectContent>
              {drivers.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.driverId && <p className="text-red-500 text-xs">{errors.driverId.message}</p>}
        </div>
      </div>

      <div className="border p-3 rounded-md bg-gray-50 dark:bg-zinc-900 grid gap-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
           Horarios de Servicio
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1">
            <Label className="text-xs">Inicio Servicio</Label>
            <Input type="time" {...register("startTime")} />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Término Servicio</Label>
            <Input type="time" {...register("endTime")} />
          </div>
        </div>
      </div>

      <div className="border border-dashed border-gray-300 dark:border-zinc-700 p-4 rounded-md text-center">
        <Label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
           <Upload className="h-8 w-8 text-gray-400" />
           <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
             {file ? file.name : (initialData?.signatureUrl ? "Cambiar Firma Actual" : "Subir Firma / Timbre Digital")}
           </span>
           <span className="text-xs text-gray-400">Click para seleccionar imagen (JPG, PNG)</span>
        </Label>
        <Input 
          id="file-upload" 
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setFile(e.target.files[0]);
            }
          }}
        />
        {file && <div className="mt-2 text-green-600 text-xs flex items-center justify-center gap-1"><Check className="h-3 w-3"/> Archivo listo</div>}
      </div>

      <div className="grid gap-2">
        <Label>Observaciones (Opcional)</Label>
        <Textarea {...register("notes")} placeholder="Comentarios sobre la jornada..." />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" type="button" onClick={onSuccess} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Actualizar Control" : "Guardar Control"}
        </Button>
      </div>
    </form>
  );
}