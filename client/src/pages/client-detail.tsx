import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Smartphone,
  ClipboardList,
  Edit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Client, Device, RepairOrderWithDetails } from "@shared/schema";

export default function ClientDetail() {
  const [, params] = useRoute("/clientes/:id");
  const clientId = params?.id;

  const { data: client, isLoading: clientLoading } = useQuery<Client>({
    queryKey: ["/api/clients", clientId],
    enabled: !!clientId,
  });

  const { data: devices, isLoading: devicesLoading } = useQuery<Device[]>({
    queryKey: ["/api/devices", clientId],
    enabled: !!clientId,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<RepairOrderWithDetails[]>({
    queryKey: ["/api/clients", clientId, "orders"],
    enabled: !!clientId,
  });

  if (clientLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Cliente no encontrado</p>
        <Button asChild className="mt-4">
          <Link href="/clientes">Volver a Clientes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild data-testid="button-back">
            <Link href="/clientes">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{client.name}</h1>
            <p className="text-muted-foreground">Ficha del cliente</p>
          </div>
        </div>
        <Button variant="outline" size="sm" data-testid="button-edit-client">
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información de Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-medium">{client.phone}</p>
              </div>
            </div>

            {client.email && (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{client.email}</p>
                </div>
              </div>
            )}

            {client.address && (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dirección</p>
                  <p className="font-medium">{client.address}</p>
                </div>
              </div>
            )}

            {client.notes && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-1">Notas</p>
                <p className="text-sm">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Dispositivos ({devices?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {devicesLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : devices && devices.length > 0 ? (
                <div className="space-y-3">
                  {devices.map((device) => (
                    <div 
                      key={device.id} 
                      className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                      data-testid={`device-${device.id}`}
                    >
                      <div>
                        <p className="font-medium">{device.brand} {device.model}</p>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          {device.imei && <span className="font-mono">IMEI: {device.imei}</span>}
                          {device.color && <span>{device.color}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay dispositivos registrados
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Historial de Órdenes ({orders?.length ?? 0})
              </CardTitle>
              <Button size="sm" asChild data-testid="button-new-order-from-client">
                <Link href="/ordenes/nueva">Nueva Orden</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : orders && orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <Link key={order.id} href={`/ordenes/${order.id}`}>
                      <div 
                        className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover-elevate cursor-pointer"
                        data-testid={`order-${order.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{order.device.brand} {order.device.model}</p>
                            <StatusBadge status={order.status} showIcon={false} />
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{order.problem}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.createdAt), "d MMM yyyy", { locale: es })}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-medium">${order.finalCost || order.estimatedCost}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={ClipboardList}
                  title="Sin órdenes"
                  description="Este cliente no tiene órdenes de reparación"
                  actionLabel="Nueva Orden"
                  actionHref="/ordenes/nueva"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
