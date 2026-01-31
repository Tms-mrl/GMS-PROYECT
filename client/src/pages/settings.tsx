import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSettingsSchema, type InsertSettings, type Settings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Save, Upload, Image as ImageIcon, LogOut, Plus, X, Printer, FileText, ScrollText } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useLocation } from "wouter";

export default function SettingsPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [, setLocation] = useLocation();

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
            ticketFooter: "",
            checklistOptions: [],
            printFormat: "a4", // Valor por defecto
        },
    });

    // Helper para manejar el array de strings manualmente
    const [checklistItems, setChecklistItems] = useState<string[]>([]);

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
                cardSurcharge: Number(settings.cardSurcharge) || 0,
                transferSurcharge: Number(settings.transferSurcharge) || 0,
                receiptDisclaimer: settings.receiptDisclaimer || "",
                ticketFooter: settings.ticketFooter || "",
                checklistOptions: settings.checklistOptions || [],
                printFormat: settings.printFormat || "a4",
            });
            setChecklistItems(settings.checklistOptions || []);
        }
    }, [settings, form]);

    const mutation = useMutation({
        mutationFn: async (data: InsertSettings) => {
            const finalData = { ...data, checklistOptions: checklistItems };
            const res = await apiRequest("POST", "/api/settings", finalData);
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

    // Handlers para checklist manual
    const addChecklistItem = () => {
        if (checklistItems.length >= 12) {
            toast({ title: "Máximo 12 ítems permitidos", variant: "destructive" });
            return;
        }
        setChecklistItems([...checklistItems, "Nuevo ítem"]);
    };

    const updateChecklistItem = (index: number, value: string) => {
        const newItems = [...checklistItems];
        newItems[index] = value;
        setChecklistItems(newItems);
        form.setValue("checklistOptions", newItems);
    };

    const removeChecklistItem = (index: number) => {
        const newItems = checklistItems.filter((_, i) => i !== index);
        setChecklistItems(newItems);
        form.setValue("checklistOptions", newItems);
    };

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            toast({ title: "Sesión cerrada correctamente" });
            setLocation("/auth");
        } catch (error: any) {
            toast({
                title: "Error al cerrar sesión",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="container max-w-2xl py-10 space-y-8 pb-20">
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

                            {/* --- SECCIÓN 3: PREFERENCIAS DE IMPRESIÓN (NUEVO) --- */}
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-medium flex items-center gap-2">
                                    <Printer className="h-5 w-5" />
                                    Preferencias de Impresión
                                </h3>
                                <FormField
                                    control={form.control}
                                    name="printFormat"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Formato de Orden de Reparación</FormLabel>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* OPCIÓN A4 */}
                                                <label className={`relative flex cursor-pointer flex-col rounded-lg border-2 p-4 hover:bg-accent/50 ${field.value === 'a4' ? 'border-primary bg-accent' : 'border-muted'}`}>
                                                    <input
                                                        type="radio"
                                                        className="sr-only"
                                                        checked={field.value === 'a4'}
                                                        onChange={() => field.onChange('a4')}
                                                    />
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                            <FileText className="h-6 w-6" />
                                                        </div>
                                                        <span className="font-semibold">Hoja A4 (Estándar)</span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Imprime dos copias (Original y Duplicado) en una sola hoja A4. Ideal para entregar una mitad al cliente.
                                                    </p>
                                                </label>

                                                {/* OPCIÓN TICKET */}
                                                <label className={`relative flex cursor-pointer flex-col rounded-lg border-2 p-4 hover:bg-accent/50 ${field.value === 'ticket' ? 'border-primary bg-accent' : 'border-muted'}`}>
                                                    <input
                                                        type="radio"
                                                        className="sr-only"
                                                        checked={field.value === 'ticket'}
                                                        onChange={() => field.onChange('ticket')}
                                                    />
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                            <ScrollText className="h-6 w-6" />
                                                        </div>
                                                        <span className="font-semibold">Ticket Térmico</span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Formato de tira continua para impresoras de 80mm o 58mm. Diseño compacto y económico.
                                                    </p>
                                                </label>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* --- SECCIÓN 4: FINANZAS --- */}
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
                                                            className="pl-4 pr-8"
                                                        />
                                                        <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">%</span>
                                                    </div>
                                                </FormControl>
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
                                                            className="pl-4 pr-8"
                                                        />
                                                        <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">%</span>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* --- SECCIÓN 5: CHECKLIST DE RECEPCIÓN --- */}
                            <div className="space-y-4 pt-4 border-t">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-medium">Checklist de Recepción</h3>
                                    <Button type="button" variant="outline" size="sm" onClick={addChecklistItem} disabled={checklistItems.length >= 12}>
                                        <Plus className="h-4 w-4 mr-2" /> Agregar Item
                                    </Button>
                                </div>
                                <p className="text-sm text-muted-foreground">Define qué preguntas aparecerán al ingresar un equipo (Máx 12).</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {checklistItems.map((item, index) => (
                                        <div key={index} className="flex gap-2 items-center">
                                            <Input
                                                value={item}
                                                onChange={(e) => updateChecklistItem(index, e.target.value)}
                                                placeholder="Ej. ¿Enciende?"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                                onClick={() => removeChecklistItem(index)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* --- SECCIÓN 6: LEGALES --- */}
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-medium">Textos Legales</h3>
                                <FormField
                                    control={form.control}
                                    name="receiptDisclaimer"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Términos y Condiciones (Orden de Reparación)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="El equipo se recibe en las condiciones..."
                                                    className="min-h-[100px]"
                                                    {...field}
                                                    value={field.value ?? ""}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="ticketFooter"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Pie de Ticket (Comprobante de Pago)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Gracias por su compra. Garantía de 30 días..."
                                                    className="min-h-[80px]"
                                                    {...field}
                                                    value={field.value ?? ""}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* --- BOTONES DE ACCIÓN --- */}
                            <div className="flex items-center justify-between pt-6 border-t">
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Cerrar Sesión
                                </Button>

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

// --- SUBCOMPONENTE DE LOGO ---
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

        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "La imagen no puede superar los 5MB", variant: "destructive" });
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
                throw new Error(err.message || "Error al subir imagen");
            }

            const data = await res.json();
            onChange(data.url);
            toast({ title: "Logo cargado correctamente" });

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
                    <img src={value} alt="Logo" className="h-full w-full object-contain p-1" />
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