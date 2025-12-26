import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  DollarSign, 
  Plus, 
  Search,
  CreditCard,
  Banknote,
  ArrowRightLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Payment, RepairOrderWithDetails, PaymentMethod } from "@shared/schema";

const methodIcons: Record<PaymentMethod, typeof Banknote> = {
  efectivo: Banknote,
  tarjeta: CreditCard,
  transferencia: ArrowRightLeft,
};

const methodLabels: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
};

export default function Payments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [paymentNotes, setPaymentNotes] = useState("");
  const { toast } = useToast();

  const { data: payments, isLoading: paymentsLoading } = useQuery<(Payment & { order?: RepairOrderWithDetails })[]>({
    queryKey: ["/api/payments"],
  });

  const { data: orders } = useQuery<RepairOrderWithDetails[]>({
    queryKey: ["/api/orders"],
  });

  const pendingOrders = orders?.filter(o => {
    const totalPaid = o.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
    const total = o.finalCost || o.estimatedCost;
    return total > totalPaid && o.status !== "entregado";
  });

  const createPayment = useMutation({
    mutationFn: async (data: { orderId: string; amount: number; method: PaymentMethod; notes: string }) => {
      const res = await apiRequest("POST", "/api/payments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Pago registrado" });
      setIsDialogOpen(false);
      setSelectedOrderId("");
      setPaymentAmount("");
      setPaymentMethod("efectivo");
      setPaymentNotes("");
    },
    onError: () => {
      toast({ title: "Error al registrar el pago", variant: "destructive" });
    },
  });

  const handleSubmitPayment = () => {
    if (!selectedOrderId || !paymentAmount) return;
    createPayment.mutate({
      orderId: selectedOrderId,
      amount: parseFloat(paymentAmount),
      method: paymentMethod,
      notes: paymentNotes,
    });
  };

  const totalToday = payments?.filter(p => {
    const today = new Date().toDateString();
    return new Date(p.date).toDateString() === today;
  }).reduce((sum, p) => sum + p.amount, 0) ?? 0;

  const totalMonth = payments?.filter(p => {
    const now = new Date();
    const paymentDate = new Date(p.date);
    return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
  }).reduce((sum, p) => sum + p.amount, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Cobros y Pagos</h1>
          <p className="text-muted-foreground">Gestiona los pagos de las reparaciones</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-payment">
              <Plus className="h-4 w-4 mr-2" />
              Registrar Pago
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Pago</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Orden de Reparación *</Label>
                <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                  <SelectTrigger data-testid="select-order-payment">
                    <SelectValue placeholder="Selecciona una orden" />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingOrders?.map((order) => {
                      const totalPaid = order.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
                      const balance = (order.finalCost || order.estimatedCost) - totalPaid;
                      return (
                        <SelectItem key={order.id} value={order.id}>
                          {order.device.brand} {order.device.model} - {order.client.name} (${balance.toFixed(2)} pendiente)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Monto *</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  data-testid="input-payment-amount"
                />
              </div>

              <div>
                <Label>Método de Pago</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {(["efectivo", "tarjeta", "transferencia"] as PaymentMethod[]).map((method) => {
                    const Icon = methodIcons[method];
                    return (
                      <Button
                        key={method}
                        type="button"
                        variant={paymentMethod === method ? "default" : "outline"}
                        className="flex-col h-auto py-3 gap-1"
                        onClick={() => setPaymentMethod(method)}
                        data-testid={`button-method-${method}`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs">{methodLabels[method]}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>Notas</Label>
                <Textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Notas adicionales..."
                  data-testid="input-payment-notes"
                />
              </div>

              <Button 
                className="w-full" 
                onClick={handleSubmitPayment}
                disabled={!selectedOrderId || !paymentAmount || createPayment.isPending}
                data-testid="button-submit-payment"
              >
                {createPayment.isPending ? "Registrando..." : "Registrar Pago"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ingresos Hoy</p>
                <p className="text-2xl font-bold">${totalToday.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ingresos del Mes</p>
                <p className="text-2xl font-bold">${totalMonth.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar pagos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-payments"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : payments && payments.length > 0 ? (
            <div className="space-y-2">
              {payments.map((payment) => {
                const Icon = methodIcons[payment.method];
                return (
                  <div 
                    key={payment.id}
                    className="flex items-center justify-between p-4 rounded-md bg-muted/50"
                    data-testid={`payment-${payment.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-md bg-background">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {payment.order?.device?.brand} {payment.order?.device?.model}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {payment.order?.client?.name} - {format(new Date(payment.date), "d MMM yyyy HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600 dark:text-green-400">
                        +${payment.amount.toFixed(2)}
                      </p>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {methodLabels[payment.method]}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={DollarSign}
              title="Sin pagos registrados"
              description="Los pagos que registres aparecerán aquí"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
