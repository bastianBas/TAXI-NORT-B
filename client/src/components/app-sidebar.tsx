import { Home, Users, Truck, FileText, LogOut, ShieldCheck, DollarSign, Menu, X } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsPanel } from "@/components/notifications-panel"; // Asegúrate de tener este componente

const items = [
  { title: "Dashboard", url: "/", icon: Home, roles: [] },
  { title: "Conductores", url: "/drivers", icon: Users, roles: ["admin", "operator"] },
  { title: "Vehículos", url: "/vehicles", icon: Truck, roles: ["admin", "operator"] },
  { title: "Hojas de Ruta", url: "/route-slips", icon: FileText, roles: ["admin", "operator", "driver", "finance"] },
  { title: "Pagos", url: "/payments", icon: DollarSign, roles: ["admin", "finance", "driver"] },
  { title: "Auditoría", url: "/audit", icon: ShieldCheck, roles: ["admin"] },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 🟢 SALIDA INMEDIATA DEL MAPA
  const handleLogout = async () => {
    if (user?.role === 'driver') {
      try {
        // Enviar señal de muerte al servidor (keepalive es clave)
        await fetch("/api/vehicle-locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: 'offline' }),
          keepalive: true
        });
      } catch (e) { console.error(e); }
    }
    // Cerrar sesión
    logoutMutation.mutate();
  };

  const filteredItems = items.filter(item => 
    !(item.roles.length > 0 && user?.role && !item.roles.includes(user.role))
  );

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur shadow-sm">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden -ml-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
            <Link href="/"><div className="flex items-center gap-3 cursor-pointer"><span className="font-bold text-xl tracking-tight">TaxiNort</span></div></Link>
          </div>
          <nav className="hidden lg:flex items-center gap-1">
            {filteredItems.map((item) => {
              const isActive = location === item.url;
              return (
                <Link key={item.title} href={item.url}>
                  <Button variant="ghost" className={cn("text-sm font-medium h-9 px-4 rounded-full", isActive ? "bg-primary/10 text-primary" : "text-muted-foreground")}>
                    <item.icon className="mr-2 h-4 w-4" /> {item.title}
                  </Button>
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <NotificationsPanel />
            <ThemeToggle />
            <div className="hidden md:flex flex-col items-end leading-none mr-1">
              <span className="text-sm font-semibold">{user?.name}</span>
              <span className="text-[10px] text-muted-foreground capitalize mt-0.5">{user?.role}</span>
            </div>
            {/* Botón Salir con lógica de borrado */}
            <Button variant="ghost" size="sm" className="gap-2 text-red-600 hover:bg-red-50 rounded-full px-3" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> <span className="hidden md:inline">Salir</span>
            </Button>
          </div>
        </div>
        {isMobileMenuOpen && (
          <div className="border-b bg-background lg:hidden">
            <div className="grid gap-1 px-4 py-3">
              {filteredItems.map((item) => (
                <Link key={item.title} href={item.url} onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant={location === item.url ? "secondary" : "ghost"} className="w-full justify-start"><item.icon className="mr-2 h-4 w-4" />{item.title}</Button>
                </Link>
              ))}
              <Button variant="ghost" className="w-full justify-start text-red-600" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión</Button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}