import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  DollarSign, 
  Eye, 
  Edit, 
  ExternalLink, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  Image as ImageIcon 
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns"; // Asegúrate de tener esto
import { es } from "date-fns/locale"; // Asegúrate de tener esto

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Esquema de validación idéntico al original
const insertPaymentSchema = z.object({
  routeSlipId: z.string().min(1, "Debes seleccionar una hoja de ruta"),
  amount: z.string().min(1, "El monto es obligatorio"),
  date: z.string().min(1, "La fecha es obligatoria"),
});

type FormData = z.infer<typeof insertPaymentSchema>;

// 🟢 FUNCIÓN VITAL: Convierte la imagen a Texto (Base64) para que no se borre del servidor
const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export default function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  
  // Estado para el visor
  const [viewFileUrl, setViewFileUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. CARGAR DATOS
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const res = await fetch("/api/payments");
      if (!res.ok) throw new Error("Error al cargar pagos");
      return res.json();
    },
  });

  const { data: routeSlips = [] } = useQuery({
    queryKey: ["route-slips"], 
    queryFn: async () => {
      const res = await fetch("/api/route-slips");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // 2. CÁLCULOS KPI (Manteniendo tu lógica original)
  const pendingSlipsCount = routeSlips.filter((s: any) => s.paymentStatus !== 'paid').length;
  const totalPaymentsCount = payments.length;
  
  const filteredPayments = payments.filter((p: any) => {
    const searchLower = searchTerm.toLowerCase();
    const driverName = p.routeSlip?.driver?.name?.toLowerCase() || "";
    const vehiclePlate = p.routeSlip?.vehicle?.plate?.toLowerCase() || "";
    return driverName.includes(searchLower) || vehiclePlate.includes(searchLower);
  });

  const totalAmount = filteredPayments.reduce((sum: number, p: any) => sum + (parseInt(p.amount) || 0), 0);

  // 3. FORMULARIO
  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(insertPaymentSchema),
    defaultValues: {
      amount: "1800", 
      date: new Date().toISOString().split('T')[0],
      routeSlipId: ""
    }
  });

  const handleOpenCreate = () => {
    setEditingPayment(null);
    setFile(null);
    reset({
      amount: "1800",
      date: new Date().toISOString().split('T')[0],
      routeSlipId: ""
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (payment: any) => {
    setEditingPayment(payment);
    setFile(null);
    reset({
      amount: String(payment.amount),
      date: payment.date,
      routeSlipId: payment.routeSlipId
    });
    setIsModalOpen(true);
  };

  // 🟢 4. ENVÍO DE DATOS (JSON + BASE64)
  const onSubmit = async (data: FormData) => {
    try {
      // Construimos el objeto JSON
      const payload: any = {
        routeSlipId: data.routeSlipId,
        amount: "1800", // Valor fijo según tu lógica
        date: data.date,
        type: "transfer"
      };
      
      const selectedSlip = routeSlips.find((s: any) => s.id === data.routeSlipId);
      if (selectedSlip) {
        payload.driverId = selectedSlip.driverId;
        payload.vehicleId = selectedSlip.vehicleId;
      }

      // Si hay archivo nuevo, lo convertimos a texto
      if (file) {
        const base64 = await convertToBase64(file);
        payload.proofOfPayment = base64; 
      }

      const url = editingPayment ? `/api/payments/${editingPayment.id}` : "/api/payments";
      const method = editingPayment ? "PUT" : "POST";

      // Enviamos como application/json
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Error al guardar");

      toast({ title: "Éxito", description: editingPayment ? "Pago actualizado" : "Pago registrado correctamente" });
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["route-slips"] }); 
    } catch (e) {
      toast({ title: "Error", description: "No se pudo guardar. Verifica el tamaño de la imagen.", variant: "destructive" });
    }
  };

  // 🟢 5. VISOR DE IMÁGENES (Compatible con Base64 y Rutas viejas)
  const handleViewFile = (data: string) => {
    if (!data) return toast({ title: "Sin archivo", variant: "destructive" });
    
    // Si empieza con 'data:', es una imagen Base64 (las nuevas) -> Funciona siempre
    if (data.startsWith('data:')) {
        setViewFileUrl(data);
    } else {
        // Si no, es una ruta vieja. Intentamos limpiarla y apuntar al API
        // Ojo: Si el servidor borró la carpeta física, esto fallará, pero es lo mejor que podemos hacer con datos viejos.
        const filename = data.split(/[/\\]/).pop();
        if (filename) setViewFileUrl(`/api/uploads/${filename}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* CABECERA Y BOTÓN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pagos</h1>
          <p className="text-muted-foreground">Registro de pagos diarios de Hojas de Ruta</p>
        </div>
        <Button 
          onClick={handleOpenCreate} 
          className="gap-2 bg-zinc-950 hover:bg-zinc-900 text-white dark:bg-[#0f172a] dark:hover:bg-[#1e293b] dark:text-white dark:border dark:border-slate-800"
        >
          <Plus className="h-4 w-4" /> Nuevo Pago
        </Button>
      </div>

      {/* TARJETAS KPI */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Recaudación Total</h3>
            <DollarSign className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold">${totalAmount.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">En registros filtrados</p>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Total Pagos</h3>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold">{totalPaymentsCount}</div>
          <p className="text-xs text-muted-foreground">Registrados históricamente</p>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Hojas Pendientes</h3>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </div>
          <div className="text-2xl font-bold">{pendingSlipsCount}</div>
          <p className="text-xs text-muted-foreground">Por cobrar</p>
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="flex items-center gap-2 bg-background p-2 rounded-lg border shadow-sm max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por conductor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-0 focus-visible:ring-0 bg-transparent"
        />
      </div>

      {/* TABLA */}
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Fecha</TableHead>
              <TableHead>Conductor</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center">Cargando...</TableCell></TableRow>
            ) : filteredPayments.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No hay pagos registrados.</TableCell></TableRow>
            ) : (
              filteredPayments.map((p: any) => (
                <TableRow key={p.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {/* Aseguramos formato fecha */}
                    {p.date ? format(new Date(p.date), "dd/MM/yyyy", { locale: es }) : p.routeSlip?.date}
                  </TableCell>
                  <TableCell>{p.routeSlip?.driver?.name}</TableCell>
                  <TableCell className="font-mono text-xs">{p.routeSlip?.vehicle?.plate}</TableCell>
                  <TableCell className="font-bold">${parseInt(p.amount).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">Pagado</Badge>
                  </TableCell>
                  <TableCell>
                    {p.proofOfPayment ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-xs gap-2"
                        // 🟢 LLAMADA AL VISOR
                        onClick={() => handleViewFile(p.proofOfPayment)}
                      >
                        <ImageIcon className="h-3 w-3" /> Ver Imagen
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin archivo</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(p)}>
                      <Edit className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* MODAL FORMULARIO */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white text-black">
          <DialogHeader>
            <DialogTitle>{editingPayment ? "Editar Pago" : "Nuevo Pago"}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Hoja de Ruta</Label>
              <Select 
                onValueChange={(val) => setValue("routeSlipId", val)} 
                defaultValue={watch("routeSlipId")}
                disabled={!!editingPayment}
              >
                <SelectTrigger className="bg-white border-gray-200">
                  <SelectValue placeholder="Seleccionar hoja pendiente" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {(editingPayment ? routeSlips : routeSlips.filter((s:any) => s.paymentStatus !== 'paid')).map((s:any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.date} - {s.driver?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Monto a Pagar</Label>
                 <Input 
                   type="number" 
                   {...register("amount")} 
                   className="bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed" 
                   readOnly
                 />
               </div>
               <div className="space-y-2">
                 <Label>Fecha Pago</Label>
                 <Input 
                   type="date" 
                   {...register("date")} 
                   className="bg-white border-gray-200" 
                 />
               </div>
            </div>

            {/* INPUT SUBIDA IMAGEN */}
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors mt-2" onClick={() => document.getElementById('file-upload')?.click()}>
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-700">
                  {file ? file.name : (editingPayment?.proofOfPayment ? "Imagen cargada (Click para cambiar)" : "Subir Imagen Comprobante")}
                </p>
                <p className="text-xs text-gray-500 mt-1">Solo Imágenes (JPG, PNG)</p>
                <Input 
                   id="file-upload" 
                   type="file" 
                   accept="image/*" 
                   className="hidden" 
                   onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} 
                />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                {editingPayment ? "Guardar Cambios" : "Registrar Pago"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 🟢 MODAL VISUALIZADOR FINAL */}
      <Dialog open={!!viewFileUrl} onOpenChange={(open) => !open && setViewFileUrl(null)}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 bg-zinc-950 border-zinc-800 flex flex-col overflow-hidden [&>button]:text-zinc-400">
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
               <Eye className="h-4 w-4"/> Visualizador de Comprobante
            </h2>
            {viewFileUrl && (
                <a 
                  href={viewFileUrl} 
                  download="comprobante.png"
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md flex items-center gap-2"
                >
                  <ExternalLink className="h-3 w-3" /> Descargar / Abrir
                </a>
            )}
          </div>
          
          <div className="flex-1 bg-zinc-900/50 flex justify-center items-center p-4 relative overflow-hidden">
             {viewFileUrl ? (
                 <img 
                   src={viewFileUrl} 
                   className="max-w-full max-h-full object-contain rounded shadow-lg" 
                   alt="Comprobante" 
                   onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      toast({ title: "Error visual", description: "La imagen no se puede mostrar.", variant: "destructive" });
                   }}
                 />
             ) : (
               <p className="text-zinc-500">Cargando...</p>
             )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}