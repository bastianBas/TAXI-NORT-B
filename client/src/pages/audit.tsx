import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  ShieldCheck, 
  Search, 
  Filter,
  User,
  Calendar,
  Activity
} from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuditPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // 1. OBTENER DATOS REALES DEL BACKEND
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const res = await fetch("/api/audit-logs");
      if (!res.ok) throw new Error("Error al cargar auditoría");
      return res.json();
    },
    refetchInterval: 5000, // Se actualiza solo cada 5 segundos
  });

  // Filtro de búsqueda
  const filteredLogs = logs.filter((log: any) => {
    const searchLower = searchTerm.toLowerCase();
    const action = log.action?.toLowerCase() || "";
    const entity = log.entity?.toLowerCase() || "";
    const details = log.details?.toLowerCase() || "";
    const userName = log.user?.name?.toLowerCase() || "";
    
    return action.includes(searchLower) || 
           entity.includes(searchLower) || 
           details.includes(searchLower) ||
           userName.includes(searchLower);
  });

  // Colores para las acciones
  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREAR': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'MODIFICAR': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'ELIMINAR': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'REGISTRO': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* ENCABEZADO */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-blue-600" />
          Registro de Auditoría
        </h1>
        <p className="text-muted-foreground">
          Historial de seguridad y movimientos críticos del sistema.
        </p>
      </div>

      {/* BARRA DE BÚSQUEDA */}
      <div className="flex items-center gap-2 bg-background p-2 rounded-lg border shadow-sm max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por usuario, acción o detalle..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-0 focus-visible:ring-0 bg-transparent"
        />
      </div>

      {/* TABLA DE REGISTROS */}
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[180px]">Fecha y Hora</TableHead>
              <TableHead>Usuario Responsable</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Entidad Afectada</TableHead>
              <TableHead>Detalle del Cambio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">Cargando registros de seguridad...</TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No hay movimientos registrados.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log: any) => (
                <TableRow key={log.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <User className="h-3 w-3 text-slate-500" />
                      </div>
                      <span className="font-medium text-sm">
                        {log.user?.name || "Sistema / Desconocido"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`border-0 ${getActionColor(log.action)}`}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold text-foreground">
                      {log.entity}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-md truncate" title={log.details}>
                    {log.details}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}