import { useState } from "react";
import { Bell, Check, Info, AlertTriangle, DollarSign } from "lucide-react";
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

// Helper para iconos según el título o tipo de notificación
const getIcon = (type: string, title: string) => {
    if (type === 'warning' || title.includes('Pendiente')) return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    if (type === 'success' || title.includes('Pago')) return <DollarSign className="h-4 w-4 text-green-500" />;
    return <Info className="h-4 w-4 text-blue-500" />;
};

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // 1. CARGAR NOTIFICACIONES (CON POLLING DE 5 SEGUNDOS)
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) return [];
      return res.json();
    },
    // 🟢 ESTO HACE LA MAGIA: Actualiza solo cada 5 segundos
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
          <Bell className="h-5 w-5 text-gray-600" />
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
                  className={`flex flex-col gap-1 p-4 border-b hover:bg-muted/50 transition-colors ${
                    !notif.read ? "bg-blue-50/30" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link href={notif.link || "#"} onClick={() => {
                        if(!notif.read) handleMarkAsRead(notif.id);
                        setOpen(false);
                    }}>
                        <div className="flex items-center gap-2 cursor-pointer group">
                            {getIcon(notif.type, notif.title)}
                            <span className="text-sm font-medium group-hover:underline">
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
                  <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                    {notif.message}
                  </p>
                  <span className="text-[10px] text-muted-foreground/70 pl-6">
                    {format(new Date(notif.timestamp), "d MMM, HH:mm", { locale: es })}
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