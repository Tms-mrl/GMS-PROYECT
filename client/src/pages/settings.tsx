import { useEffect } from "react";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Save } from "lucide-react";

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
            receiptDisclaimer: "",
        },
    });

    useEffect(() => {
        if (settings) {
            form.reset({
                shopName: settings.shopName || "",
                address: settings.address || "",
                phone: settings.phone || "",
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

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Dirección</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Calle Falsa 123" {...field} value={field.value ?? ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Teléfono</FormLabel>
                                            <FormControl>
                                                <Input placeholder="+54 9 11 ..." {...field} value={field.value ?? ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="receiptDisclaimer"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Términos en Recibos (Disclaimer)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Garantía de 30 días..."
                                                className="min-h-[100px]"
                                                {...field}
                                                value={field.value ?? ""}
                                            />
                                        </FormControl>
                                        <p className="text-sm text-muted-foreground">
                                            Este texto aparecerá al pie de los tickets impresos.
                                        </p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end">
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
