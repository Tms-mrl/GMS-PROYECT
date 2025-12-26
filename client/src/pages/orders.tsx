import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { OrderCard } from "@/components/order-card";
import { EmptyState } from "@/components/empty-state";
import type { RepairOrderWithDetails, OrderStatus } from "@shared/schema";

const statusFilters: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "recibido", label: "Recibidas" },
  { value: "diagnostico", label: "Diagnóstico" },
  { value: "en_curso", label: "En Curso" },
  { value: "listo", label: "Listas" },
  { value: "entregado", label: "Entregadas" },
];

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: orders, isLoading } = useQuery<RepairOrderWithDetails[]>({
    queryKey: ["/api/orders"],
  });

  const filteredOrders = orders?.filter((order) => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesSearch = searchQuery === "" || 
      order.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.device.imei.includes(searchQuery) ||
      order.device.serialNumber.includes(searchQuery) ||
      order.device.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.device.model.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Órdenes de Reparación</h1>
          <p className="text-muted-foreground">Gestiona todas las órdenes del taller</p>
        </div>
        <Button asChild data-testid="button-new-order">
          <Link href="/ordenes/nueva">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Orden
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, IMEI, marca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-orders"
          />
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | "all")}>
        <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0">
          {statusFilters.map((filter) => (
            <TabsTrigger 
              key={filter.value} 
              value={filter.value}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              data-testid={`tab-filter-${filter.value}`}
            >
              {filter.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-32 mb-4" />
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredOrders && filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Filter}
          title={searchQuery || statusFilter !== "all" ? "Sin resultados" : "No hay órdenes"}
          description={
            searchQuery || statusFilter !== "all"
              ? "No se encontraron órdenes con los filtros aplicados"
              : "Crea tu primera orden de reparación para comenzar"
          }
          actionLabel={!searchQuery && statusFilter === "all" ? "Nueva Orden" : undefined}
          actionHref={!searchQuery && statusFilter === "all" ? "/ordenes/nueva" : undefined}
        />
      )}
    </div>
  );
}
