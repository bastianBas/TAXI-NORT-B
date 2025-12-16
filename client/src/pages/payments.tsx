import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  DollarSign,
  Eye,
  Edit,
  FileText,
  ExternalLink,
  X
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
import { PaymentForm } from "@/components/payments/payment-form"; 
import { useToast } from "@/hooks/use-toast";

export default function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [viewFile, setViewFile] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const res = await fetch("/api/payments");
      if (!res.ok) throw new Error("Error al cargar pagos");
      return res.json();
    },
  });

  const filteredPayments = payments.filter((p: any) => {
    const searchLower = searchTerm.toLowerCase();
    const driverName = p.routeSlip?.driver?.name?.toLowerCase() || "";
    const vehiclePlate = p.routeSlip?.vehicle?.plate?.toLowerCase() || "";
    return driverName.includes(searchLower) || vehiclePlate.includes(searchLower);
  });

  const totalAmount = filteredPayments.reduce((sum: number, p: any) => sum + (parseInt(p.amount) || 0), 0);

  // 🟢 CORRECCIÓN DE RUTA DE ARCHIVO
  // Esta función asegura que la ruta siempre sea "/uploads/archivo.ext"
  // y elimina duplicados como "/uploads/uploads/..."
  const getFileUrl = (path: string) => {
    if (!path) return "";
    // Obtenemos solo el nombre del archivo final
    const filename = path.split('\\').pop()?.split('/').pop();
    return `/uploads/${filename}`;
  };

  const isPdf = (path: string) => {
    return path?.toLowerCase().endsWith(".pdf");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pagos</h1>
          <p className="text-muted-foreground">Registro de pagos diarios de Hojas de Ruta</p>
        </div>
        <Button 
          onClick={() => setIsCreateOpen(true)} 
          className="gap-2 bg-zinc-950 hover:bg-zinc-900 text-white dark:bg-[#0f172a] dark:hover:bg-[#1e293b] dark:text-white dark:border dark:border-slate-800"
        >
          <Plus className="h-4 w-4" /> Nuevo Pago
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Recaudación Total</h3>
            <DollarSign className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold">${totalAmount.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">En los registros filtrados</p>
        </div>
        
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Total Pagos</h3>
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold">{filteredPayments.length}</div>
          <p className="text-xs text-muted-foreground">Registrados</p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-background p-2 rounded-lg border shadow-sm max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por conductor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-0 focus-visible:ring-0 bg-transparent"
        />
      </div>

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
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center">Cargando...</TableCell></TableRow>
            ) : filteredPayments.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No hay pagos registrados.</TableCell></TableRow>
            ) : (
              filteredPayments.map((p: any) => (
                <TableRow key={p.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{p.routeSlip?.date}</TableCell>
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
                        onClick={() => setViewFile(p.proofOfPayment)}
                      >
                        <Eye className="h-3 w-3" /> Ver Archivo
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin archivo</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditingPayment(p)}>
                      <Edit className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* MODAL CREAR */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo Pago</DialogTitle></DialogHeader>
          <PaymentForm onSuccess={() => { setIsCreateOpen(false); queryClient.invalidateQueries({ queryKey: ["payments"] }); }} />
        </DialogContent>
      </Dialog>

      {/* MODAL EDITAR */}
      <Dialog open={!!editingPayment} onOpenChange={(open) => !open && setEditingPayment(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Pago</DialogTitle></DialogHeader>
          {editingPayment && (
            <PaymentForm 
              initialData={editingPayment}
              onSuccess={() => { setEditingPayment(null); queryClient.invalidateQueries({ queryKey: ["payments"] }); }} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 🟢 MODAL VISUALIZADOR DE ARCHIVO (Corregido para 404) */}
      <Dialog open={!!viewFile} onOpenChange={(open) => !open && setViewFile(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden bg-zinc-950 border-zinc-800 [&>button]:text-zinc-400 [&>button]:hover:text-white">
          
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900 text-white">
            <DialogTitle className="text-sm font-medium flex items-center gap-2">
               <FileText className="h-4 w-4" /> Visualizador de Comprobante
            </DialogTitle>
            {viewFile && (
                <a 
                  href={getFileUrl(viewFile)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md flex items-center gap-2"
                >
                  <ExternalLink className="h-3 w-3" /> Abrir Original
                </a>
            )}
          </div>
          
          <div className="flex-1 bg-zinc-900/50 flex items-center justify-center relative w-full h-full overflow-hidden p-4">
            {viewFile ? (
              isPdf(viewFile) ? (
                <iframe 
                  src={getFileUrl(viewFile)} 
                  className="w-full h-full border-none rounded bg-white"
                  title="Comprobante PDF"
                />
              ) : (
                <img 
                  src={getFileUrl(viewFile)} 
                  alt="Comprobante" 
                  className="max-w-full max-h-full object-contain rounded shadow-lg"
                  onError={(e) => {
                    // Si falla la carga, mostramos un mensaje amigable
                    (e.target as HTMLImageElement).style.display = 'none';
                    toast({ title: "Error", description: "No se pudo cargar la imagen", variant: "destructive" });
                  }}
                />
              )
            ) : (
                <p className="text-zinc-500">No hay archivo seleccionado</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}