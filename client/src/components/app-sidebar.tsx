import { Home, Users, Truck, FileText, LogOut, ShieldCheck, DollarSign, Menu, X } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
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

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const filteredItems = items.filter(item => 
    !(item.roles.length > 0 && user?.role && !item.roles.includes(user.role))
  );

  return (
    <>
      {/* --- BARRA SUPERIOR FIJA (ESTÁNDAR) --- */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
          
          {/* 1. LOGO LIMPIO (Izquierda) */}
          <div className="flex items-center gap-4">
             {/* Botón Menú Móvil (Solo visible en pantallas chicas) */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden -ml-2 text-muted-foreground"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>

            <Link href="/">
              <div className="flex items-center gap-3 cursor-pointer">
                {/* Logo Imagen Sin Marco */}
                <img
                  src="/uploads/logoss.jpg" 
                  alt="TaxiNort"
                  className="h-9 w-9 object-contain"
                  onError={(e) => {
                     e.currentTarget.src = "https://placehold.co/80x80/transparent/000000?text=TN"; 
                  }}
                />
                <span className="hidden font-bold sm:inline-block text-lg tracking-tight">
                  TaxiNort
                </span>
              </div>
            </Link>
          </div>

          {/* 2. MENÚ DE NAVEGACIÓN (Centro/Derecha) */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            {filteredItems.map((item) => {
              const isActive = location === item.url;
              return (
                <Link key={item.title} href={item.url}>
                  <span className={cn(
                    "flex items-center gap-2 transition-colors hover:text-primary cursor-pointer",
                    isActive ? "text-primary font-bold" : "text-muted-foreground"
                  )}>
                    {/* Icono opcional, puedes quitarlo si quieres solo texto */}
                    <item.icon className="h-4 w-4" /> 
                    {item.title}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* 3. PERFIL Y ACCIONES (Derecha) */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end leading-none">
              <span className="text-sm font-medium">{user?.name}</span>
              <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
              title="Cerrar Sesión"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* --- MENÚ MÓVIL DESPLEGABLE --- */}
        {isMobileMenuOpen && (
          <div className="border-b bg-background lg:hidden">
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
            </div>
          </div>
        )}
      </header>
    </>
  );
}