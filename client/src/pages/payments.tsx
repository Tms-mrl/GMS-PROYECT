import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  Plus,
  Search,
  Banknote,
  CreditCard,
  ArrowRightLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Payment, RepairOrderWithDetails, PaymentMethod } from "@shared/schema";
import { PaymentDialog } from "@/components/payment-dialog";

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

  const { data: payments, isLoading: paymentsLoading } = useQuery<(Payment & { order?: RepairOrderWithDetails })[]>({
    queryKey: ["/api/payments"],
  });

  const totalToday = payments?.filter(p => {
    const today = new Date().toDateString();
    return new Date(p.date).toDateString() === today;
  }).reduce((sum, p) => sum + p.amount, 0) ?? 0;

  const totalMonth = payments?.filter(p => {
    const now = new Date();
    const paymentDate = new Date(p.date);
    return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
  }).reduce((sum, p) => sum + p.amount, 0) ?? 0;

  const filteredPayments = payments?.filter(payment => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const amount = payment.amount.toString();
    const clientName = payment.order?.client?.name?.toLowerCase() || "";
    const device = `${payment.order?.device?.brand} ${payment.order?.device?.model}`.toLowerCase();

    return amount.includes(searchLower) ||
      clientName.includes(searchLower) ||
      device.includes(searchLower);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Cobros y Pagos</h1>
          <p className="text-muted-foreground">Gestiona los pagos de las reparaciones</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-new-payment">
          <Plus className="h-4 w-4 mr-2" />
          Registrar Pago
        </Button>
      </div>

      <PaymentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />

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
          ) : filteredPayments && filteredPayments.length > 0 ? (
            <div className="space-y-2">
              {filteredPayments.map((payment) => {
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
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm text-muted-foreground">
                          <span>{payment.order?.client?.name}</span>
                          <span className="hidden sm:inline">•</span>
                          <span>{format(new Date(payment.date), "d MMM yyyy HH:mm", { locale: es })}</span>
                        </div>
                        {payment.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">"{payment.notes}"</p>
                        )}
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
