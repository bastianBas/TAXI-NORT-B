import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  X,
  Printer
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

// IMPORTAMOS TU NUEVO COMPONENTE
import EditControlModal from "@/components/EditControlModal";

// Validación del formulario (Solo para CREAR)
const routeSlipSchema = z.object({
  driverId: z.string().min(1, "Selecciona un conductor"),
  vehicleId: z.string().min(1, "Selecciona un vehículo"),
  date: z.string().min(1, "Selecciona una fecha"),
  shift: z.string().min(1, "Selecciona un turno"),
});

type FormData = z.infer<typeof routeSlipSchema>;

// Helper para mostrar los horarios según el turno seleccionado
const getShiftLabel = (shift: string) => {
  switch(shift) {
    case 'mañana': return '08:00 - 18:00';
    case 'tarde': return '14:00 - 00:00'; 
    case 'noche': return '20:00 - 06:00';
    default: return '09:00 - 19:00'; 
  }
};

export default function RouteSlipsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estado para Crear (Formulario antiguo)
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);

  // --- NUEVOS ESTADOS PARA EL MODAL DE EDICIÓN ---
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
      shift: "mañana"
    }
  });

  // --- LÓGICA DE APERTURA DE MODALES ---

  // Abrir para CREAR (Usa el modal antiguo)
  const handleOpenCreate = () => {
    reset({
      date: new Date().toISOString().split('T')[0],
      shift: "mañana",
      driverId: "",
      vehicleId: ""
    });
    setIsCreateFormOpen(true);
  };

  // Abrir para EDITAR (Usa el NUEVO modal EditControlModal)
  const handleOpenEdit = (slip: any) => {
    // Mapeamos los datos de tu tabla al formato que espera EditControlModal
    // Asumimos que 'slip' tiene driver y vehicle populados
    const dataFormatted = {
        fecha: slip.date,
        conductor: { 
            id: slip.driverId, // ID original
            nombre: slip.driver?.name || "Conductor Desconocido" 
        },
        vehiculo: { 
            id: slip.vehicleId, // ID original
            patente: slip.vehicle?.plate || "Sin Patente" 
        },
        // Si ya tienes horaInicio en tu DB úsala, si no, pon un default basado en el turno antiguo o vacío
        horaInicio: slip.startTime || "08:00", 
        horaFin: slip.endTime || "15:00"
    };

    setSlipToEdit(dataFormatted);
    setIsEditModalOpen(true);
  };

  // --- MUTACIÓN PARA CREAR (POST) ---
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = { ...data, status: 'active' }; 
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
      toast({ title: "Éxito", description: "Registro creado correctamente" });
      setIsCreateFormOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear el registro", variant: "destructive" });
    }
  });

  // --- FUNCION PARA GUARDAR EDICIÓN (PUT) DESDE EL NUEVO MODAL ---
  const handleSaveEdit = async (formData: any) => {
    try {
        // Preparamos el payload con los campos nuevos de hora
        const payload = {
            // Necesitamos el ID original de la hoja de ruta. 
            // Como slipToEdit es un objeto formateado, buscaremos el ID en el objeto original 'slips' si es necesario
            // o lo pasamos si lo hubieramos guardado.
            // TRUCO: Buscamos el slip original que coincida con fecha y conductor para obtener el ID, 
            // o mejor, guardamos el ID en el estado slipToEdit al abrir el modal.
            
            // NOTA: Para simplificar, asumiremos que slipToEdit tiene el ID de la ruta si lo agregamos en handleOpenEdit.
            // Voy a ajustar handleOpenEdit abajo para incluir el ID de la ruta.
            
            date: formData.fecha,
            driverId: formData.conductorId,
            vehicleId: formData.vehiculoId,
            startTime: formData.horaInicio, // NUEVO CAMPO
            endTime: formData.horaFin,      // NUEVO CAMPO
            shift: 'personalizado' // Opcional: marcamos que es horario manual
        };

        // NOTA IMPORTANTE: Necesitamos el ID del registro para hacer el PUT.
        // Lo recuperamos del estado viewSlip o del objeto original.
        // Aquí usaré una lógica segura buscando en el array 'slips' el registro actual siendo editado
        // o asumiendo que lo pasamos. Lo más limpio es modificar handleOpenEdit un poco.
        
        // Hacemos la petición
        // OJO: formData.id debe venir del modal si lo pasamos, si no, usaremos 'slipToEdit.id'
        const url = `/api/route-slips/${slipToEdit.id}`; 
        
        const res = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Error al actualizar");

        queryClient.invalidateQueries({ queryKey: ["route-slips"] });
        toast({ title: "Actualizado", description: "Se han guardado los cambios y el horario de 7 horas." });
        setIsEditModalOpen(false);

    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "No se pudo actualizar.", variant: "destructive" });
    }
  };

  // Ajuste en handleOpenEdit para pasar el ID correctamente
  const handleOpenEditWithId = (slip: any) => {
      const dataFormatted = {
          id: slip.id, // GUARDAMOS EL ID DEL REGISTRO
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

  const onSubmitCreate = (data: FormData) => {
    createMutation.mutate(data);
  };

  // --- IMPRESIÓN ---
  const handlePrint = useReactToPrint({
    contentRef: printRef, 
    documentTitle: viewSlip ? `Hoja_Ruta_${viewSlip.date}` : "Hoja_Ruta",
  });

  return (
    <div className="space-y-6">
      {/* CABECERA */}
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
                  {/* Visualización del horario: Priorizamos hora personalizada si existe */}
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
                        {/* Botón EDITAR (Modificado para usar handleOpenEditWithId) */}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100" onClick={() => handleOpenEditWithId(slip)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* MODAL FORMULARIO (SOLO PARA CREAR) */}
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
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar conductor" />
                </SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar vehículo" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>{v.plate} - {v.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Turno / Horario</Label>
              <Select onValueChange={(val) => setValue("shift", val)} defaultValue="mañana">
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar turno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mañana">Mañana (08:00 - 18:00)</SelectItem>
                  <SelectItem value="tarde">Tarde (14:00 - 00:00)</SelectItem>
                  <SelectItem value="noche">Noche (20:00 - 06:00)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsCreateFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-zinc-950 text-white hover:bg-zinc-900" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Guardando..." : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* NUEVO MODAL DE EDICIÓN (INTEGRADO) */}
      <EditControlModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
        dataToEdit={slipToEdit}
      />

      {/* MODAL DE VISUALIZACIÓN / QR / DESCARGA */}
      <Dialog open={!!viewSlip} onOpenChange={(open) => !open && setViewSlip(null)}>
        <DialogContent className="sm:max-w-[600px] bg-white text-black p-0 overflow-hidden">
            <div className="p-6 pb-0 flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold">Detalle de Hoja de Ruta</h2>
                    <p className="text-sm text-muted-foreground">ID: {viewSlip?.id?.slice(0,8)}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setViewSlip(null)}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* CONTENIDO IMPRIMIBLE */}
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
                        {/* Ajuste en visualización para mostrar hora real si existe */}
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

                {/* SECCIÓN QR */}
                <div className="bg-zinc-50 p-4 rounded-lg flex flex-col items-center justify-center border border-zinc-100 mt-4">
                    <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Escanear para validar</p>
                    <div className="bg-white p-2 rounded shadow-sm">
                        <QRCode 
                            value={JSON.stringify({
                                id: viewSlip?.id,
                                conductor: viewSlip?.driver?.name,
                                patente: viewSlip?.vehicle?.plate,
                                fecha: viewSlip?.date,
                                estado: viewSlip?.paymentStatus
                            })}
                            size={128}
                        />
                    </div>
                </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={() => setViewSlip(null)}>Cerrar</Button>
                <Button className="gap-2 bg-blue-600 text-white hover:bg-blue-700" onClick={handlePrint}>
                    <Printer className="h-4 w-4" /> Imprimir / Guardar como PDF
                </Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}