import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  type Payment,
  type InsertPayment,
  type RepairOrderWithDetails
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Search, DollarSign, ShoppingBag, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Schema local para el formulario (permite orderId opcional)
const formSchema = z.object({
  isOrderPayment: z.boolean().default(true), // Controla el modo del formulario
  orderId: z.string().optional(),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Monto inválido"),
  method: z.enum(["efectivo", "tarjeta", "transferencia"]),
  notes: z.string().min(1, "La descripción/nota es requerida"),
});

export default function Payments() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // 1. Obtener pagos
  const { data: payments = [] } = useQuery<(Payment & { order?: RepairOrderWithDetails })[]>({
    queryKey: ["/api/payments"],
  });

  // 2. Obtener órdenes (para el desplegable)
  const { data: orders = [] } = useQuery<RepairOrderWithDetails[]>({
    queryKey: ["/api/orders"],
  });

  // Filtramos solo órdenes activas o pendientes de pago
  const activeOrders = orders.filter(o => o.status !== "entregado" || o.finalCost > 0);

  // 3. Configuración del Formulario
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isOrderPayment: true,
      amount: "",
      method: "efectivo",
      notes: "",
    },
  });

  // Detectar si está en modo "Pago de Orden"
  const isOrderPayment = form.watch("isOrderPayment");

  // 4. Mutación para crear pago
  const createPaymentMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      // Preparamos los datos para el backend
      const payload: InsertPayment = {
        amount: Number(values.amount),
        method: values.method,
        notes: values.notes,
        // Si no es pago de orden, enviamos undefined/null
        orderId: values.isOrderPayment ? values.orderId : undefined,
      };

      const res = await apiRequest("POST", "/api/payments", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] }); // Actualizar saldo de órdenes
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Pago registrado correctamente" });
      setIsOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error al registrar pago",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Filtrado de la tabla
  const filteredPayments = payments.filter((payment) => {
    const searchLower = searchTerm.toLowerCase();
    const clientName = payment.order?.client?.name?.toLowerCase() || "";
    const notes = payment.notes.toLowerCase();
    return clientName.includes(searchLower) || notes.includes(searchLower);
  });

  // Formateador de moneda
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Cobros y Caja</h1>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cobro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Ingreso</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createPaymentMutation.mutate(data))} className="space-y-4">

                {/* SWITCH TIPO DE PAGO */}
                <FormField
                  control={form.control}
                  name="isOrderPayment"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Vincular a Reparación</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          {field.value ? "Seleccionar una orden existente" : "Venta directa o servicio suelto"}
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* SELECTOR DE ORDEN (Solo si está activo el switch) */}
                {isOrderPayment && (
                  <FormField
                    control={form.control}
                    name="orderId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seleccionar Orden</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Buscar orden por cliente..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activeOrders.map((order) => (
                              <SelectItem key={order.id} value={order.id}>
                                {order.client.name} - {order.device.model} (Pend: {formatMoney(order.finalCost)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monto</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-8" type="number" placeholder="0.00" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Método</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="efectivo">Efectivo</SelectItem>
                            <SelectItem value="tarjeta">Tarjeta</SelectItem>
                            <SelectItem value="transferencia">Transferencia</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {isOrderPayment ? "Notas / Concepto" : "Descripción de la venta *"}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder={isOrderPayment ? "Ej: Seña inicial" : "Ej: Venta de funda silicona S23"} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={createPaymentMutation.isPending}>
                  {createPaymentMutation.isPending ? "Registrando..." : "Registrar Cobro"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente o concepto..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Transacciones</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Concepto / Cliente</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No hay movimientos registrados
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.date), "dd/MM/yyyy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell>
                      {payment.order ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                          <Wrench className="w-3 h-3 mr-1" /> Reparación
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                          <ShoppingBag className="w-3 h-3 mr-1" /> Venta
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        {payment.order ? (
                          <span className="font-medium">{payment.order.client.name}</span>
                        ) : (
                          <span className="font-medium text-foreground/80">{payment.notes}</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {payment.order
                            ? `${payment.order.device.brand} ${payment.order.device.model}`
                            : "Venta directa"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{payment.method}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(payment.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}