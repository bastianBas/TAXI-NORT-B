import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ClipboardList, Plus, Pencil, Trash2, Clock } from "lucide-react";
import type { AuditLog } from "@shared/schema";

export default function Audit() {
  const { data: auditLogs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit"],
  });

  const getActionIcon = (action: string) => {
    if (action.toLowerCase().includes("create")) return <Plus className="h-3 w-3" />;
    if (action.toLowerCase().includes("update")) return <Pencil className="h-3 w-3" />;
    if (action.toLowerCase().includes("delete")) return <Trash2 className="h-3 w-3" />;
    return <Clock className="h-3 w-3" />;
  };

  const getActionVariant = (action: string): "default" | "secondary" | "destructive" => {
    if (action.toLowerCase().includes("create")) return "default";
    if (action.toLowerCase().includes("update")) return "secondary";
    if (action.toLowerCase().includes("delete")) return "destructive";
    return "secondary";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('es-CL'),
      time: date.toLocaleTimeString('es-CL'),
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Auditoría</h1>
        <p className="text-sm text-muted-foreground">
          Registro de todas las acciones realizadas en el sistema
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Eventos</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditLogs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Creaciones</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auditLogs?.filter(log => log.action.toLowerCase().includes('create')).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Elementos nuevos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actualizaciones</CardTitle>
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auditLogs?.filter(log => log.action.toLowerCase().includes('update')).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Modificaciones</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eliminaciones</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auditLogs?.filter(log => log.action.toLowerCase().includes('delete')).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Elementos eliminados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registro de Actividad</CardTitle>
          <CardDescription>
            Historial cronológico de todas las operaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !auditLogs || auditLogs.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No hay registros</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Los eventos del sistema aparecerán aquí
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha y Hora</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead>Detalles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => {
                    const { date, time } = formatTimestamp(log.timestamp || new Date());
                    return (
                      <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{date}</span>
                            <span className="text-xs text-muted-foreground">{time}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {getInitials(log.userName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{log.userName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionVariant(log.action)} className="gap-1">
                            {getActionIcon(log.action)}
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {log.entity}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {log.details || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
