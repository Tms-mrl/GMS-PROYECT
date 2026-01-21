
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import readXlsxFile from "read-excel-file";
import { apiRequest } from "@/lib/queryClient";

interface ImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setProgress(0);

        try {
            // 1. Parse Excel
            const rows = await readXlsxFile(file);
            // Expected format: Name, SKU, Category, Cost, Price, Quantity
            // Skip header row
            const dataRows = rows.slice(1);

            const total = dataRows.length;
            let successes = 0;
            let errors = 0;

            for (let i = 0; i < total; i++) {
                const row = dataRows[i];
                // Simple mapping based on index. PROD: Map by column content/name if possible.
                // Assuming: 0=Name, 1=SKU, 2=Category, 3=Cost, 4=Price, 5=Quantity
                const productData = {
                    name: String(row[0] || ""),
                    sku: String(row[1] || ""),
                    category: String(row[2] || "General"),
                    cost: Number(row[3]) || 0,
                    price: Number(row[4]) || 0,
                    quantity: Number(row[5]) || 0,
                    description: "Importado desde Excel",
                    lowStockThreshold: 5,
                };

                if (!productData.name) {
                    errors++;
                    continue;
                }

                try {
                    await apiRequest("POST", "/api/products", productData);
                    successes++;
                } catch (err) {
                    console.error("Error creating product:", productData.name, err);
                    errors++;
                }

                setProgress(Math.round(((i + 1) / total) * 100));
            }

            await queryClient.invalidateQueries({ queryKey: ["products"] });

            toast({
                title: "Importación Completada",
                description: `Se importaron ${successes} productos. ${errors > 0 ? `${errors} errores.` : ""}`,
                variant: errors > 0 ? "destructive" : "default",
            });

            onOpenChange(false);
        } catch (error) {
            console.error("Excel import error:", error);
            toast({
                title: "Error al leer archivo",
                description: "Asegúrese de que sea un archivo Excel válido (.xlsx).",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Importar Productos desde Excel</DialogTitle>
                    <DialogDescription>
                        Sube un archivo .xlsx con las columnas: Nombre, SKU, Categoría, Costo, Precio, Cantidad.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex items-center justify-center w-full">
                        <label
                            htmlFor="dropzone-file"
                            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}
                        >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                {isProcessing ? (
                                    <>
                                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                                        <p className="mt-2 text-sm text-muted-foreground">Procesando... {progress}%</p>
                                    </>
                                ) : (
                                    <>
                                        <FileUp className="w-8 h-8 mb-4 text-muted-foreground" />
                                        <p className="mb-2 text-sm text-muted-foreground">
                                            <span className="font-semibold">Click para subir</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground">.XLSX, .XLS</p>
                                    </>
                                )}
                            </div>
                            <Input
                                id="dropzone-file"
                                type="file"
                                className="hidden"
                                accept=".xlsx, .xls"
                                onChange={handleFileUpload}
                                disabled={isProcessing}
                                ref={fileInputRef}
                            />
                        </label>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
