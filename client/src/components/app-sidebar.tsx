import { Home, Users, Truck, FileText, LogOut, ShieldCheck, DollarSign, Menu, X } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsPanel } from "@/components/notifications-panel";

// TUS ÍTEMS DE MENÚ
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

  // 🟢 CORRECCIÓN: Desconexión explícita antes de cerrar sesión
  const handleLogout = async () => {
    // Si es conductor, enviamos la señal de que se va AHORA MISMO
    if (user?.role === 'driver') {
        try {
            await fetch("/api/vehicle-locations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: 'offline' }),
                keepalive: true
            });
        } catch (e) {
            console.error("Error enviando desconexión:", e);
        }
    }
    // Una vez enviada la señal, procedemos a cerrar la sesión
    logoutMutation.mutate();
  };

  const filteredItems = items.filter(item => 
    !(item.roles.length > 0 && user?.role && !item.roles.includes(user.role))
  );

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
          
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden -ml-2 text-muted-foreground"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>

            <Link href="/">
              <div className="flex items-center gap-3 cursor-pointer group">
                <img
                  src="/uploads/logoss.jpg" 
                  alt="TaxiNort"
                  className="h-10 w-10 object-cover rounded-full border border-border/60 shadow-sm transition-transform group-hover:scale-105"
                  onError={(e) => {
                     e.currentTarget.src = "https://placehold.co/80x80/transparent/000000?text=TN"; 
                  }}
                />
                <span className="hidden font-bold sm:inline-block text-xl tracking-tight text-foreground">
                  TaxiNort
                </span>
              </div>
            </Link>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            {filteredItems.map((item) => {
              const isActive = location === item.url;
              return (
                <Link key={item.title} href={item.url}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "text-sm font-medium transition-colors h-9 px-4 rounded-full",
                      isActive 
                        ? "bg-primary/10 text-primary hover:bg-primary/20" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="mr-2 h-4 w-4" /> 
                    {item.title}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <NotificationsPanel />
            <ThemeToggle />
            <div className="w-px h-6 bg-border mx-1 hidden md:block" /> 
            <div className="hidden md:flex flex-col items-end leading-none mr-1">
              <span className="text-sm font-semibold">{user?.name}</span>
              <span className="text-[10px] text-muted-foreground capitalize mt-0.5">{user?.role}</span>
            </div>
            
            {/* Botón Salir con la nueva lógica */}
            <Button 
              variant="ghost" 
              size="sm"
              className="gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full px-3"
              onClick={handleLogout}
              title="Cerrar Sesión"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Salir</span>
            </Button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="border-b bg-background lg:hidden animate-in slide-in-from-top-1">
            <div className="grid gap-1 px-4 py-3">
              {filteredItems.map((item) => (
                <Link key={item.title} href={item.url} onClick={() => setIsMobileMenuOpen(false)}>
                  <Button 
                    variant={location === item.url ? "secondary" : "ghost"}
                    className="w-full justify-start font-normal"
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </Button>
                </Link>
              ))}
              
              <div className="h-px bg-border my-2" />
              
              <div className="px-2 py-2 flex items-center justify-between">
                 <div className="flex flex-col">
                    <span className="text-sm font-semibold">{user?.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
                 </div>
              </div>

              <div className="flex items-center justify-between px-2 py-2">
                 <span className="text-sm font-medium">Cambiar Tema</span>
                 <ThemeToggle />
              </div>

               <Button 
                  variant="ghost" 
                  className="w-full justify-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </Button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}