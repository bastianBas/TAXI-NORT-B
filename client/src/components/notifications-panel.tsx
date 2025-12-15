import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocation } from "wouter";

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useLocation();

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) setNotifications(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Actualiza cada 10 segundos
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (notif: any) => {
    if (!notif.read) {
        await fetch(`/api/notifications/${notif.id}/read`, { method: "PATCH" });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    }

    if (notif.link) {
        setLocation(notif.link);
        setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse border border-white" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b font-semibold bg-gray-50 flex justify-between items-center">
            <span>Notificaciones</span>
            {unreadCount > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{unreadCount} nuevas</span>}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 flex flex-col items-center gap-2">
              <Bell className="h-8 w-8 text-gray-300" />
              <p>Sin notificaciones</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 text-left border-b hover:bg-gray-50 transition-colors flex gap-3 ${
                    !notif.read ? "bg-blue-50/60" : ""
                  }`}
                >
                  {/* Icono según tipo */}
                  <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                        notif.type === 'gps_alert' ? 'bg-red-500' : 
                        notif.type === 'payment_due' ? 'bg-orange-500' : 'bg-blue-500'
                    }`} 
                  />
                  
                  <div className="flex-1">
                    <p className={`text-sm ${!notif.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {notif.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notif.message}</p>
                    <p className="text-[10px] text-gray-400 mt-2 text-right">
                        {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}