import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  FileText, 
  Eye, 
  Edit, 
  Download, 
  QrCode 
} from "lucide-react";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { RouteSlipForm } from "@/components/route-slips/route-slip-form";
import { RouteSlipPdf } from "@/components/route-slips/pdf-design"; 
import { useToast } from "@/hooks/use-toast";

export default function RouteSlipsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewSlip, setViewSlip] = useState<any>(null); 
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. OBTENER DATOS
  const { data: routeSlips = [], isLoading } = useQuery({
    queryKey: ["route-slips"],
    queryFn: async () => {
      const res = await fetch("/api/route-slips");
      if (!res.ok) throw new Error("Error al cargar hojas de ruta");
      return res.json();
    },
  });

  // Filtro
  const filteredSlips = routeSlips.filter((slip: any) => {
    const searchLower = searchTerm.toLowerCase();
    const driverName = slip.driver?.name?.toLowerCase() || "";
    const vehiclePlate = slip.vehicle?.plate?.toLowerCase() || "";
    return driverName.includes(searchLower) || vehiclePlate.includes(searchLower);
  });

  return (
    <div className="space-y-6">
      {/* ENCABEZADO PAGINA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Control Diario</h1>
          <p className="text-muted-foreground">
            Bitácora de servicios y estado de pagos.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo Control Diario
        </Button>
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

      {/* TABLA */}
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
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Cargando registros...
                </TableCell>
              </TableRow>
            ) : filteredSlips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 text-muted-foreground/50" />
                    <p>No se encontraron controles diarios.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredSlips.map((slip: any) => (
                <TableRow key={slip.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{slip.date}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{slip.driver?.name || "Desconocido"}</span>
                      <span className="text-xs text-muted-foreground">{slip.driver?.rut || "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono bg-muted/50">{slip.vehicle?.plate || "S/P"}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{slip.startTime} - {slip.endTime}</TableCell>
                  <TableCell>
                    {slip.paymentStatus === 'paid' ? (
                      <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800">Pagado</Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/30">Pendiente</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {slip.signatureUrl ? (
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">Firmado</span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Pendiente</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setViewSlip(slip)}>
                        <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* MODAL CREAR */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Control Diario</DialogTitle>
          </DialogHeader>
          <RouteSlipForm 
            onSuccess={() => {
              setIsCreateOpen(false);
              queryClient.invalidateQueries({ queryKey: ["route-slips"] });
              toast({ title: "Éxito", description: "Hoja de ruta creada correctamente" });
            }} 
          />
        </DialogContent>
      </Dialog>

      {/* MODAL VISUALIZAR PDF (Adaptado al Tema Oscuro/Claro) */}
      {viewSlip && (
        <Dialog open={!!viewSlip} onOpenChange={(open) => !open && setViewSlip(null)}>
          {/* 🟢 CAMBIO: Usamos 'bg-background' y 'border-border' para que coincida con el tema (Negro/Blanco).
              La X ahora usa 'text-muted-foreground' para que se vea bien en ambos modos.
          */}
          <DialogContent className="max-w-4xl h-[90vh] p-0 overflow-hidden flex flex-col bg-background border-border [&>button]:text-muted-foreground [&>button]:hover:text-foreground">
            
            {/* 1. ENCABEZADO */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 text-foreground">
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Hoja de Ruta #{viewSlip.id.substring(0, 8)}...
                </h2>
                <p className="text-xs text-muted-foreground">
                  Vista previa del documento generado.
                </p>
              </div>
            </div>

            {/* 2. CUERPO (Visor PDF) */}
            <div className="flex-1 w-full h-full relative bg-zinc-100/5 dark:bg-zinc-900/50 flex justify-center items-center">
              {/* El PDFViewer siempre mostrará el papel blanco, eso es correcto para impresión */}
              <PDFViewer width="100%" height="100%" className="border-none" showToolbar={false}>
                <RouteSlipPdf 
                  data={{
                    id: viewSlip.id,
                    date: viewSlip.date,
                    driverName: viewSlip.driver?.name || "Desconocido",
                    vehiclePlate: viewSlip.vehicle?.plate || "S/P",
                    startTime: viewSlip.startTime,
                    endTime: viewSlip.endTime,
                    paymentStatus: viewSlip.paymentStatus
                  }} 
                />
              </PDFViewer>
            </div>

            {/* 3. PIE DE PÁGINA (Botones integrados al tema) */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-card/50">
                <Button variant="outline" size="sm" className="gap-2 hidden sm:flex">
                  <QrCode className="h-4 w-4" /> Mostrar QR Móvil
                </Button>
                
                <PDFDownloadLink
                  document={
                    <RouteSlipPdf 
                      data={{
                        id: viewSlip.id,
                        date: viewSlip.date,
                        driverName: viewSlip.driver?.name || "Desconocido",
                        vehiclePlate: viewSlip.vehicle?.plate || "S/P",
                        startTime: viewSlip.startTime,
                        endTime: viewSlip.endTime,
                        paymentStatus: viewSlip.paymentStatus
                      }} 
                    />
                  }
                  fileName={`HojaRuta-${viewSlip.date}.pdf`}
                >
                  {/* @ts-ignore */}
                  {({ loading }) => (
                    <Button size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      {loading ? "Generando..." : "Descargar PDF"}
                    </Button>
                  )}
                </PDFDownloadLink>
            </div>

          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}