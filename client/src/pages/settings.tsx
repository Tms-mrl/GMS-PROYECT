import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSettingsSchema, type InsertSettings, type Settings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Loader2, Save, Upload, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function SettingsPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: settings, isLoading } = useQuery<Settings>({
        queryKey: ["/api/settings"],
    });

    const form = useForm<InsertSettings>({
        resolver: zodResolver(insertSettingsSchema),
        defaultValues: {
            shopName: "",
            address: "",
            phone: "",
            email: "",
            whatsapp: "",
            landline: "",
            logoUrl: "",
            cardSurcharge: 0,
            transferSurcharge: 0,
            receiptDisclaimer: "",
        },
    });

    useEffect(() => {
        if (settings) {
            form.reset({
                shopName: settings.shopName || "",
                address: settings.address || "",
                phone: settings.phone || "",
                email: settings.email || "",
                whatsapp: settings.whatsapp || "",
                landline: settings.landline || "",
                logoUrl: settings.logoUrl || "",
                cardSurcharge: settings.cardSurcharge || 0,
                transferSurcharge: settings.transferSurcharge || 0,
                receiptDisclaimer: settings.receiptDisclaimer || "",
            });
        }
    }, [settings, form]);

    const mutation = useMutation({
        mutationFn: async (data: InsertSettings) => {
            const res = await apiRequest("POST", "/api/settings", data);
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
            toast({
                title: "Éxito",
                description: "Configuración guardada correctamente.",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "No se pudo guardar la configuración.",
                variant: "destructive",
            });
        },
    });

    const onSubmit = (data: InsertSettings) => {
        mutation.mutate(data);
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="container max-w-2xl py-10">
            <Card>
                <CardHeader>
                    <CardTitle>Configuración del Negocio</CardTitle>
                    <CardDescription>
                        Administra los datos de tu taller que aparecerán en los comprobantes y reportes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                            {/* --- SECCIÓN 1: IDENTIDAD --- */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Marca e Identidad</h3>
                                <FormField
                                    control={form.control}
                                    name="shopName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nombre del Taller</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ej. GSM Reparaciones" {...field} value={field.value ?? ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="logoUrl"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Logo del Taller</FormLabel>
                                            <FormControl>
                                                <LogoUpload
                                                    value={field.value || ""}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* --- SECCIÓN 2: CONTACTO --- */}
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-medium">Datos de Contacto</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="address"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Dirección</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ej. Av. Siempre Viva 123" {...field} value={field.value ?? ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email Público</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="contacto@mitaller.com" {...field} value={field.value ?? ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Celular</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="+54 9 11 ..." {...field} value={field.value ?? ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="whatsapp"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>WhatsApp</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="+54 9 11 ..." {...field} value={field.value ?? ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="landline"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Fijo</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="4444-5555" {...field} value={field.value ?? ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* --- SECCIÓN 3: FINANZAS (Corregida) --- */}
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-medium">Finanzas</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="cardSurcharge"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Recargo Tarjeta (%)</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            placeholder="0"
                                                            {...field}
                                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                        />
                                                        <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">%</span>
                                                    </div>
                                                </FormControl>
                                                <FormDescription>Se suma al cobrar con Tarjeta.</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="transferSurcharge"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Recargo Transferencia (%)</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            placeholder="0"
                                                            {...field}
                                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                        />
                                                        <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">%</span>
                                                    </div>
                                                </FormControl>
                                                <FormDescription>Se suma al cobrar con Transferencia.</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* --- SECCIÓN 4: RECIBO --- */}
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-medium">Ticket / Recibo</h3>
                                <FormField
                                    control={form.control}
                                    name="receiptDisclaimer"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Términos y Condiciones (Pie de página)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Garantía de 30 días..."
                                                    className="min-h-[100px]"
                                                    {...field}
                                                    value={field.value ?? ""}
                                                />
                                            </FormControl>
                                            <FormDescription>Este texto aparecerá al pie de los tickets.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={mutation.isPending}>
                                    {mutation.isPending && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    <Save className="mr-2 h-4 w-4" />
                                    Guardar Cambios
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

// --- SUBCOMPONENTE DE LOGO (Mantenido intacto) ---
function LogoUpload({ value, onChange }: { value: string, onChange: (url: string) => void }) {
    const [uploading, setUploading] = useState(false);
    const { toast } = useToast();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast({ title: "Solo se permiten imágenes", variant: "destructive" });
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast({ title: "La imagen no puede superar los 2MB", variant: "destructive" });
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const headers: Record<string, string> = {};
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
                headers: headers
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Error al subir imagen");
            }

            const data = await res.json();
            onChange(data.url);
            toast({ title: "Logo subido correctamente" });

        } catch (error: any) {
            console.error(error);
            toast({ title: "Error al subir imagen", description: error.message, variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex items-center gap-4">
            <div className={`h-20 w-20 rounded-md border flex items-center justify-center bg-muted overflow-hidden relative group`}>
                {value ? (
                    <img src={value} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                )}
                {uploading && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                )}
            </div>
            <div className="flex flex-col gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="relative cursor-pointer"
                    disabled={uploading}
                >
                    <Upload className="h-4 w-4 mr-2" />
                    Subir Imagen
                    <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                        disabled={uploading}
                    />
                </Button>
                {value && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive h-auto p-0 justify-start"
                        onClick={() => onChange("")}
                    >
                        Eliminar Logo
                    </Button>
                )}
            </div>
        </div>
    )
}