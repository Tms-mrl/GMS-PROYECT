import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  type Payment,
  type InsertPayment,
  type RepairOrderWithDetails,
  type Product,
  type PaymentItem,
  type Settings
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
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
import { Plus, Search, ShoppingBag, Wrench, Trash2, ShoppingCart, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export default function Payments() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // --- POS STATE ---
  const [cart, setCart] = useState<PaymentItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo");
  const [saleNotes, setSaleNotes] = useState("");

  // Selection States
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productQty, setProductQty] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<RepairOrderWithDetails | null>(null);
  const [customItem, setCustomItem] = useState({ name: "", price: 0 });
  const [isProductComboboxOpen, setIsProductComboboxOpen] = useState(false);
  const [isOrderComboboxOpen, setIsOrderComboboxOpen] = useState(false);

  // --- QUERIES ---
  const { data: payments = [] } = useQuery<(Payment & { order?: RepairOrderWithDetails })[]>({
    queryKey: ["/api/payments"],
  });

  const { data: orders = [] } = useQuery<RepairOrderWithDetails[]>({
    queryKey: ["/api/orders"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  // Filter Active Orders
  const activeOrders = orders.filter(o => o.status !== "entregado" || o.finalCost > 0);

  // --- CART ACTIONS ---
  const addToCart = (item: PaymentItem) => {
    // Check duplicates only for orders (can't pay same order twice in one bill usually)
    if (item.type === 'repair' && cart.some(i => i.type === 'repair' && i.id === item.id)) {
      toast({ title: "Esta orden ya está en el carrito", variant: "destructive" });
      return;
    }

    // For products, stack them
    if (item.type === 'product') {
      const existing = cart.find(i => i.type === 'product' && i.id === item.id);
      if (existing) {
        setCart(cart.map(i => i.id === item.id && i.type === 'product'
          ? { ...i, quantity: i.quantity + item.quantity }
          : i
        ));
        toast({ title: "Cantidad actualizada" });
        return;
      }
    }

    setCart([...cart, item]);
    toast({ title: "Item agregado" });
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // --- CALCULATIONS (CORREGIDO: TARJETA Y TRANSFERENCIA) ---
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  let surchargePercent = 0;
  let surchargeLabel = "";

  if (paymentMethod === "tarjeta") {
    surchargePercent = settings?.cardSurcharge || 0;
    surchargeLabel = "Recargo Tarjeta";
  } else if (paymentMethod === "transferencia") {
    surchargePercent = settings?.transferSurcharge || 0;
    surchargeLabel = "Recargo Transferencia";
  }

  const surchargeAmount = subtotal * (surchargePercent / 100);
  const totalAmount = subtotal + surchargeAmount;

  // --- MUTATION ---
  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      // 1. Prepare items
      const finalItems = [...cart];

      // 2. Add surcharge item if applicable
      if (surchargeAmount > 0) {
        finalItems.push({
          type: "other",
          id: "surcharge", // dummy ID
          name: `${surchargeLabel} (${surchargePercent}%)`,
          quantity: 1,
          price: surchargeAmount
        });
      }

      const payload: InsertPayment = {
        amount: totalAmount,
        method: paymentMethod,
        notes: saleNotes || (cart.length > 0 ? `Venta de ${cart.length} items` : "Venta general"),
        items: finalItems
      };
      const res = await apiRequest("POST", "/api/payments", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] }); // Refresh stock
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Pago registrado correctamente" });
      setIsOpen(false);
      setCart([]);
      setSaleNotes("");
      setPaymentMethod("efectivo");
    },
    onError: (error) => {
      toast({
        title: "Error al registrar pago",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const handleCreatePayment = () => {
    if (cart.length === 0) {
      toast({ title: "El carrito está vacío", variant: "destructive" });
      return;
    }
    createPaymentMutation.mutate();
  };

  // --- HELPERS ---
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredPayments = payments.filter((payment) => {
    const searchLower = searchTerm.toLowerCase();
    const notes = (payment.notes || "").toLowerCase();
    return notes.includes(searchLower);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Cobros y Caja</h1>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Venta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col p-0 gap-0">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle>Nueva Venta / Cobro</DialogTitle>
            </DialogHeader>

            <div className="flex flex-1 overflow-hidden">
              {/* LEFT COLUMN: ITEM SELECTION */}
              <div className="w-1/2 p-4 border-r overflow-y-auto space-y-4 bg-muted/30">
                <Tabs defaultValue="product" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="product">Producto</TabsTrigger>
                    <TabsTrigger value="repair">Reparación</TabsTrigger>
                    <TabsTrigger value="custom">Manual</TabsTrigger>
                  </TabsList>

                  {/* TAB: PRODUCT */}
                  <TabsContent value="product" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Buscar Producto</label>
                      <Popover open={isProductComboboxOpen} onOpenChange={setIsProductComboboxOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full justify-between">
                            {selectedProduct ? selectedProduct.name : "Seleccionar producto..."}
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar por nombre o SKU..." />
                            <CommandList>
                              <CommandEmpty>No encontrado.</CommandEmpty>
                              <CommandGroup>
                                {products.map((product) => (
                                  <CommandItem
                                    key={product.id}
                                    value={product.name}
                                    onSelect={() => {
                                      setSelectedProduct(product);
                                      setIsProductComboboxOpen(false);
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", selectedProduct?.id === product.id ? "opacity-100" : "opacity-0")} />
                                    <div className="flex flex-col">
                                      <span>{product.name}</span>
                                      <span className="text-xs text-muted-foreground">Stock: {product.quantity} | {formatMoney(product.price)}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {selectedProduct && (
                      <div className="p-3 border rounded-md bg-background space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Precio Unitario:</span>
                          <span className="font-bold">{formatMoney(selectedProduct.price)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Disponible:</span>
                          <span className={selectedProduct.quantity < 1 ? "text-destructive font-bold" : ""}>{selectedProduct.quantity}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-sm font-medium">Cantidad:</label>
                          <Input
                            type="number"
                            min={1}
                            max={selectedProduct.quantity}
                            value={productQty}
                            onChange={(e) => setProductQty(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-20"
                          />
                        </div>
                        <Button
                          className="w-full"
                          disabled={selectedProduct.quantity < 1}
                          onClick={() => {
                            addToCart({
                              type: "product",
                              id: selectedProduct.id,
                              name: selectedProduct.name,
                              price: selectedProduct.price,
                              quantity: productQty
                            });
                            setSelectedProduct(null);
                            setProductQty(1);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" /> Agregar al Carrito
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB: REPAIR */}
                  <TabsContent value="repair" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Buscar Orden</label>
                      <Popover open={isOrderComboboxOpen} onOpenChange={setIsOrderComboboxOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full justify-between">
                            {selectedOrder ? `#${selectedOrder.id.slice(0, 4)} - ${selectedOrder.client.name}` : "Seleccionar orden..."}
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar por cliente..." />
                            <CommandList>
                              <CommandEmpty>No encontrada.</CommandEmpty>
                              <CommandGroup>
                                {activeOrders.map((order) => {
                                  // VISUAL ONLY: Aquí no es crítico el cálculo exacto, es solo para mostrar en la lista
                                  const precioAmostrar = order.finalCost > 0 ? order.finalCost : order.estimatedCost;
                                  return (
                                    <CommandItem
                                      key={order.id}
                                      value={order.client.name + " " + order.device.model}
                                      onSelect={() => {
                                        setSelectedOrder(order);
                                        setIsOrderComboboxOpen(false);
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", selectedOrder?.id === order.id ? "opacity-100" : "opacity-0")} />
                                      <div className="flex flex-col">
                                        <span className="font-medium">{order.client.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {order.device.model} | Total: {formatMoney(precioAmostrar)}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {selectedOrder && (
                      <div className="p-3 border rounded-md bg-background space-y-3">
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Dispositivo:</span>
                            <span>{selectedOrder.device.brand} {selectedOrder.device.model}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Costo Total:</span>
                            <span className="font-bold">
                              {formatMoney(selectedOrder.finalCost > 0 ? selectedOrder.finalCost : selectedOrder.estimatedCost)}
                            </span>
                          </div>
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => {
                            const fullCost = selectedOrder.finalCost > 0 ? selectedOrder.finalCost : selectedOrder.estimatedCost;

                            // --- CORRECCIÓN AQUÍ: Filtrar recargos del total pagado ---
                            const totalPaid = selectedOrder.payments?.reduce((sum, p) => {
                              if (p.items && p.items.length > 0) {
                                // Solo sumamos items que NO sean recargos
                                const repairPayment = p.items
                                  .filter((i: any) => i.type === 'repair' || (!i.type && !i.name.toLowerCase().includes('recargo')))
                                  .reduce((s: number, i: any) => s + Number(i.price || 0), 0);
                                return sum + repairPayment;
                              }
                              // Fallback para pagos antiguos sin items
                              return sum + Number(p.amount);
                            }, 0) ?? 0;
                            // -----------------------------------------------------------

                            const balance = Math.max(0, fullCost - totalPaid);

                            if (balance <= 0) {
                              toast({
                                title: "Orden Pagada",
                                description: "Esta orden ya no tiene saldo pendiente.",
                                variant: "default"
                              });
                              return;
                            }

                            addToCart({
                              type: "repair",
                              id: selectedOrder.id,
                              name: `Reparación ${selectedOrder.device.model} - ${selectedOrder.client.name} (Saldo)`,
                              price: balance,
                              quantity: 1
                            });
                            setSelectedOrder(null);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" /> Agregar Orden
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB: CUSTOM */}
                  <TabsContent value="custom" className="space-y-4 mt-4">
                    <div className="space-y-3 p-3 border rounded-md bg-background">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Concepto</label>
                        <Input
                          placeholder="Ej: Servicio express"
                          value={customItem.name}
                          onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Precio</label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={customItem.price || ""}
                          onChange={(e) => setCustomItem({ ...customItem, price: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <Button
                        className="w-full"
                        disabled={!customItem.name || customItem.price <= 0}
                        onClick={() => {
                          addToCart({
                            type: "other",
                            name: customItem.name,
                            price: customItem.price,
                            quantity: 1
                          });
                          setCustomItem({ name: "", price: 0 });
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" /> Agregar Item
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* RIGHT COLUMN: CART & CHECKOUT */}
              <div className="w-1/2 flex flex-col h-full bg-background rounded-r-lg">
                <div className="p-4 border-b bg-muted/10">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" /> Carrito de Venta
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                      <ShoppingBag className="w-12 h-12 mb-2" />
                      <p>Carrito vacío</p>
                    </div>
                  ) : (
                    cart.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-card shadow-sm group">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={cn("p-2 rounded-full",
                            item.type === 'product' ? "bg-green-100 text-green-700" :
                              item.type === 'repair' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                          )}>
                            {item.type === 'product' && <ShoppingBag className="w-4 h-4" />}
                            {item.type === 'repair' && <Wrench className="w-4 h-4" />}
                            {item.type === 'other' && <DollarSign className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.quantity} x {formatMoney(item.price)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-sm">{formatMoney(item.price * item.quantity)}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeFromCart(idx)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* --- FOOTER DEL CARRITO (ESTILIZADO) --- */}
                <div className="p-4 border-t bg-muted/20 space-y-4">
                  <div className="space-y-2">
                    {surchargeAmount > 0 ? (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-md text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>{formatMoney(subtotal)}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>+ {surchargeLabel} ({surchargePercent}%):</span>
                          <span>{formatMoney(surchargeAmount)}</span>
                        </div>
                        <div className="border-t border-yellow-300 dark:border-yellow-800 pt-1 mt-1 flex justify-between font-bold text-base">
                          <span>Total Final:</span>
                          <span>{formatMoney(totalAmount)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center text-lg font-bold pt-2 border-t">
                        <span>Total a Pagar</span>
                        <span>{formatMoney(totalAmount)}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Método de Pago</label>
                      <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="efectivo">Efectivo</SelectItem>
                          <SelectItem value="tarjeta">Tarjeta</SelectItem>
                          <SelectItem value="transferencia">Transferencia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Nota (Opcional)</label>
                      <Input placeholder="Nota de venta..." value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} />
                    </div>
                  </div>

                  <Button size="lg" className="w-full font-bold" disabled={cart.length === 0 || createPaymentMutation.isPending} onClick={handleCreatePayment}>
                    {createPaymentMutation.isPending ? "Procesando..." : `Cobrar ${formatMoney(totalAmount)}`}
                  </Button>
                </div>
              </div>
            </div>
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
                <TableHead>Items</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
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
                    {payment.orderId ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                        <Wrench className="w-3 h-3 mr-1" /> Reparación
                      </Badge>
                    ) : (payment.items && payment.items.length > 0) ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                        <ShoppingBag className="w-3 h-3 mr-1" /> Venta
                      </Badge>
                    ) : (
                      <Badge variant="outline">General</Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {payment.items && payment.items.length > 0 ? (
                        <div className="flex flex-col">
                          {payment.items.map((item: any, idx: number) => (
                            <span key={idx} className="font-medium text-sm flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">{item.quantity}x</span>
                              {item.name}
                            </span>
                          ))}
                          {payment.notes && !payment.notes.startsWith("Venta de") && (
                            <span className="text-xs text-muted-foreground italic mt-1">"{payment.notes}"</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-foreground font-medium">
                          {payment.orderId ? "Pago de Reparación" : (payment.notes || "Movimiento general")}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="capitalize">{payment.method}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(payment.amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}