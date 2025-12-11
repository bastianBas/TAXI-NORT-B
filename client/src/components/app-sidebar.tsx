// client/src/components/app-sidebar.tsx
import { Home, Users, Truck, FileText, LogOut, Settings, ShieldCheck } from "lucide-react";
import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth"; // Importamos el hook de autenticación
import { Button } from "@/components/ui/button";

// Definición de ítems del menú (mantenlos como los tenías)
const items = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Conductores", url: "/drivers", icon: Users },
  { title: "Vehículos", url: "/vehicles", icon: Truck },
  { title: "Hojas de Ruta", url: "/route-slips", icon: FileText },
  { title: "Auditoría", url: "/audit", icon: ShieldCheck, role: "admin" },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth(); // Obtenemos la función de logout

  // Función para manejar el cierre de sesión
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Taxi Nort Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                // Filtrar por rol si es necesario
                if (item.role && user?.role !== item.role) return null;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location === item.url}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 px-2">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user?.name}</span>
              <span className="text-xs text-muted-foreground capitalize">
                {user?.role}
              </span>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout} // Conectamos el botón aquí
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4" />
            <span>{logoutMutation.isPending ? "Saliendo..." : "Cerrar Sesión"}</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}