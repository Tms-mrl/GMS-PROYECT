import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Orders from "@/pages/orders";
import NewOrder from "@/pages/new-order";
import OrderDetail from "@/pages/order-detail";
import Clients from "@/pages/clients";
import NewClient from "@/pages/new-client";
import ClientDetail from "@/pages/client-detail";
import Payments from "@/pages/payments";
import Reports from "@/pages/reports";
import PrintOrder from "@/pages/print-order";
import AuthPage from "@/pages/auth-page";
import InventoryPage from "@/pages/inventory"; // Import InventoryPage
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";
import SettingsPage from "@/pages/settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/ordenes" component={Orders} />
      <Route path="/ordenes/nueva" component={NewOrder} />
      <Route path="/ordenes/:id/print" component={PrintOrder} />
      <Route path="/ordenes/:id" component={OrderDetail} />
      <Route path="/clientes" component={Clients} />
      <Route path="/clientes/nuevo" component={NewClient} />
      <Route path="/clientes/:id" component={ClientDetail} />
      <Route path="/cobros" component={Payments} />
      <Route path="/reportes" component={Reports} />
      <Route path="/inventory" component={InventoryPage} />
      <Route path="/configuracion" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Switch>
          <Route path="/auth" component={AuthPage} />
          <Route>
            <ProtectedRoute
              component={() => (
                <SidebarProvider style={style as React.CSSProperties}>
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <div className="flex flex-col flex-1 min-w-0">
                      <header className="sticky top-0 z-50 flex items-center justify-between gap-4 px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <SidebarTrigger data-testid="button-sidebar-toggle" />
                        <ThemeToggle />
                      </header>
                      <main className="flex-1 overflow-auto p-6">
                        <div className="max-w-7xl mx-auto">
                          <Router />
                        </div>
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
              )}
            />
          </Route>
        </Switch>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;


