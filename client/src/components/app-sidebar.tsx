import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  CreditCard,
  BarChart3,
  Wrench,
  Search,
  HelpCircle,
  Package,
  Settings as SettingsIcon,
  LogOut
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SupportDialog } from "@/components/support-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { type Settings } from "@shared/schema";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Órdenes",
    url: "/ordenes",
    icon: ClipboardList,
  },
  {
    title: "Clientes",
    url: "/clientes",
    icon: Users,
  },
  {
    title: "Cobros",
    url: "/cobros",
    icon: CreditCard,
  },
  {
    title: "Stock",
    url: "/inventory",
    icon: Package,
  },
  {
    title: "Reportes",
    url: "/reportes",
    icon: BarChart3,
  },
  {
    title: "Configuración",
    url: "/configuracion",
    icon: SettingsIcon,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const [supportDialogOpen, setSupportDialogOpen] = React.useState(false);

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  return (
    <>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Wrench className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{settings?.shopName || "GSM FIX"}</h1>
              <p className="text-xs text-muted-foreground">Gestión de Reparaciones</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="px-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar IMEI o cliente..."
                className="pl-9 h-10"
                data-testid="input-sidebar-search"
              />
            </div>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Menú Principal</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => {
                  const isActive = location === item.url ||
                    (item.url !== "/" && location.startsWith(item.url));
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        data-testid={`link-nav-${item.title.toLowerCase()}`}
                      >
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

        <SidebarFooter className="p-4 border-t space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => setSupportDialogOpen(true)}
          >
            <HelpCircle className="h-4 w-4" />
            <span>Contactar Soporte</span>
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border">
              <AvatarImage src={settings?.logoUrl || ""} alt={settings?.shopName} className="object-cover" />
              <AvatarFallback className="bg-muted">LT</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{settings?.shopName || "Técnico Rodrigo"}</p>
              <p className="text-xs text-muted-foreground">Administrador</p>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SupportDialog
        open={supportDialogOpen}
        onOpenChange={setSupportDialogOpen}
      />
    </>
  );
}
