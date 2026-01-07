import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Banknote, CreditCard, ArrowRightLeft, AlertCircle } from "lucide-react";
import type { PaymentMethod, RepairOrderWithDetails } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultOrderId?: string;
    onPaymentSuccess?: () => void;
}

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

export function PaymentDialog({
    open,
    onOpenChange,
    defaultOrderId,
    onPaymentSuccess
}: PaymentDialogProps) {
    const [selectedOrderId, setSelectedOrderId] = useState(defaultOrderId || "");
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState<PaymentMethod>("efectivo");
    const [notes, setNotes] = useState("");
    const { toast } = useToast();

    const { data: orders } = useQuery<RepairOrderWithDetails[]>({
        queryKey: ["/api/orders"],
    });

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (open) {
            if (defaultOrderId) {
                setSelectedOrderId(defaultOrderId);
            }
            setAmount("");
            setMethod("efectivo");
            setNotes("");
        }
    }, [open, defaultOrderId]);

    const selectedOrder = orders?.find(o => o.id === selectedOrderId);

    // Calculate costs logic
    const totalPaid = selectedOrder?.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
    const estimated = selectedOrder?.estimatedCost ?? 0;
    const final = selectedOrder?.finalCost ?? 0;

    // Use final cost if > 0, otherwise estimated cost
    // If both are 0 (or falsy), cost is not defined.
    const totalCost = final > 0 ? final : estimated;
    const isCostDefined = totalCost > 0;

    const pendingBalance = Math.max(0, totalCost - totalPaid);

    // Auto-fill amount when order changes
    useEffect(() => {
        if (selectedOrder && isCostDefined) {
            // Auto fill with pending balance if > 0
            if (pendingBalance > 0) {
                setAmount(pendingBalance.toFixed(2));
            } else {
                setAmount("");
            }
        }
    }, [selectedOrderId, isCostDefined, pendingBalance]); // intent: run when order selection logic resolves

    const createPayment = useMutation({
        mutationFn: async (data: { orderId: string; amount: number; method: PaymentMethod; notes: string }) => {
            const res = await apiRequest("POST", "/api/payments", data);
            return res.json();
        },
        onSuccess: () => {
            // Invalidate all relevant queries
            queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
            queryClient.invalidateQueries({ queryKey: ["/api/orders"] }); // covers lists and details if key matches prefix
            if (selectedOrderId) {
                queryClient.invalidateQueries({ queryKey: ["/api/orders", selectedOrderId] });
            }
            queryClient.invalidateQueries({ queryKey: ["/api/orders/recent"] });
            queryClient.invalidateQueries({ queryKey: ["/api/stats"] });

            toast({ title: "Pago registrado correctamente" });
            onOpenChange(false);
            onPaymentSuccess?.();
        },
        onError: () => {
            toast({ title: "Error al registrar el pago", variant: "destructive" });
        },
    });

    const handleSubmit = () => {
        if (!selectedOrderId || !amount) return;

        const amountNum = parseFloat(amount);

        if (amountNum <= 0) {
            toast({ title: "El monto debe ser mayor a 0", variant: "destructive" });
            return;
        }

        if (amountNum > pendingBalance + 0.01) { // small epsilon for float comparison safety
            toast({
                title: "El monto excede el saldo pendiente",
                description: `Saldo pendiente: $${pendingBalance.toFixed(2)}`,
                variant: "destructive"
            });
            return;
        }

        createPayment.mutate({
            orderId: selectedOrderId,
            amount: amountNum,
            method,
            notes,
        });
    };

    // Filter orders for the dropdown: usually we want to show all workable orders, 
    // or maybe just the pending ones? 
    // Requirement: "Register Payment" modal improvements -> "When selecting an order..."
    // It implies we should be able to select any order? Or usually just ones with debt.
    // Existing logic in payments.tsx filtered by "pending > 0".
    // However, sometimes you might want to add a payment even if balance is 0 (e.g. extra tip, or correction? Unlikely for this app constraints).
    // Let's stick to showing all orders but indicating balance, or filter by pending?
    // Let's filter by: not delivered OR has debt. 
    // Actually, simplest is to show all active orders or orders with debt.
    // Let's use the same filter as the original page: "pending > totalPaid && status !== delivered"
    // BUT the requirements say: "App must continue working even if an order has no payments yet".
    // Let's show all orders sorted by date descending, maybe filter out "Entregado" AND "Fully Paid" to keep list clean?
    // For now, I will list all orders to be safe, but sort them.
    const sortedOrders = orders?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Registrar Pago</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                    <div>
                        <Label>Orden de Reparación</Label>
                        <Select
                            value={selectedOrderId}
                            onValueChange={setSelectedOrderId}
                            disabled={!!defaultOrderId} // If passed from details, lock it? Or allow change?
                        // User requirement: "Register Payment button directly inside Order Detail"
                        // Usually implies context is fixed. I'll disable if defaultOrderId is set.
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona una orden" />
                            </SelectTrigger>
                            <SelectContent>
                                {sortedOrders?.map((order) => {
                                    const pCost = order.finalCost > 0 ? order.finalCost : order.estimatedCost;
                                    const pPaid = order.payments?.reduce((s, p) => s + p.amount, 0) ?? 0;
                                    const pBal = Math.max(0, pCost - pPaid);

                                    return (
                                        <SelectItem key={order.id} value={order.id}>
                                            {order.device.brand} {order.device.model} - {order.client.name}
                                            {pCost <= 0 ? " (Sin costo)" : ` ($${pBal.toFixed(2)} pendiente)`}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedOrder && (
                        <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Costo Total:</span>
                                <span className="font-medium">
                                    {isCostDefined ? `$${totalCost.toFixed(2)}` : "No definido"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Pagado:</span>
                                <span className="font-medium">${totalPaid.toFixed(2)}</span>
                            </div>
                            <div className="border-t pt-2 flex justify-between">
                                <span className="font-semibold">Pendiente:</span>
                                <span className={`font-bold ${pendingBalance > 0 ? "text-red-500" : "text-green-500"}`}>
                                    ${pendingBalance.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}

                    {selectedOrder && !isCostDefined && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Esta orden no tiene un costo definido. Asigne un costo estimado o final antes de registrar pagos.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div>
                        <Label>Monto</Label>
                        <Input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            min="0.01"
                            step="0.01"
                            disabled={!selectedOrderId || !isCostDefined}
                        />
                    </div>

                    <div>
                        <Label>Método de Pago</Label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            {(["efectivo", "tarjeta", "transferencia"] as PaymentMethod[]).map((m) => {
                                const Icon = methodIcons[m];
                                return (
                                    <Button
                                        key={m}
                                        type="button"
                                        variant={method === m ? "default" : "outline"}
                                        className="flex-col h-auto py-3 gap-1"
                                        onClick={() => setMethod(m)}
                                        disabled={!selectedOrderId || !isCostDefined}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span className="text-xs">{methodLabels[m]}</span>
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <Label>Notas</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Notas adicionales..."
                            disabled={!selectedOrderId || !isCostDefined}
                        />
                    </div>

                    <Button
                        className="w-full"
                        onClick={handleSubmit}
                        disabled={
                            !selectedOrderId ||
                            !amount ||
                            !isCostDefined ||
                            createPayment.isPending
                        }
                    >
                        {createPayment.isPending ? "Registrando..." : "Registrar Pago"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
