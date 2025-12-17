import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { 
  LogOut, 
  LayoutDashboard, 
  Users, 
  Car, 
  FileText, 
  DollarSign, 
  ShieldCheck,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MainNav() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const queryClient = useQueryClient();

  // 🚀 LÓGICA VITAL: Desconexión GPS al salir
  const handleLogout = async () => {
    if (user?.role === 'driver') {
      try {
        // Enviar señal OFF inmediatamente
        const data = JSON.stringify({ lat: 0, lng: 0, status: 'offline', speed: 0 });
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/vehicle-locations", new Blob([data], { type: 'application/json' }));
        } else {
          await fetch("/api/vehicle-locations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: data,
          });
        }
      } catch (error) {
        console.error("Error GPS logout:", error);
      }
    }
    // Limpiar caché y salir
    queryClient.removeQueries({ queryKey: ["vehicle-locations"] });
    logoutMutation.mutate();
  };

  // Definición de enlaces
  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ['admin', 'driver', 'operator', 'finance'] },
    { href: "/drivers", label: "Conductores", icon: Users, roles: ['admin', 'operator'] },
    { href: "/vehicles", label: "Vehículos", icon: Car, roles: ['admin', 'operator'] },
    { href: "/route-slips", label: "Hojas de Ruta", icon: FileText, roles: ['admin', 'operator', 'driver', 'finance'] },
    { href: "/payments", label: "Pagos", icon: DollarSign, roles: ['admin', 'finance', 'driver'] },
    { href: "/audit", label: "Auditoría", icon: ShieldCheck, roles: ['admin'] },
  ];

  const allowedLinks = links.filter(link => link.roles.includes(user?.role || ''));

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        {/* LOGO */}
        <div className="mr-8 hidden md:flex">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            TaxiNort
          </Link>
        </div>

        {/* MENÚ MÓVIL (Hamburguesa) - Visible solo en celular */}
        <div className="md:hidden mr-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {allowedLinks.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link href={link.href} className="flex items-center gap-2 cursor-pointer">
                    <link.icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" />
                <span>Salir</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* LOGO MÓVIL */}
        <div className="md:hidden flex-1 font-bold text-lg">TaxiNort</div>

        {/* MENÚ ESCRITORIO - Visible solo en PC */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium flex-1">
          {allowedLinks.map((link) => (
            <Link 
              key={link.href} 
              href={link.href}
              className={`flex items-center gap-2 transition-colors hover:text-foreground/80 ${
                location === link.href ? "text-foreground font-bold" : "text-foreground/60"
              }`}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </nav>

        {/* USUARIO Y SALIR (Derecha) */}
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium leading-none">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <LogOut className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Salir</span>
          </Button>
        </div>
      </div>
    </header>
  );
}