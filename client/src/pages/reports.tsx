import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  TrendingUp, 
  Smartphone, 
  Clock,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/components/stats-card";
import type { RepairOrderWithDetails } from "@shared/schema";

export default function Reports() {
  const { data: orders, isLoading } = useQuery<RepairOrderWithDetails[]>({
    queryKey: ["/api/orders"],
  });

  const { data: stats } = useQuery<{
    activeOrders: number;
    pendingDiagnosis: number;
    readyForPickup: number;
    monthlyRevenue: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const deviceStats = orders?.reduce((acc, order) => {
    const brand = order.device.brand;
    acc[brand] = (acc[brand] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  const sortedDevices = Object.entries(deviceStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const statusCounts = orders?.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  const totalOrders = orders?.length ?? 0;
  const completedOrders = orders?.filter(o => o.status === "entregado").length ?? 0;
  const avgRepairTime = orders?.filter(o => o.completedAt)
    .map(o => {
      const start = new Date(o.createdAt).getTime();
      const end = new Date(o.completedAt!).getTime();
      return (end - start) / (1000 * 60 * 60 * 24);
    })
    .reduce((a, b, _, arr) => a + b / arr.length, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Reportes</h1>
          <p className="text-muted-foreground">Estadísticas y métricas del taller</p>
        </div>
        <Button variant="outline" data-testid="button-export">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
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
              title="Total Órdenes"
              value={totalOrders}
              icon={BarChart3}
              iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400"
            />
            <StatsCard
              title="Órdenes Completadas"
              value={completedOrders}
              icon={TrendingUp}
              iconClassName="bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
            />
            <StatsCard
              title="Tiempo Promedio"
              value={`${avgRepairTime.toFixed(1)} días`}
              icon={Clock}
              iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400"
            />
            <StatsCard
              title="Ingresos del Mes"
              value={`$${(stats?.monthlyRevenue ?? 0).toLocaleString()}`}
              icon={TrendingUp}
              trend={{ value: 12, isPositive: true }}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Marcas Más Frecuentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : sortedDevices.length > 0 ? (
              <div className="space-y-3">
                {sortedDevices.map(([brand, count], index) => {
                  const percentage = (count / totalOrders) * 100;
                  return (
                    <div key={brand} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{brand}</span>
                        <span className="text-muted-foreground">{count} órdenes ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay datos suficientes
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Órdenes por Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : Object.keys(statusCounts).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(statusCounts).map(([status, count]) => {
                  const percentage = (count / totalOrders) * 100;
                  const statusLabels: Record<string, string> = {
                    recibido: "Recibido",
                    diagnostico: "Diagnóstico",
                    en_curso: "En Curso",
                    listo: "Listo",
                    entregado: "Entregado",
                  };
                  const statusColors: Record<string, string> = {
                    recibido: "bg-slate-500",
                    diagnostico: "bg-blue-500",
                    en_curso: "bg-amber-500",
                    listo: "bg-green-500",
                    entregado: "bg-gray-400",
                  };
                  return (
                    <div key={status} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{statusLabels[status] || status}</span>
                        <span className="text-muted-foreground">{count} ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${statusColors[status] || 'bg-primary'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay datos suficientes
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
