import { Home, Users, Truck, FileText, LogOut, ShieldCheck, DollarSign } from "lucide-react";
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

// ACTUALIZACIÓN DE ITEMS: Usamos "roles" (array) para permitir múltiples accesos
const items = [
  { title: "Dashboard", url: "/", icon: Home, roles: [] }, // [] vacío significa todos
  { title: "Conductores", url: "/drivers", icon: Users, roles: ["admin", "operator"] },
  { title: "Vehículos", url: "/vehicles", icon: Truck, roles: ["admin", "operator"] },
  { title: "Hojas de Ruta", url: "/route-slips", icon: FileText, roles: ["admin", "operator", "driver", "finance"] },
  // AQUÍ ESTÁ EL NUEVO LINK DE PAGOS:
  { title: "Pagos", url: "/payments", icon: DollarSign, roles: ["admin", "finance"] },
  { title: "Auditoría", url: "/audit", icon: ShieldCheck, roles: ["admin"] },
];

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
                // FILTRADO MEJORADO:
                // Si roles tiene elementos y el rol del usuario NO está incluido, no mostramos el item.
                // Si roles está vacío [], es público para todos los logueados.
                if (item.roles.length > 0 && user?.role && !item.roles.includes(user.role)) {
                  return null;
                }
                
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