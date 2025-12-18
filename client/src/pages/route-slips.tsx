import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  X
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import QRCode from "react-qr-code"; 
import { useReactToPrint } from "react-to-print"; 

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

// IMPORTAMOS TU NUEVO COMPONENTE DE EDICIÓN
import EditControlModal from "@/components/EditControlModal";

// --- VALIDACIÓN DEL FORMULARIO DE CREACIÓN ---
const routeSlipSchema = z.object({
  driverId: z.string().min(1, "Selecciona un conductor"),
  vehicleId: z.string().min(1, "Selecciona un vehículo"),
  date: z.string().min(1, "Selecciona una fecha"),
  startTime: z.string().min(1, "Selecciona hora de inicio"), 
});

type FormData = z.infer<typeof routeSlipSchema>;

// Helper para mostrar los horarios 
const getShiftLabel = (shift: string) => {
  switch(shift) {
    case 'mañana': return '08:00 - 18:00';
    case 'tarde': return '14:00 - 00:00'; 
    case 'noche': return '20:00 - 06:00';
    case 'personalizado': return 'Horario Personalizado';
    default: return '09:00 - 19:00'; 
  }
};

export default function RouteSlipsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estado para Crear 
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  
  // Estado local para calcular la hora de fin en el modal de CREACIÓN
  const [createEndTime, setCreateEndTime] = useState("15:00"); 

  // --- ESTADOS PARA EL MODAL DE EDICIÓN ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [slipToEdit, setSlipToEdit] = useState<any>(null);

  // Estado para Visualizar (Ojo)
  const [viewSlip, setViewSlip] = useState<any>(null);
  
  // Referencia para impresión
  const printRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- CARGA DE DATOS ---
  const { data: slips = [], isLoading } = useQuery({
    queryKey: ["route-slips"],
    queryFn: async () => {
      const res = await fetch("/api/route-slips");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const res = await fetch("/api/drivers");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const res = await fetch("/api/vehicles");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // 🟢 NUEVA LÓGICA: Auto-abrir hoja de ruta si viene en el enlace (QR)
  useEffect(() => {
    // Leemos si hay un ?id=... en la URL
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get("id");

    if (idFromUrl && slips.length > 0) {
      // Buscamos la hoja de ruta correspondiente
      const foundSlip = slips.find((s: any) => String(s.id) === String(idFromUrl));
      if (foundSlip) {
        setViewSlip(foundSlip); // Abrimos el modal automáticamente
        
        // Opcional: Limpiamos la URL para que no se abra de nuevo al recargar
        // window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [slips]); // Se ejecuta cuando cargan los datos

  // Filtros de búsqueda
  const filteredSlips = slips.filter((slip: any) => {
    const search = searchTerm.toLowerCase();
    return (
      slip.driver?.name?.toLowerCase().includes(search) ||
      slip.vehicle?.plate?.toLowerCase().includes(search) ||
      slip.driver?.rut?.includes(search)
    );
  });

  // Configuración del Formulario (SOLO CREACIÓN)
  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(routeSlipSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      startTime: "08:00" 
    }
  });

  // --- LÓGICA DE APERTURA DE MODALES ---

  const handleOpenCreate = () => {
    reset({
      date: new Date().toISOString().split('T')[0],
      startTime: "08:00",
      driverId: "",
      vehicleId: ""
    });
    setCreateEndTime("15:00"); 
    setIsCreateFormOpen(true);
  };

  const handleOpenEditWithId = (slip: any) => {
      const dataFormatted = {
          id: slip.id, 
          fecha: slip.date,
          conductor: { 
              id: slip.driverId, 
              nombre: slip.driver?.name || "Conductor Desconocido" 
          },
          vehiculo: { 
              id: slip.vehicleId, 
              patente: slip.vehicle?.plate || "Sin Patente" 
          },
          horaInicio: slip.startTime || "08:00", 
          horaFin: slip.endTime || "15:00"
      };
      setSlipToEdit(dataFormatted);
      setIsEditModalOpen(true);
  }

  // --- LÓGICA DE CÁLCULO DE HORA ---
  const handleCreateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartTime = e.target.value;
    setValue("startTime", newStartTime); 

    if (!newStartTime) return;

    // Calcular +7 horas
    const [hours, minutes] = newStartTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setHours(date.getHours() + 7);

    const endHours = date.getHours().toString().padStart(2, '0');
    const endMinutes = date.getMinutes().toString().padStart(2, '0');
    setCreateEndTime(`${endHours}:${endMinutes}`);
  };

  // --- MUTACIÓN PARA CREAR (POST) ---
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = { 
        ...data, 
        endTime: createEndTime, 
        shift: 'personalizado', 
        status: 'active' 
      }; 

      const res = await fetch("/api/route-slips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al crear");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["route-slips"] });
      toast({ title: "Éxito", description: "Registro creado con horario de 7 horas." });
      setIsCreateFormOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear el registro", variant: "destructive" });
    }
  });

  // --- FUNCION PARA GUARDAR EDICIÓN (PUT) ---
  const handleSaveEdit = async (formData: any) => {
    try {
        const payload = {
            date: formData.fecha,
            driverId: formData.conductorId, 
            vehicleId: formData.vehiculoId,
            startTime: formData.horaInicio, 
            endTime: formData.horaFin,      
            shift: 'personalizado' 
        };

        const url = `/api/route-slips/${slipToEdit.id}`; 
        
        const res = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Error al actualizar");

        queryClient.invalidateQueries({ queryKey: ["route-slips"] });
        toast({ title: "Actualizado", description: "Cambios guardados correctamente." });
        setIsEditModalOpen(false);

    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "No se pudo actualizar.", variant: "destructive" });
    }
  };

  const onSubmitCreate = (data: FormData) => {
    createMutation.mutate(data);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef, 
    documentTitle: viewSlip ? `Hoja_Ruta_${viewSlip.date}` : "Hoja_Ruta",
  });

  // --- GENERAR URL DEL QR ---
  const getQrUrl = (slipId: string) => {
    // Genera un enlace a la página actual con el ID de la hoja de ruta
    if (typeof window !== 'undefined') {
        const baseUrl = window.location.href.split('?')[0]; // URL base sin parámetros
        return `${baseUrl}?id=${slipId}`;
    }
    return '';
  };

  return (
    <div className="space-y-6">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Control Diario</h1>
          <p className="text-muted-foreground">Bitácora de servicios y estado de pagos.</p>
        </div>
        {/* PROTECCIÓN: Solo Admin puede ver el botón de CREAR */}
        {user?.role === 'admin' && (
          <Button onClick={handleOpenCreate} className="gap-2 bg-zinc-950 text-white hover:bg-zinc-900">
            <Plus className="h-4 w-4" /> Nuevo Control Diario
          </Button>
        )}
      </div>

      {/* BUSCADOR */}
      <div className="flex items-center gap-2 bg-background p-2 rounded-lg border shadow-sm max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar por conductor o patente..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-0 focus-visible:ring-0 bg-transparent"
        />
      </div>

      {/* TABLA DE DATOS */}
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Fecha</TableHead>
              <TableHead>Conductor</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead>Horario</TableHead>
              <TableHead>Estado Pago</TableHead>
              <TableHead>Firma</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center">Cargando...</TableCell></TableRow>
            ) : filteredSlips.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No hay registros.</TableCell></TableRow>
            ) : (
              filteredSlips.map((slip: any) => (
                <TableRow key={slip.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {format(new Date(slip.date), "yyyy-MM-dd", { locale: es })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                        <span className="font-medium">{slip.driver?.name}</span>
                        <span className="text-xs text-muted-foreground">{slip.driver?.rut}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono bg-zinc-100 text-zinc-800 border-zinc-200">
                        {slip.vehicle?.plate}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {slip.startTime && slip.endTime 
                        ? `${slip.startTime} - ${slip.endTime}`
                        : getShiftLabel(slip.shift)
                    }
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={slip.paymentStatus === 'paid' ? 'default' : 'secondary'} 
                      className={slip.paymentStatus === 'paid' 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200' 
                        : 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200'}
                    >
                      {slip.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                      <span className={`text-sm font-medium px-2 py-1 rounded ${slip.signatureUrl ? "text-blue-600 bg-blue-50" : "text-zinc-400"}`}>
                        {slip.signatureUrl ? "Firmado" : "Pendiente"}
                      </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                        {/* Botón VER */}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => setViewSlip(slip)}>
                            <Eye className="h-4 w-4" />
                        </Button>
                        
                        {/* Botón EDITAR (Solo Admin) */}
                        {user?.role === 'admin' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100" onClick={() => handleOpenEditWithId(slip)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* MODAL FORMULARIO (CREAR) */}
      <Dialog open={isCreateFormOpen} onOpenChange={setIsCreateFormOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white text-black">
          <DialogHeader>
            <DialogTitle>Nuevo Control Diario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitCreate)} className="space-y-4 pt-4">
            
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" {...register("date")} />
              {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Conductor</Label>
              <Select onValueChange={(val) => setValue("driverId", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar conductor" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name} ({d.rut})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.driverId && <p className="text-xs text-red-500">{errors.driverId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Vehículo</Label>
              <Select onValueChange={(val) => setValue("vehicleId", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar vehículo" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>{v.plate} - {v.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.vehicleId && <p className="text-xs text-red-500">{errors.vehicleId.message}</p>}
            </div>

            <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Inicio (Entrada)</Label>
                  <Input 
                    type="time" 
                    defaultValue="08:00"
                    onChange={handleCreateTimeChange}
                    required
                  />
                </div>
                
                <div className="flex-1 space-y-2">
                  <Label>Fin (Salida)</Label>
                  <Input 
                    type="time" 
                    value={createEndTime} 
                    readOnly 
                    className="bg-gray-50 text-gray-500"
                    disabled
                  />
                  <p className="text-xs text-gray-400">Calculado: +7 horas</p>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsCreateFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-zinc-950 text-white hover:bg-zinc-900" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Guardando..." : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* NUEVO MODAL DE EDICIÓN */}
      <EditControlModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
        dataToEdit={slipToEdit}
      />

      {/* MODAL DE VISUALIZACIÓN */}
      <Dialog open={!!viewSlip} onOpenChange={(open) => !open && setViewSlip(null)}>
        <DialogContent className="sm:max-w-[600px] bg-white text-black p-0 overflow-hidden">
            <div className="p-6 pb-0 flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold">Detalle de Hoja de Ruta</h2>
                    <p className="text-sm text-muted-foreground">ID: {viewSlip?.id?.slice(0,8)}</p>
                </div>
            </div>

            <div className="p-6 space-y-6" ref={printRef}>
                <div className="flex justify-between items-center border-b pb-4">
                    <div>
                        <p className="text-sm text-muted-foreground">Conductor</p>
                        <p className="text-lg font-bold">{viewSlip?.driver?.name}</p>
                        <p className="text-sm">{viewSlip?.driver?.rut}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Vehículo</p>
                        <Badge variant="outline" className="text-lg font-mono px-3 py-1">
                            {viewSlip?.vehicle?.plate}
                        </Badge>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">Fecha</p>
                        <p className="font-medium">{viewSlip?.date}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Horario Asignado</p>
                        <p className="font-medium">
                            {viewSlip?.startTime && viewSlip?.endTime 
                                ? `${viewSlip.startTime} - ${viewSlip.endTime}` 
                                : getShiftLabel(viewSlip?.shift)
                            }
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Estado Pago</p>
                        <span className={viewSlip?.paymentStatus === 'paid' ? "text-green-600 font-bold" : "text-orange-600 font-bold"}>
                            {viewSlip?.paymentStatus === 'paid' ? "PAGADO" : "PENDIENTE DE PAGO"}
                        </span>
                    </div>
                </div>

                <div className="bg-zinc-50 p-4 rounded-lg flex flex-col items-center justify-center border border-zinc-100 mt-4">
                    <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Escanear para validar</p>
                    <div className="bg-white p-2 rounded shadow-sm">
                        {/* 🟢 QR CORREGIDO: Ahora contiene un LINK real */}
                        <QRCode 
                            value={getQrUrl(viewSlip?.id)}
                            size={128}
                        />
                    </div>
                </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={() => setViewSlip(null)}>Cerrar</Button>
                <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={handlePrint}>
                    Descargar
                </Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}