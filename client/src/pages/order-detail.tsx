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
  ChevronRight,
  Plus,
  MessageCircle,
  Lock,
  Unlock
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
import type { RepairOrderWithDetails, OrderStatus, Payment, Settings } from "@shared/schema";
import { PaymentDialog } from "@/components/payment-dialog";

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

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  // 1. QUERY DE LA ORDEN
  const { data: order, isLoading } = useQuery<RepairOrderWithDetails>({
    queryKey: ["/api/orders", orderId],
    enabled: !!orderId,
  });

  // 2. QUERY DE SETTINGS (Para saber qué preguntas mostrar en el checklist)
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
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
      toast({
        title: "Orden actualizada correctamente",
        description: "Los cambios han sido guardados exitosamente.",
      });
    },
    onError: () => {
      toast({ title: "Error al actualizar", variant: "destructive" });
    },
  });

  // --- LÓGICA WHATSAPP ---
  const openWhatsApp = (e: React.MouseEvent, phone: string | null | undefined) => {
    e.preventDefault();
    e.stopPropagation();

    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

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

  // Calculate finances
  const totalPaid = order.payments?.reduce((sum, p) => {
    if (p.items && p.items.length > 0) {
      const repairPayment = p.items
        .filter((i: any) => i.type === 'repair' || (!i.type && !i.name.toLowerCase().includes('recargo')))
        .reduce((s: number, i: any) => s + Number(i.price || 0), 0);
      return sum + repairPayment;
    }
    return sum + Number(p.amount);
  }, 0) ?? 0;

  const final = currentData.finalCost ?? 0;
  const estimated = currentData.estimatedCost ?? 0;

  const totalCost = final > 0 ? final : estimated;
  const isCostDefined = totalCost > 0;
  const balance = Math.max(0, totalCost - totalPaid);

  const handleSave = () => {
    updateOrder.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <PaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        defaultOrderId={orderId}
        defaultAmount={balance}
        onPaymentSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId] });
          queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
        }}
      />

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
                    value={currentData.technicianName || ""}
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
                  value={currentData.diagnosis || ""}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  placeholder="Resultado del diagnóstico técnico..."
                  className="min-h-20"
                  data-testid="input-diagnosis"
                />
              </div>

              <div>
                <Label>Solución / Trabajo Realizado</Label>
                <Textarea
                  value={currentData.solution || ""}
                  onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                  placeholder="Describe el trabajo realizado..."
                  className="min-h-20"
                  data-testid="input-solution"
                />
              </div>

              <div>
                <Label>Notas Internas</Label>
                <Textarea
                  value={currentData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas adicionales..."
                  data-testid="input-notes"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Costos y Pagos
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaymentDialogOpen(true)}
                disabled={!isCostDefined}
              >
                <Plus className="h-3 w-3 mr-1" />
                Registrar Pago
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
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
                  {isCostDefined ? (
                    <div className={`h-10 flex items-center px-3 rounded-md border font-medium ${balance > 0 ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300' : 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'}`}>
                      ${balance.toFixed(2)}
                    </div>
                  ) : (
                    <div className="h-10 flex items-center px-3 rounded-md border bg-muted text-muted-foreground text-sm">
                      Costo no definido
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center text-sm px-1">
                <span className="text-muted-foreground">Total Pagado: <span className="font-medium text-foreground">${totalPaid.toFixed(2)}</span></span>
                {isCostDefined && (
                  <span className="text-muted-foreground">Costo Total: <span className="font-medium text-foreground">${totalCost.toFixed(2)}</span></span>
                )}
              </div>

              {order.payments && order.payments.length > 0 && (
                <div className="pt-4 border-t">
                  <Label className="mb-2 block">Historial de Pagos</Label>
                  <div className="space-y-2">
                    <div className="space-y-2">
                      {order.payments.map((payment: Payment) => (
                        <div key={payment.id} className="flex flex-col space-y-1 text-sm py-2 px-3 bg-muted rounded-md">
                          <div className="flex justify-between items-center">
                            <span>{format(new Date(payment.date), "d MMM yyyy", { locale: es })}</span>
                            <span className="font-medium text-green-600 dark:text-green-400">
                              +${payment.amount.toFixed(2)}
                            </span>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {payment.items && payment.items.length > 0 ? (
                              <div className="flex flex-col gap-1 mt-1">
                                {payment.items.map((item: any, idx: number) => (
                                  <span key={idx} className="flex justify-between">
                                    <span>• {item.quantity}x {item.name}</span>
                                  </span>
                                ))}
                                {payment.notes && <span className="italic mt-1 border-t pt-1">Nota: "{payment.notes}"</span>}
                              </div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <span className="capitalize">{payment.method}</span>
                                {payment.notes && <span className="italic max-w-[200px] truncate">"{payment.notes}"</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* TARJETA DE CLIENTE */}
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
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm text-muted-foreground">{order.client.phone}</p>
                      {order.client.phone && (
                        <div
                          role="button"
                          onClick={(e) => openWhatsApp(e, order.client.phone)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 border border-green-600/40 text-green-600 hover:bg-green-900/30 hover:border-green-500/60 hover:text-green-400 transition-all cursor-pointer backdrop-blur-sm"
                          title="Enviar WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    {order.client.email && (
                      <p className="text-sm text-muted-foreground">{order.client.email}</p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* TARJETA DE DISPOSITIVO */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Dispositivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Marca / Modelo</p>
                <p className="font-medium text-base">{order.device.brand} {order.device.model}</p>
              </div>

              {(order.device.imei || order.device.serialNumber) && (
                <div className="grid grid-cols-2 gap-2">
                  {order.device.imei && (
                    <div>
                      <p className="text-sm text-muted-foreground">IMEI</p>
                      <p className="font-mono text-sm">{order.device.imei}</p>
                    </div>
                  )}
                  {order.device.serialNumber && (
                    <div>
                      <p className="text-sm text-muted-foreground">N° Serie</p>
                      <p className="font-mono text-sm">{order.device.serialNumber}</p>
                    </div>
                  )}
                </div>
              )}

              {(order.device.color || order.device.condition) && (
                <div className="grid grid-cols-2 gap-2">
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
                </div>
              )}

              {/* SECCIÓN DE BLOQUEO UNIFICADA */}
              <div className="pt-2 border-t mt-2">
                <div className="flex items-center gap-2 mb-2">
                  {(!order.device.lockType || order.device.lockType === "NONE") ? (
                    <Unlock className="h-4 w-4 text-green-500" />
                  ) : (
                    <Lock className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="font-medium text-sm">Bloqueo de Pantalla</span>
                </div>

                {(!order.device.lockType || order.device.lockType === "NONE") ? (
                  <p className="text-sm text-muted-foreground pl-6">Sin bloqueo</p>
                ) : (
                  <div className="pl-6 space-y-2">
                    {/* PIN o CONTRASEÑA */}
                    {(order.device.lockType === "PIN" || order.device.lockType === "PASSWORD") && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                          {order.device.lockType === "PIN" ? "PIN" : "Contraseña"}
                        </span>
                        <div className="text-lg font-mono bg-muted/30 p-2 rounded border border-dashed mt-1 select-all">
                          {order.device.lockValue || "No definido"}
                        </div>
                      </div>
                    )}

                    {/* PATRÓN */}
                    {order.device.lockType === "PATRON" && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold block mb-2">
                          Patrón
                        </span>
                        <div className="flex justify-center items-center p-3 bg-muted/20 rounded-md border border-dashed border-muted-foreground/30 w-[200px]">
                          <PatternLock
                            value={order.device.lockValue || ""}
                            readOnly={true}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
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

          {/* CHECKLIST DE RECEPCIÓN DINÁMICO */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Checklist de Recepción
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* MAGIA AQUÍ: Usamos la configuración o las claves guardadas */}
              {(settings?.checklistOptions || Object.keys(order.intakeChecklist || {})).map((item) => {
                // Como ahora intakeChecklist es Record<string, string>, accedemos directo
                const val = (order.intakeChecklist as any)?.[item];

                let text = "Desconocido";
                let color = "text-muted-foreground";

                if (val === "yes") { text = "Sí"; color = "text-green-600 dark:text-green-400 font-medium"; }
                else if (val === "no") { text = "No"; color = "text-red-600 dark:text-red-400 font-medium"; }
                // Si es null/undefined, queda como Desconocido/Gris

                return (
                  <div key={item} className="flex justify-between items-center text-sm border-b last:border-0 pb-2 last:pb-0">
                    <span>{item}</span>
                    <span className={color}>{text}</span>
                  </div>
                );
              })}

              {(!settings?.checklistOptions && (!order.intakeChecklist || Object.keys(order.intakeChecklist).length === 0)) && (
                <p className="text-sm text-muted-foreground italic">Sin información de checklist.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div >
  );
}