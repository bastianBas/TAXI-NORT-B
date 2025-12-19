import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, Search, Eye, Edit, X, Loader2, FileX, Printer
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  // =================================================================
  // 🟢 LÓGICA DE VISTA PÚBLICA (QR) - INSERCIÓN SEGURA
  // =================================================================
  const isPublicView = window.location.pathname === "/public-view";
  const params = new URLSearchParams(window.location.search);
  const publicId = params.get("id");

  // Query Pública
  const { data: publicSlip, isLoading: isLoadingPublic } = useQuery({
    queryKey: ["public-slip", publicId],
    queryFn: async () => {
      const res = await fetch(`/api/public/route-slips/${publicId}`);
      if (!res.ok) throw new Error("Documento no encontrado");
      return res.json();
    },
    enabled: isPublicView && !!publicId
  });

  // Efecto Auto-Descarga
  useEffect(() => {
    if (isPublicView && publicSlip) {
        const timer = setTimeout(() => handlePrint(), 800);
        return () => clearTimeout(timer);
    }
  }, [isPublicView, publicSlip]);

  // --- CARGA DE DATOS NORMAL (Solo si NO es público) ---
  const { data: slips = [], isLoading } = useQuery({
    queryKey: ["route-slips"],
    queryFn: async () => {
      const res = await fetch("/api/route-slips");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !isPublicView && !!user // IMPORTANTE: No cargar si es público
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const res = await fetch("/api/drivers");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !isPublicView && !!user
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const res = await fetch("/api/vehicles");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !isPublicView && !!user
  });

  // 🟢 MANEJO DE IMPRESIÓN UNIFICADO
  const documentToPrint = isPublicView ? publicSlip : (viewSlip || null);
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: documentToPrint ? `Hoja_Ruta_${documentToPrint.date}` : "Hoja_Ruta",
  });

  // 🟢 RENDERIZADO DEL MODO PÚBLICO
  if (isPublicView) {
      if (isLoadingPublic) {
          return (
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 text-center">
                <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-600 font-medium">Cargando documento...</p>
            </div>
          );
      }

      if (!publicSlip) {
          return (
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 text-center">
                <FileX className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-bold text-gray-900">Documento no disponible</h3>
                <p className="text-gray-500 max-w-xs mt-2">Enlace inválido o expirado.</p>
            </div>
          );
      }

      return (
        <div className="min-h-screen bg-white p-0 flex flex-col items-center justify-start font-sans">
            <div className="w-full max-w-[800px] p-8" ref={printRef}>
                <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-black uppercase tracking-tight">Hoja de Ruta</h1>
                        <p className="text-sm text-gray-500 mt-1 font-mono">ID: {publicSlip.id?.slice(0,8)}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-black border-2 border-black px-4 py-1 inline-block mb-2">
                            {/* 🟢 MODIFICACIÓN: Uso de snapshot patente */}
                            {publicSlip.vehicle?.plate || publicSlip.vehiclePlateSnapshot}
                        </div>
                        <p className="text-sm font-bold text-gray-400 uppercase">Taxi Nort S.A.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-y-8 gap-x-12 mb-8">
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Conductor</p>
                        {/* 🟢 MODIFICACIÓN: Uso de snapshot nombre */}
                        <p className="text-xl font-medium text-black">{publicSlip.driver?.name || publicSlip.driverNameSnapshot}</p>
                        <p className="text-sm text-gray-500">{publicSlip.driver?.rut || "---"}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Fecha</p>
                        <p className="text-xl font-medium text-black">{publicSlip.date}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Horario</p>
                        <p className="text-xl font-medium text-black">
                            {publicSlip.startTime && publicSlip.endTime 
                                ? `${publicSlip.startTime} - ${publicSlip.endTime}` 
                                : getShiftLabel(publicSlip.shift)
                            }
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Estado</p>
                        <div className={`inline-block px-3 py-1 rounded text-sm font-bold border ${
                            publicSlip.paymentStatus === 'paid' 
                            ? "bg-green-50 text-green-700 border-green-200" 
                            : "bg-orange-50 text-orange-700 border-orange-200"
                        }`}>
                            {publicSlip.paymentStatus === 'paid' ? "PAGADO" : "PENDIENTE DE PAGO"}
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-gray-900">Validación Digital</p>
                        <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                            Escanee para verificar la autenticidad.
                        </p>
                    </div>
                    <div className="border p-2 bg-white">
                        <QRCode value={window.location.href} size={80} />
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t text-center print:hidden shadow-lg">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg" onClick={handlePrint}>
                    Descargar PDF
                </Button>
            </div>
        </div>
      );
  }

  // --- FIN MODO PÚBLICO ---
  // --- INICIO MODO NORMAL (DASHBOARD) ---

  const filteredSlips = slips.filter((slip: any) => {
    const search = searchTerm.toLowerCase();
    // 🟢 MODIFICACIÓN: El filtrado ahora también busca en los snapshots históricos
    const driverName = (slip.driver?.name || slip.driverNameSnapshot || "").toLowerCase();
    const vehiclePlate = (slip.vehicle?.plate || slip.vehiclePlateSnapshot || "").toLowerCase();
    const driverRut = (slip.driver?.rut || "").toLowerCase();

    return (
      driverName.includes(search) ||
      vehiclePlate.includes(search) ||
      driverRut.includes(search)
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
              // 🟢 MODIFICACIÓN: Muestra el nombre histórico si el objeto driver es null
              nombre: slip.driver?.name || slip.driverNameSnapshot || "Conductor Desconocido" 
          },
          vehiculo: { 
              id: slip.vehicleId, 
              // 🟢 MODIFICACIÓN: Muestra patente histórica
              patente: slip.vehicle?.plate || slip.vehiclePlateSnapshot || "Sin Patente" 
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

  const getQrUrl = (slipId: string) => {
    if (typeof window !== 'undefined') {
        const baseUrl = window.location.origin;
        return `${baseUrl}/public-view?id=${slipId}`;
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
                        {/* 🟢 MODIFICACIÓN: Muestra el nombre histórico si la relación driver ya no existe */}
                        <span className="font-medium">{slip.driver?.name || slip.driverNameSnapshot}</span>
                        <span className="text-xs text-muted-foreground">{slip.driver?.rut || "---"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono bg-zinc-100 text-zinc-800 border-zinc-200">
                        {/* 🟢 MODIFICACIÓN: Muestra patente histórica */}
                        {slip.vehicle?.plate || slip.vehiclePlateSnapshot}
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
                        {/* 🟢 MODIFICACIÓN: Muestra el nombre histórico en el detalle del slip */}
                        <p className="text-lg font-bold">{viewSlip?.driver?.name || viewSlip?.driverNameSnapshot}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Vehículo</p>
                        {/* 🟢 MODIFICACIÓN: Muestra patente histórica */}
                        <Badge variant="outline" className="text-lg font-mono px-3 py-1">{viewSlip?.vehicle?.plate || viewSlip?.vehiclePlateSnapshot}</Badge>
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