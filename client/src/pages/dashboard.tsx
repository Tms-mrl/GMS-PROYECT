import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  ClipboardList, 
  Search, 
  CheckCircle2, 
  DollarSign,
  Plus,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/components/stats-card";
import { OrderCard } from "@/components/order-card";
import { EmptyState } from "@/components/empty-state";
import type { RepairOrderWithDetails } from "@shared/schema";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<{
    activeOrders: number;
    pendingDiagnosis: number;
    readyForPickup: number;
    monthlyRevenue: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery<RepairOrderWithDetails[]>({
    queryKey: ["/api/orders/recent"],
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">Resumen de tu taller de reparaciones</p>
        </div>
        <Button asChild data-testid="button-new-order">
          <Link href="/ordenes/nueva">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Orden
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatsCard
              title="Órdenes Activas"
              value={stats?.activeOrders ?? 0}
              icon={ClipboardList}
              iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400"
            />
            <StatsCard
              title="Pendientes Diagnóstico"
              value={stats?.pendingDiagnosis ?? 0}
              icon={Search}
              iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400"
            />
            <StatsCard
              title="Listas para Entregar"
              value={stats?.readyForPickup ?? 0}
              icon={CheckCircle2}
              iconClassName="bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
            />
            <StatsCard
              title="Ingresos del Mes"
              value={`$${(stats?.monthlyRevenue ?? 0).toLocaleString()}`}
              icon={DollarSign}
              trend={{ value: 12, isPositive: true }}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <CardTitle className="text-lg">Órdenes Recientes</CardTitle>
          <Button variant="ghost" size="sm" asChild data-testid="link-view-all-orders">
            <Link href="/ordenes">
              Ver todas
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-32 mb-4" />
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recentOrders && recentOrders.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {recentOrders.slice(0, 6).map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="No hay órdenes"
              description="Crea tu primera orden de reparación para comenzar"
              actionLabel="Nueva Orden"
              actionHref="/ordenes/nueva"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
