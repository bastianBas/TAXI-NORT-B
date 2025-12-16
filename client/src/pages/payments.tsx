import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, Search, DollarSign, Eye, Edit, FileText, ExternalLink, X, Upload 
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// --- VALIDACIÓN DEL FORMULARIO ---
const insertPaymentSchema = z.object({
  routeSlipId: z.string().min(1, "Selecciona una hoja de ruta"),
  amount: z.string().min(1, "Monto requerido"),
  date: z.string().min(1, "Fecha requerida"),
});
type FormData = z.infer<typeof insertPaymentSchema>;

export default function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [viewFile, setViewFile] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- QUERY DE PAGOS ---
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const res = await fetch("/api/payments");
      if (!res.ok) throw new Error("Error al cargar pagos");
      return res.json();
    },
  });

  // --- QUERY DE HOJAS DE RUTA (Para el Select) ---
  const { data: routeSlips = [] } = useQuery({
    queryKey: ["route-slips-pending"],
    queryFn: async () => {
      const res = await fetch("/api/route-slips");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // --- FORM HOOK ---
  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(insertPaymentSchema),
    defaultValues: { amount: "", date: new Date().toISOString().split('T')[0], routeSlipId: "" }
  });

  // Abrir Modal Crear
  const handleOpenCreate = () => {
    setEditingPayment(null);
    setFile(null);
    reset({ amount: "", date: new Date().toISOString().split('T')[0], routeSlipId: "" });
    setIsModalOpen(true);
  };

  // Abrir Modal Editar
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

  // --- ENVÍO DEL FORMULARIO ---
  const onSubmit = async (data: FormData) => {
    try {
      const formData = new FormData();
      formData.append("routeSlipId", data.routeSlipId);
      formData.append("amount", data.amount);
      formData.append("date", data.date);
      formData.append("type", "transfer");
      
      const selectedSlip = routeSlips.find((s: any) => s.id === data.routeSlipId);
      if (selectedSlip) {
        formData.append("driverId", selectedSlip.driverId);
        formData.append("vehicleId", selectedSlip.vehicleId);
      }

      if (file) formData.append("proof", file);

      const url = editingPayment ? `/api/payments/${editingPayment.id}` : "/api/payments";
      const method = editingPayment ? "PUT" : "POST";

      const res = await fetch(url, { method, body: formData });
      if (!res.ok) throw new Error("Error al guardar");

      toast({ title: "Éxito", description: editingPayment ? "Pago actualizado" : "Pago registrado" });
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo guardar", variant: "destructive" });
    }
  };

  // --- FILTROS Y TOTALES ---
  const filteredPayments = payments.filter((p: any) => {
    const s = searchTerm.toLowerCase();
    const dName = p.routeSlip?.driver?.name?.toLowerCase() || "";
    const vPlate = p.routeSlip?.vehicle?.plate?.toLowerCase() || "";
    return dName.includes(s) || vPlate.includes(s);
  });
  const totalAmount = filteredPayments.reduce((sum: number, p: any) => sum + (parseInt(p.amount) || 0), 0);

  // 🟢 FUNCIÓN MAESTRA PARA RUTAS DE ARCHIVOS (Evita el error 404)
  const getFileUrl = (path: string) => {
    if (!path) return "";
    // Limpiamos la ruta: quitamos "uploads/" repetidos y barras invertidas
    const cleanName = path.split(/[/\\]/).pop(); 
    return `/uploads/${cleanName}`; 
  };
  const isPdf = (path: string) => path?.toLowerCase().endsWith(".pdf");

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pagos</h1>
          <p className="text-muted-foreground">Registro de pagos diarios de Hojas de Ruta</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 bg-zinc-950 hover:bg-zinc-900 text-white dark:bg-[#0f172a] dark:hover:bg-[#1e293b] dark:text-white dark:border dark:border-slate-800">
          <Plus className="h-4 w-4" /> Nuevo Pago
        </Button>
      </div>

      {/* CARDS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex justify-between pb-2"><h3 className="text-sm font-medium">Recaudación Total</h3><DollarSign className="h-4 w-4 text-green-600" /></div>
          <div className="text-2xl font-bold">${totalAmount.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex justify-between pb-2"><h3 className="text-sm font-medium">Total Pagos</h3><FileText className="h-4 w-4 text-blue-600" /></div>
          <div className="text-2xl font-bold">{filteredPayments.length}</div>
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="flex items-center gap-2 bg-background p-2 rounded-lg border shadow-sm max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por conductor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="border-0 focus-visible:ring-0 bg-transparent" />
      </div>

      {/* TABLA */}
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Fecha Hoja</TableHead>
              <TableHead>Conductor</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? ( <TableRow><TableCell colSpan={7} className="h-24 text-center">Cargando...</TableCell></TableRow> ) : 
             filteredPayments.length === 0 ? ( <TableRow><TableCell colSpan={7} className="h-24 text-center">No hay pagos.</TableCell></TableRow> ) : (
              filteredPayments.map((p: any) => (
                <TableRow key={p.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{p.routeSlip?.date}</TableCell>
                  <TableCell>{p.routeSlip?.driver?.name}</TableCell> 
                  <TableCell className="font-mono text-xs">{p.routeSlip?.vehicle?.plate}</TableCell>
                  <TableCell className="font-bold">${parseInt(p.amount).toLocaleString()}</TableCell>
                  <TableCell><Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">Pagado</Badge></TableCell>
                  <TableCell>
                    {p.proofOfPayment ? (
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-2" onClick={() => setViewFile(p.proofOfPayment)}>
                        <Eye className="h-3 w-3" /> Ver Archivo
                      </Button>
                    ) : <span className="text-xs text-muted-foreground">Sin archivo</span>}
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

      {/* 🟢 MODAL FORMULARIO (ESTILO RESTAURADO) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-zinc-950 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle>{editingPayment ? "Editar Pago" : "Nuevo Pago"}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Hoja de Ruta</Label>
              <Select onValueChange={(val) => setValue("routeSlipId", val)} defaultValue={watch("routeSlipId")} disabled={!!editingPayment}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white">
                  <SelectValue placeholder="Seleccionar hoja" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                  {(editingPayment ? routeSlips : routeSlips.filter((s:any) => s.paymentStatus !== 'paid')).map((s:any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.date} - {s.driver?.name} ({s.vehicle?.plate})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Monto a Pagar</Label>
                 <Input type="number" {...register("amount")} className="bg-zinc-900 border-zinc-800 text-white" />
               </div>
               <div className="space-y-2">
                 <Label>Fecha</Label>
                 <Input type="date" {...register("date")} className="bg-zinc-900 border-zinc-800 text-white" />
               </div>
            </div>

            <div className="space-y-2">
              <Label>Comprobante</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-400 truncate">
                  {file ? file.name : (editingPayment?.proofOfPayment ? "Archivo actual cargado" : "Seleccionar archivo...")}
                </div>
                <Label htmlFor="file-upload" className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2">
                  <Upload className="h-4 w-4" /> Nuevo
                </Label>
                <Input id="file-upload" type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white hover:bg-zinc-900">Cancelar</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Guardar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 🟢 MODAL VISUALIZADOR (ARREGLADO) */}
      <Dialog open={!!viewFile} onOpenChange={(open) => !open && setViewFile(null)}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 bg-zinc-950 border-zinc-800 flex flex-col overflow-hidden [&>button]:text-zinc-400">
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Eye className="h-4 w-4"/> Visualizador</h2>
            {viewFile && <a href={getFileUrl(viewFile)} target="_blank" rel="noreferrer" className="text-xs bg-blue-600 px-3 py-1 rounded text-white flex gap-1 items-center"><ExternalLink className="h-3 w-3"/> Original</a>}
          </div>
          <div className="flex-1 bg-zinc-900/50 flex justify-center items-center p-4 relative overflow-hidden">
             {viewFile && (
               isPdf(viewFile) ? (
                 <iframe src={getFileUrl(viewFile)} className="w-full h-full border-0 rounded bg-white" />
               ) : (
                 <img src={getFileUrl(viewFile)} className="max-w-full max-h-full object-contain rounded" alt="Comprobante" />
               )
             )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}