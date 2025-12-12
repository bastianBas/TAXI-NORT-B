import { Home, Users, Truck, FileText, LogOut, ShieldCheck, DollarSign, Menu } from "lucide-react";
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
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// CONFIGURACIÓN DEL MENÚ
const items = [
  { title: "Dashboard", url: "/", icon: Home, roles: [] }, // [] vacío = para todos
  { title: "Conductores", url: "/drivers", icon: Users, roles: ["admin", "operator"] },
  { title: "Vehículos", url: "/vehicles", icon: Truck, roles: ["admin", "operator"] },
  { title: "Hojas de Ruta", url: "/route-slips", icon: FileText, roles: ["admin", "operator", "driver", "finance"] },
  { title: "Pagos", url: "/payments", icon: DollarSign, roles: ["admin", "finance", "driver"] }, // Agregamos 'driver' aquí también por si acaso
  { title: "Auditoría", url: "/audit", icon: ShieldCheck, roles: ["admin"] },
];

// IMPORTANTE: El nombre de la función debe ser AppSidebar para coincidir con App.tsx
export function AppSidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

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
                // LÓGICA DE FILTRADO:
                // Si la lista de roles NO está vacía, y el rol del usuario NO está en la lista -> Ocultar
                if (item.roles.length > 0 && user?.role && !item.roles.includes(user.role)) {
                  return null;
                }
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location === item.url}>
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
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

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 px-1">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
               {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{user?.name}</span>
              <span className="text-xs text-muted-foreground capitalize truncate">
                {user?.role}
              </span>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
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