import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  X,
  Loader2,
  FileX
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
import { Card } from "@/components/ui/card"; 
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

import EditControlModal from "@/components/EditControlModal";

const routeSlipSchema = z.object({
  driverId: z.string().min(1, "Selecciona un conductor"),
  vehicleId: z.string().min(1, "Selecciona un vehículo"),
  date: z.string().min(1, "Selecciona una fecha"),
  startTime: z.string().min(1, "Selecciona hora de inicio"), 
});

type FormData = z.infer<typeof routeSlipSchema>;

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
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [createEndTime, setCreateEndTime] = useState("15:00"); 
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [slipToEdit, setSlipToEdit] = useState<any>(null);
  const [viewSlip, setViewSlip] = useState<any>(null);
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

  // 🟢 LÓGICA ESPECIAL PARA QR (MODO PDF)
  // Estado para controlar si estamos en modo "Solo Documento"
  const [isQrMode, setIsQrMode] = useState(false);
  const [qrSlip, setQrSlip] = useState<any>(null);

  useEffect(() => {
    // Verificar URL al cargar
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const id = params.get("id");

    if (mode === 'pdf') {
        setIsQrMode(true); // ¡IMPORTANTE! Activamos el modo QR inmediatamente
        if (id && slips.length > 0) {
            const found = slips.find((s: any) => String(s.id) === String(id));
            if (found) {
                setQrSlip(found);
            }
        }
    }
  }, [slips]); // Re-evaluar cuando carguen los slips

  // 🟢 RENDERIZADO DEL MODO QR (Pantalla Blanca)
  if (isQrMode) {
      if (!qrSlip) {
          // Si estamos cargando datos o no se encuentra el ID
          return (
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 text-center">
                {isLoading ? (
                    <>
                        <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
                        <p className="text-gray-600 font-medium">Generando vista de documento...</p>
                    </>
                ) : (
                    <>
                        <FileX className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-bold text-gray-900">Documento no disponible</h3>
                        <p className="text-gray-500 max-w-xs mt-2">No se pudo encontrar la hoja de ruta solicitada o no tienes permisos para verla.</p>
                        <Button className="mt-6" variant="outline" onClick={() => window.location.href = '/route-slips'}>
                            Ir al Inicio
                        </Button>
                    </>
                )}
            </div>
          );
      }

      // Si encontramos el documento, lo mostramos limpio
      return (
        <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center justify-center font-sans">
            <Card className="w-full max-w-[600px] bg-white shadow-xl overflow-hidden border border-gray-200" ref={printRef}>
                <div className="p-8 space-y-8">
                    {/* Encabezado */}
                    <div className="flex justify-between items-start border-b pb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Hoja de Ruta</h1>
                            <p className="text-sm text-gray-500 mt-1">ID CONTROL: {qrSlip.id?.slice(0,8)}</p>
                        </div>
                        <div className="text-right">
                            <Badge variant="outline" className="text-xl font-mono px-3 py-1 bg-gray-50 text-gray-900 border-gray-300">
                                {qrSlip.vehicle?.plate}
                            </Badge>
                            <p className="text-xs text-gray-400 mt-2">TAXI NORT S.A.</p>
                        </div>
                    </div>

                    {/* Datos */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Conductor</p>
                            <p className="text-lg font-bold text-gray-900">{qrSlip.driver?.name}</p>
                            <p className="text-sm text-gray-600">{qrSlip.driver?.rut}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Fecha</p>
                            <p className="text-lg font-bold text-gray-900">{qrSlip.date}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Horario</p>
                            <p className="font-medium text-gray-900">
                                {qrSlip.startTime && qrSlip.endTime 
                                    ? `${qrSlip.startTime} - ${qrSlip.endTime}` 
                                    : getShiftLabel(qrSlip.shift)
                                }
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Estado</p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                                qrSlip.paymentStatus === 'paid' 
                                ? "bg-green-100 text-green-800" 
                                : "bg-orange-100 text-orange-800"
                            }`}>
                                {qrSlip.paymentStatus === 'paid' ? "✅ PAGADO" : "⏳ PENDIENTE"}
                            </span>
                        </div>
                    </div>

                    {/* Footer Validación */}
                    <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-100 mt-6 flex flex-col items-center">
                        <p className="text-xs text-gray-400 mb-2">Documento generado digitalmente por App Taxi Nort.</p>
                        {/* QR Pequeño para re-validar si se imprime */}
                        <div className="opacity-50 scale-75">
                             <QRCode value={window.location.href} size={64} />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Botón Descargar (Sin Icono, Solo Texto) */}
            <div className="mt-6">
                <Button className="bg-blue-600 text-white hover:bg-blue-700 shadow-lg px-8 py-6 text-lg" onClick={useReactToPrint({ contentRef: printRef, documentTitle: `Hoja_Ruta_${qrSlip.date}` })}>
                    Descargar
                </Button>
            </div>
        </div>
      );
  }

  // --- MODO NORMAL (DASHBOARD) ---

  const filteredSlips = slips.filter((slip: any) => {
    const search = searchTerm.toLowerCase();
    return (
      slip.driver?.name?.toLowerCase().includes(search) ||
      slip.vehicle?.plate?.toLowerCase().includes(search) ||
      slip.driver?.rut?.includes(search)
    );
  });

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(routeSlipSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      startTime: "08:00" 
    }
  });

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

  const handleCreateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartTime = e.target.value;
    setValue("startTime", newStartTime); 

    if (!newStartTime) return;

    const [hours, minutes] = newStartTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setHours(date.getHours() + 7);

    const endHours = date.getHours().toString().padStart(2, '0');
    const endMinutes = date.getMinutes().toString().padStart(2, '0');
    setCreateEndTime(`${endHours}:${endMinutes}`);
  };

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

  // 🟢 FUNCIÓN GENERADORA DE URL QR
  const getQrUrl = (slipId: string) => {
    if (typeof window !== 'undefined') {
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?mode=pdf&id=${slipId}`;
    }
    return '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Control Diario</h1>
          <p className="text-muted-foreground">Bitácora de servicios y estado de pagos.</p>
        </div>
        {user?.role === 'admin' && (
          <Button onClick={handleOpenCreate} className="gap-2 bg-zinc-950 text-white hover:bg-zinc-900">
            <Plus className="h-4 w-4" /> Nuevo Control Diario
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 bg-background p-2 rounded-lg border shadow-sm max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar por conductor o patente..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-0 focus-visible:ring-0 bg-transparent"
        />
      </div>

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
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => setViewSlip(slip)}>
                            <Eye className="h-4 w-4" />
                        </Button>
                        
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

      <Dialog open={isCreateFormOpen} onOpenChange={setIsCreateFormOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white text-black">
          <DialogHeader>
            <DialogTitle>Nuevo Control Diario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitCreate)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" {...register("date")} />
            </div>
            <div className="space-y-2">
              <Label>Conductor</Label>
              <Select onValueChange={(val) => setValue("driverId", val)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar conductor" /></SelectTrigger>
                <SelectContent>
                  {drivers.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name} ({d.rut})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vehículo</Label>
              <Select onValueChange={(val) => setValue("vehicleId", val)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar vehículo" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>{v.plate} - {v.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Inicio</Label>
                  <Input type="time" defaultValue="08:00" onChange={handleCreateTimeChange} required />
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Fin</Label>
                  <Input type="time" value={createEndTime} readOnly className="bg-gray-50 text-gray-500" disabled />
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsCreateFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-zinc-950 text-white hover:bg-zinc-900" disabled={createMutation.isPending}>Crear</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <EditControlModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
        dataToEdit={slipToEdit}
      />

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
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Vehículo</p>
                        <Badge variant="outline" className="text-lg font-mono px-3 py-1">{viewSlip?.vehicle?.plate}</Badge>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-sm text-muted-foreground">Fecha</p><p className="font-medium">{viewSlip?.date}</p></div>
                    <div><p className="text-sm text-muted-foreground">Horario</p><p className="font-medium">{viewSlip?.startTime && viewSlip?.endTime ? `${viewSlip.startTime} - ${viewSlip.endTime}` : getShiftLabel(viewSlip?.shift)}</p></div>
                    <div><p className="text-sm text-muted-foreground">Estado</p><span className={viewSlip?.paymentStatus === 'paid' ? "text-green-600 font-bold" : "text-orange-600 font-bold"}>{viewSlip?.paymentStatus === 'paid' ? "PAGADO" : "PENDIENTE"}</span></div>
                </div>
                <div className="bg-zinc-50 p-4 rounded-lg flex flex-col items-center justify-center border border-zinc-100 mt-4">
                    <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Escanear para validar</p>
                    <div className="bg-white p-2 rounded shadow-sm">
                        <QRCode value={getQrUrl(viewSlip?.id)} size={128} />
                    </div>
                </div>
            </div>
            <div className="p-4 bg-zinc-50 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={() => setViewSlip(null)}>Cerrar</Button>
                <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={handlePrint}>Descargar</Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}