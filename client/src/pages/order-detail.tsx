import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Smartphone,
  User,
  Calendar,
  DollarSign,
  Save,
  Printer,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { PatternLock } from "@/components/ui/pattern-lock";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { RepairOrderWithDetails, OrderStatus, Payment } from "@shared/schema";

const statusOptions: { value: OrderStatus; label: string }[] = [
  { value: "recibido", label: "Recibido" },
  { value: "diagnostico", label: "En Diagnóstico" },
  { value: "en_curso", label: "En Curso" },
  { value: "listo", label: "Listo para Entregar" },
  { value: "entregado", label: "Entregado" },
];

export default function OrderDetail() {
  const [, params] = useRoute("/ordenes/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const orderId = params?.id;

  const { data: order, isLoading } = useQuery<RepairOrderWithDetails>({
    queryKey: ["/api/orders", orderId],
    enabled: !!orderId,
  });

  const [formData, setFormData] = useState<Partial<RepairOrderWithDetails>>({});

  const updateOrder = useMutation({
    mutationFn: async (data: Partial<RepairOrderWithDetails>) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Orden actualizada" });
    },
    onError: () => {
      toast({ title: "Error al actualizar", variant: "destructive" });
    },
  });

  if (isLoading) {
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
          <Skeleton className="h-64 col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Orden no encontrada</p>
        <Button asChild className="mt-4">
          <Link href="/ordenes">Volver a Órdenes</Link>
        </Button>
      </div>
    );
  }

  const currentData = { ...order, ...formData };
  const totalPaid = order.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const balance = (currentData.finalCost || currentData.estimatedCost) - totalPaid;

  const handleSave = () => {
    updateOrder.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild data-testid="button-back">
            <Link href="/ordenes">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold">
                {order.device.brand} {order.device.model}
              </h1>
              <StatusBadge status={currentData.status as OrderStatus} />
            </div>
            <p className="text-muted-foreground">
              Orden #{order.id.slice(0, 8)} - Creada {format(new Date(order.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/ordenes/${orderId}/print`}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Link>
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateOrder.isPending || Object.keys(formData).length === 0}
            data-testid="button-save-order"
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar Cambios
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estado y Detalles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Estado</Label>
                  <Select
                    value={currentData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as OrderStatus })}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Técnico Asignado</Label>
                  <Input
                    value={currentData.technicianName}
                    onChange={(e) => setFormData({ ...formData, technicianName: e.target.value })}
                    placeholder="Nombre del técnico"
                    data-testid="input-technician"
                  />
                </div>
              </div>

              <div>
                <Label>Problema Reportado</Label>
                <Textarea
                  value={currentData.problem}
                  onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                  className="min-h-20"
                  data-testid="input-problem"
                />
              </div>

              <div>
                <Label>Diagnóstico</Label>
                <Textarea
                  value={currentData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  placeholder="Resultado del diagnóstico técnico..."
                  className="min-h-20"
                  data-testid="input-diagnosis"
                />
              </div>

              <div>
                <Label>Solución / Trabajo Realizado</Label>
                <Textarea
                  value={currentData.solution}
                  onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                  placeholder="Describe el trabajo realizado..."
                  className="min-h-20"
                  data-testid="input-solution"
                />
              </div>

              <div>
                <Label>Notas Internas</Label>
                <Textarea
                  value={currentData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas adicionales..."
                  data-testid="input-notes"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Costos y Pagos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Costo Estimado</Label>
                  <Input
                    type="number"
                    value={currentData.estimatedCost}
                    onChange={(e) => setFormData({ ...formData, estimatedCost: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    data-testid="input-estimated-cost"
                  />
                </div>
                <div>
                  <Label>Costo Final</Label>
                  <Input
                    type="number"
                    value={currentData.finalCost}
                    onChange={(e) => setFormData({ ...formData, finalCost: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    data-testid="input-final-cost"
                  />
                </div>
                <div>
                  <Label>Saldo Pendiente</Label>
                  <div className={`h-10 flex items-center px-3 rounded-md border ${balance > 0 ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300' : 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'}`}>
                    ${balance.toFixed(2)}
                  </div>
                </div>
              </div>

              {order.payments && order.payments.length > 0 && (
                <div className="pt-4 border-t">
                  <Label className="mb-2 block">Historial de Pagos</Label>
                  <div className="space-y-2">
                    {order.payments.map((payment: Payment) => (
                      <div key={payment.id} className="flex justify-between items-center text-sm py-2 px-3 bg-muted rounded-md">
                        <span>{format(new Date(payment.date), "d MMM yyyy", { locale: es })}</span>
                        <span className="capitalize">{payment.method}</span>
                        <span className="font-medium">${payment.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/clientes/${order.client.id}`}>
                <div className="hover-elevate rounded-md p-3 -m-3 cursor-pointer flex items-center justify-between" data-testid="link-client">
                  <div>
                    <p className="font-medium">{order.client.name}</p>
                    <p className="text-sm text-muted-foreground">{order.client.phone}</p>
                    {order.client.email && (
                      <p className="text-sm text-muted-foreground">{order.client.email}</p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Dispositivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Marca / Modelo</p>
                <p className="font-medium">{order.device.brand} {order.device.model}</p>
              </div>
              {order.device.imei && (
                <div>
                  <p className="text-sm text-muted-foreground">IMEI</p>
                  <p className="font-mono text-sm">{order.device.imei}</p>
                </div>
              )}
              {order.device.serialNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">N° de Serie</p>
                  <p className="font-mono text-sm">{order.device.serialNumber}</p>
                </div>
              )}
              {order.device.color && (
                <div>
                  <p className="text-sm text-muted-foreground">Color</p>
                  <p>{order.device.color}</p>
                </div>
              )}
              {order.device.condition && (
                <div>
                  <p className="text-sm text-muted-foreground">Condición</p>
                  <p>{order.device.condition}</p>
                </div>
              )}
              {order.device.lockType && (
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Bloqueo</p>
                  <div className="font-medium">
                    {order.device.lockType === "PIN" && (
                      <div className="flex flex-col">
                        <span>PIN</span>
                        <span className="text-lg mt-1">PIN: {order.device.lockValue || "No definido"}</span>
                      </div>
                    )}
                    {order.device.lockType === "PASSWORD" && (
                      <div className="flex flex-col">
                        <span>Contraseña</span>
                        <span className="text-base mt-1 break-all">Contraseña: {order.device.lockValue || "No definida"}</span>
                      </div>
                    )}
                    {order.device.lockType === "PATRON" && "Patrón"}
                  </div>
                </div>
              )}
              {order.device.lockType === "PATRON" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Patrón de Desbloqueo</p>
                  {order.device.lockValue ? (
                    <PatternLock
                      value={order.device.lockValue}
                      readOnly={true}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No pattern saved</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fechas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Ingreso</p>
                <p>{format(new Date(order.createdAt), "d 'de' MMMM, yyyy", { locale: es })}</p>
              </div>
              {order.estimatedDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Fecha Estimada</p>
                  <p>{format(new Date(order.estimatedDate), "d 'de' MMMM, yyyy", { locale: es })}</p>
                </div>
              )}
              {order.completedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Finalización</p>
                  <p>{format(new Date(order.completedAt), "d 'de' MMMM, yyyy", { locale: es })}</p>
                </div>
              )}
              {order.deliveredAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Entrega</p>
                  <p>{format(new Date(order.deliveredAt), "d 'de' MMMM, yyyy", { locale: es })}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
