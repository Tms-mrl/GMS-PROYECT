
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@shared/schema";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductDialog } from "./product-dialog";
import { ImportDialog } from "./import-dialog";
import { QuickRestockPopover } from "./quick-restock-popover";

export default function InventoryPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [isProductOpen, setIsProductOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: products = [], isLoading } = useQuery<Product[]>({
        queryKey: ["/api/products"],
    });

    const filteredProducts = products?.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.includes(searchTerm)
    );

    const handleCreate = () => {
        setSelectedProduct(null);
        setIsProductOpen(true);
    };

    const handleEdit = (product: Product) => {
        setSelectedProduct(product);
        setIsProductOpen(true);
    };

    const deleteProductMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/products/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
            toast({
                title: "Producto eliminado",
                description: "El producto ha sido eliminado correctamente del inventario.",
            });
            setProductToDelete(null);
        },
        onError: () => {
            toast({
                title: "Error",
                description: "No se pudo eliminar el producto. Inténtalo de nuevo.",
                variant: "destructive",
            });
        },
    });

    const handleDeleteClick = (product: Product) => {
        setProductToDelete(product);
    };

    const confirmDelete = () => {
        if (productToDelete) {
            deleteProductMutation.mutate(productToDelete.id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
                    <p className="text-muted-foreground">
                        Gestión de stock, productos y precios
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Importar Excel
                    </Button>
                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Producto
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Listado de Productos</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre o SKU..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : filteredProducts?.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            No se encontraron productos
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Categoría</TableHead>
                                    <TableHead className="text-right">Costo</TableHead>
                                    <TableHead className="text-right">Precio Venta</TableHead>
                                    <TableHead className="text-center w-[120px]">Stock</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProducts?.map((product) => {
                                    const isLowStock = product.quantity <= product.lowStockThreshold;
                                    return (
                                        <TableRow key={product.id}>
                                            <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                                            <TableCell className="font-medium">
                                                <div>{product.name}</div>
                                                {product.description && (
                                                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                        {product.description}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-normal">
                                                    {product.category}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                ${product.cost.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                ${product.price.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <span className={isLowStock ? "text-destructive font-bold" : ""}>
                                                        {product.quantity}
                                                    </span>
                                                    {isLowStock && (
                                                        <Badge variant="destructive" className="h-4 px-1 py-0 text-[10px] mr-1">
                                                            !
                                                        </Badge>
                                                    )}
                                                    <QuickRestockPopover product={product} />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(product)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteClick(product)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <ProductDialog
                open={isProductOpen}
                onOpenChange={setIsProductOpen}
                product={selectedProduct}
            />

            <ImportDialog
                open={isImportOpen}
                onOpenChange={setIsImportOpen}
            />

            <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente al producto
                            <span className="font-semibold text-foreground"> {productToDelete?.name} </span>
                            del inventario.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
