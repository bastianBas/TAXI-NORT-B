import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Calendar, 
  User, 
  Car, 
  Printer, 
  Download,
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

// Validación del formulario
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
    case 'tarde': return '14:00 - 00:00'; // Ajustado según lo común, puedes editarlo
    case 'noche': return '20:00 - 06:00';
    default: return '09:00 - 19:00'; // Default
  }
};

export default function RouteSlipsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estado para Crear/Editar
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  // Configuración del Formulario
  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(routeSlipSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      shift: "mañana"
    }
  });

  // --- LÓGICA DE APERTURA DE MODALES ---

  // Abrir para CREAR
  const handleOpenCreate = () => {
    setEditingId(null); // No estamos editando
    reset({
      date: new Date().toISOString().split('T')[0],
      shift: "mañana",
      driverId: "",
      vehicleId: ""
    });
    setIsFormOpen(true);
  };

  // Abrir para EDITAR (Botón Lápiz)
  const handleOpenEdit = (slip: any) => {
    setEditingId(slip.id); // Guardamos el ID que estamos editando
    // Rellenamos el formulario con los datos existentes
    reset({
      date: slip.date,
      shift: slip.shift,
      driverId: slip.driverId,
      vehicleId: slip.vehicleId
    });
    setIsFormOpen(true);
  };

  // --- MUTACIONES (GUARDAR / EDITAR) ---
  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = { ...data, status: 'active' }; // status por defecto

      let url = "/api/route-slips";
      let method = "POST";

      // Si hay un ID editando, cambiamos a PUT (Actualizar)
      if (editingId) {
        url = `/api/route-slips/${editingId}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" }, // Enviamos JSON siempre
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Error al guardar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["route-slips"] });
      toast({ title: "Éxito", description: editingId ? "Registro actualizado" : "Registro creado" });
      setIsFormOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo guardar la operación", variant: "destructive" });
    }
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  // --- IMPRESIÓN ---
  const handlePrint = useReactToPrint({
    contentRef: printRef, // Usamos la sintaxis nueva para evitar errores de TS
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
                  {/* Visualización del horario según el turno */}
                  <TableCell className="text-muted-foreground text-sm">
                    {getShiftLabel(slip.shift)}
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
                        {/* Botón EDITAR (Activado) */}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100" onClick={() => handleOpenEdit(slip)}>
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

      {/* MODAL FORMULARIO (CREAR / EDITAR) */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white text-black">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Control Diario" : "Nuevo Control Diario"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
            
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" {...register("date")} />
            </div>

            <div className="space-y-2">
              <Label>Conductor</Label>
              <Select 
                onValueChange={(val) => setValue("driverId", val)} 
                defaultValue={editingId ? undefined : ""} // Reset logic
                value={editingId ? undefined : undefined} // Dejamos que react-hook-form controle
              >
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
              <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-zinc-950 text-white hover:bg-zinc-900" disabled={mutation.isPending}>
                {mutation.isPending ? "Guardando..." : (editingId ? "Guardar Cambios" : "Crear")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
                        <p className="font-medium">{getShiftLabel(viewSlip?.shift)}</p>
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