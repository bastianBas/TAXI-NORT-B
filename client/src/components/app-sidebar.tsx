import { Home, Users, Truck, FileText, LogOut, ShieldCheck, DollarSign, Menu, X } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
// Si usas el toggle de tema, descomenta la siguiente línea:
// import { ThemeToggle } from "@/components/theme-toggle";

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

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const filteredItems = items.filter(item => 
    !(item.roles.length > 0 && user?.role && !item.roles.includes(user.role))
  );

  return (
    <>
      {/* --- CÁPSULA FLOTANTE PRINCIPAL --- */}
      <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-[95%] max-w-6xl bg-background/80 backdrop-blur-md border border-border/40 shadow-2xl rounded-full px-4 py-2 sm:px-6 sm:py-3 transition-all duration-300 hover:shadow-primary/20 hover:w-[98%] max-md:rounded-3xl">
        <div className="flex items-center justify-between">
          
          {/* 1. SECCIÓN LOGO E IDENTIDAD */}
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group">
              
              {/* ✅ LOGO ACTUALIZADO: Busca 'logoss.jpg' en la carpeta uploads */}
              <img
                src="/uploads/logoss.jpg" 
                alt="Taxi Nort Logo"
                className="h-10 w-10 object-cover rounded-full border border-border/50 transition-transform group-hover:scale-110 drop-shadow-sm"
                onError={(e) => {
                  // Si no encuentra la imagen, muestra un cuadro amarillo de respaldo
                  e.currentTarget.src = "https://placehold.co/80x80/FFD700/000000?text=TN"; 
                }}
              />
              
              <div className="flex flex-col leading-none">
                <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-foreground/80">
                  TaxiNort
                </span>
                <span className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase hidden sm:block">
                  Servicio Premium
                </span>
              </div>
            </div>
          </Link>

          {/* 2. MENÚ DESKTOP (Horizontal) */}
          <div className="hidden lg:flex items-center gap-1 bg-muted/30 p-1 rounded-full border border-border/20">
            {filteredItems.map((item) => {
              const isActive = location === item.url;
              return (
                <Link key={item.title} href={item.url}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "rounded-full px-5 h-10 text-sm font-medium transition-all duration-300 relative",
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-md !opacity-100" 
                        : "hover:bg-background/60 text-muted-foreground hover:text-foreground opacity-80 hover:opacity-100"
                    )}
                  >
                    <item.icon className={cn("mr-2 h-4 w-4", isActive ? "animate-pulse" : "")} />
                    {item.title}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* 3. PERFIL Y ACCIONES */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex flex-col items-end leading-tight mr-2 border-r pr-4 border-border/40">
              <span className="text-sm font-bold truncate max-w-[120px]">{user?.name}</span>
              <span className="text-[11px] text-muted-foreground capitalize bg-primary/10 text-primary px-2 rounded-full">
                {user?.role}
              </span>
            </div>
            
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full border-border/40 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 hidden md:flex transition-colors"
              onClick={handleLogout}
              title="Cerrar Sesión"
            >
              <LogOut className="h-4 w-4" />
            </Button>

            <Button
              variant={isMobileMenuOpen ? "secondary" : "ghost"}
              size="icon"
              className="lg:hidden rounded-full h-11 w-11 bg-muted/50 hover:bg-muted"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* --- MENÚ MÓVIL (Desplegable) --- */}
        <div 
            className={cn(
              "lg:hidden overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
              isMobileMenuOpen ? "max-h-[600px] opacity-100 mt-4 pt-4 border-t border-border/30" : "max-h-0 opacity-0"
            )}
        >
          <div className="flex items-center gap-3 mb-6 p-3 bg-muted/40 rounded-2xl">
             <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                 {user?.name?.charAt(0).toUpperCase()}
             </div>
             <div>
                 <p className="font-bold">{user?.name}</p>
                 <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pb-4">
            {filteredItems.map((item) => (
              <Link key={item.title} href={item.url} onClick={() => setIsMobileMenuOpen(false)}>
                <Button 
                  variant={location === item.url ? "default" : "outline"} 
                  className={cn(
                    "w-full justify-start rounded-xl h-12 border-border/40",
                    location === item.url ? "shadow-md" : "hover:bg-muted/50 bg-background/50"
                  )}
                >
                  <item.icon className="mr-2 h-5 w-5 opacity-70" />
                  {item.title}
                </Button>
              </Link>
            ))}
          </div>
             
             <Button 
                variant="ghost" 
                className="w-full justify-center text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl h-12 mt-2 border border-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-5 w-5" />
                Cerrar Sesión
              </Button>
        </div>
      </nav>
    </>
  );
}