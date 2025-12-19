import { useState } from "react";
import { Bell, Check, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "wouter";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// 🟢 HELPER: Iconos según el tipo de notificación
const getIcon = (type: string) => {
    if (type === 'warning') return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    if (type === 'success') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    return <Info className="h-4 w-4 text-blue-500" />;
};

// 🟢 HELPER: Color de fondo según importancia
const getBgColor = (type: string, read: boolean) => {
    if (read) return "bg-white hover:bg-gray-50"; // Leído = Blanco
    if (type === 'warning') return "bg-orange-50 hover:bg-orange-100 border-l-4 border-orange-500"; // Deuda = Naranja
    if (type === 'success') return "bg-green-50 hover:bg-green-100 border-l-4 border-green-500"; // Pago = Verde
    return "bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-500"; // Info = Azul
};

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // 1. CARGA AUTOMÁTICA (POLLING)
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) return [];
      return res.json();
    },
    // 🟢 IMPORTANTE: Esto hace que se actualice solo cada 5 segundos
    refetchInterval: 5000, 
  });

  // 2. MARCAR COMO LEÍDA
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {/* Si hay notificaciones, la campana vibra (animate-pulse) y cambia de color */}
          <Bell className={`h-5 w-5 ${unreadCount > 0 ? "text-orange-600 animate-pulse" : "text-gray-600"}`} />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full text-[10px]"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold leading-none">Notificaciones</h4>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {unreadCount} sin leer
            </span>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No tienes notificaciones
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notif: any) => (
                <div
                  key={notif.id}
                  className={`flex flex-col gap-1 p-4 border-b transition-colors ${getBgColor(notif.type, notif.read)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link href={notif.link || "#"} onClick={() => {
                        if(!notif.read) handleMarkAsRead(notif.id);
                        setOpen(false);
                    }}>
                        <div className="flex items-center gap-2 cursor-pointer group">
                            {getIcon(notif.type)}
                            <span className="text-sm font-bold group-hover:underline text-gray-800">
                                {notif.title}
                            </span>
                        </div>
                    </Link>
                    {!notif.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-muted-foreground hover:text-primary"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notif.id);
                        }}
                        title="Marcar como leída"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed pl-6">
                    {notif.message}
                  </p>
                  <span className="text-[10px] text-muted-foreground/70 pl-6">
                    {/* Nos aseguramos de leer la fecha correctamente */}
                    {format(new Date(notif.timestamp || notif.createdAt || new Date()), "d MMM, HH:mm", { locale: es })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}