import { Home, User, Car, FileText, DollarSign, ShieldCheck, LogOut } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth"; // Ajusta el import según tu estructura
import { useQueryClient } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    // 🚀 LÓGICA DE SALIDA INMEDIATA
    // Si es conductor, avisamos al servidor "Me fui" ANTES de borrar el token
    if (user?.role === 'driver') {
      try {
        await fetch("/api/vehicle-locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: 0, lng: 0, status: 'offline', speed: 0 }),
        });
        console.log("👋 Señal offline enviada manualmente");
      } catch (error) {
        console.error("Error al desconectar GPS", error);
      }
    }
    
    // Limpiamos el mapa localmente para que el admin (si es el mismo PC) lo vea vacío
    queryClient.removeQueries({ queryKey: ["vehicle-locations"] });
    
    // Cerramos sesión
    logoutMutation.mutate();
  };

  // ... (RESTO DEL CÓDIGO IGUAL: ITEMS, FILTEREDITEMS, RETURN) ...
  const items = [
    { title: "Dashboard", url: "/", icon: Home, roles: ['admin', 'driver'] },
    { title: "Conductores", url: "/drivers", icon: User, roles: ['admin'] },
    { title: "Vehículos", url: "/vehicles", icon: Car, roles: ['admin'] },
    { title: "Hojas de Ruta", url: "/route-slips", icon: FileText, roles: ['admin', 'driver'] },
    { title: "Pagos", url: "/payments", icon: DollarSign, roles: ['admin', 'driver'] },
    { title: "Auditoría", url: "/audit", icon: ShieldCheck, roles: ['admin'] },
  ];

  const filteredItems = items.filter(item => item.roles.includes(user?.role || ''));

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-border">
        <h2 className="text-xl font-bold tracking-tight px-2">TaxiNort</h2>
        <p className="text-xs text-muted-foreground px-2">
          {user?.name} ({user?.role === 'admin' ? 'Admin' : 'Driver'})
        </p>
      </SidebarHeader>
      
      <SidebarContent className="p-2">
        <SidebarMenu>
          {filteredItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <Link href={item.url}>
                <SidebarMenuButton 
                  isActive={location === item.url}
                  className="w-full justify-start gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Usamos handleLogout en el onClick */}
            <SidebarMenuButton onClick={handleLogout} className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
              <LogOut className="h-4 w-4" />
              <span>Salir</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}