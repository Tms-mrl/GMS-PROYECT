
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema, type InsertProduct, type Product } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface ProductDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product?: Product | null; // If null, creating new
}

export function ProductDialog({ open, onOpenChange, product }: ProductDialogProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const isEditing = !!product;

    const form = useForm<InsertProduct>({
        resolver: zodResolver(insertProductSchema),
        defaultValues: {
            name: "",
            description: "",
            sku: "",
            category: "",
            quantity: 0,
            cost: 0,
            price: 0,
            lowStockThreshold: 5,
        },
    });

    useEffect(() => {
        if (product) {
            form.reset({
                name: product.name,
                description: product.description,
                sku: product.sku,
                category: product.category,
                quantity: product.quantity,
                cost: product.cost,
                price: product.price,
                lowStockThreshold: product.lowStockThreshold,
            });
        } else {
            form.reset({
                name: "",
                description: "",
                sku: "",
                category: "",
                quantity: 0,
                cost: 0,
                price: 0,
                lowStockThreshold: 5,
            });
        }
    }, [product, form, open]);

    const mutation = useMutation({
        mutationFn: async (data: InsertProduct) => {
            if (isEditing) {
                return apiRequest("PATCH", `/api/products/${product.id}`, data);
            } else {
                return apiRequest("POST", "/api/products", data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] });
            toast({
                title: isEditing ? "Producto actualizado" : "Producto creado",
                description: isEditing
                    ? "El producto se ha actualizado correctamente."
                    : "El nuevo producto se ha agregado al inventario.",
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: "Hubo un error al guardar el producto.",
                variant: "destructive",
            });
        },
    });

    function onSubmit(data: InsertProduct) {
        mutation.mutate(data);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Nombre del Producto</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ej: Pantalla iPhone 11" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="sku"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SKU / Código</FormLabel>
                                        <FormControl>
                                            <Input placeholder="IP11-PANT-ORIG" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Categoría</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Repuestos" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cantidad Actual</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="lowStockThreshold"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Alerta Bajo Stock</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="cost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Costo de Compra</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                {...field}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Precio de Venta</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                {...field}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Descripción</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Detalles adicionales..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
