import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const authSchema = z.object({
    email: z.string().email("Formato de email inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export default function AuthPage() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // Verificar si ya hay sesión al cargar
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setLocation("/");
            }
        };
        checkSession();
    }, [setLocation]);

    // Login Form
    const loginForm = useForm<z.infer<typeof authSchema>>({
        resolver: zodResolver(authSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    // Register Form
    const registerForm = useForm<z.infer<typeof authSchema>>({
        resolver: zodResolver(authSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onLogin(values: z.infer<typeof authSchema>) {
        try {
            setIsLoading(true);
            const { error, data } = await supabase.auth.signInWithPassword({
                email: values.email,
                password: values.password,
            });

            if (error) {
                toast({
                    variant: "destructive",
                    title: "Error al iniciar sesión",
                    description: error.message === "Invalid login credentials"
                        ? "Credenciales incorrectas. Verifica tu email y contraseña."
                        : error.message,
                });
                return;
            }

            if (data.session) {
                // REDIRECCIÓN INMEDIATA
                toast({
                    title: "Bienvenido",
                    description: "Ingresando al sistema...",
                });

                // Pequeño timeout para permitir que el toast se renderice antes de cambiar de página
                setTimeout(() => {
                    setLocation("/");
                }, 500);
            }

        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Ocurrió un error inesperado.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    async function onRegister(values: z.infer<typeof authSchema>) {
        try {
            setIsLoading(true);
            const { error, data } = await supabase.auth.signUp({
                email: values.email,
                password: values.password,
            });

            if (error) {
                toast({
                    variant: "destructive",
                    title: "Error al registrarse",
                    description: error.message,
                });
                return;
            }

            if (data.session) {
                toast({
                    title: "Cuenta creada",
                    description: "Bienvenido a GSM FIX.",
                });
                setLocation("/");
            } else if (data.user) {
                toast({
                    title: "Verifica tu email",
                    description: "Se ha enviado un correo de confirmación. Revisa tu bandeja de entrada.",
                });
            }

        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Ocurrió un error inesperado.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Left Panel - Hero */}
            <div className="hidden lg:flex w-1/2 bg-zinc-900 items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-black/60 z-10" />
                <div
                    className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1581092921461-eab62e97a780?q=80&w=2070&auto=format&fit=crop')] 
          bg-cover bg-center opacity-30"
                />

                <div className="relative z-20 p-12 text-white max-w-lg">
                    <div className="flex items-center gap-3 mb-8">
                        <ShieldCheck className="h-12 w-12 text-blue-400" />
                        <h1 className="text-4xl font-bold tracking-tight">GSM FIX</h1>
                    </div>
                    <h2 className="text-2xl font-semibold mb-4">Gestión Inteligente de Reparaciones</h2>
                    <p className="text-zinc-300 text-lg leading-relaxed">
                        Administra tus clientes, dispositivos y órdenes de servicio en un solo lugar.
                        Seguridad y eficiencia para tu negocio técnico.
                    </p>
                </div>
            </div>

            {/* Right Panel - Auth Forms */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left mb-8">
                        <h2 className="text-2xl font-bold">Bienvenido de nuevo</h2>
                        <p className="text-muted-foreground">Ingresa a tu cuenta para administrar el sistema.</p>
                    </div>

                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-8">
                            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                            <TabsTrigger value="register">Registrarse</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login">
                            <Card className="border-0 shadow-none">
                                <CardContent className="p-0">
                                    <Form {...loginForm}>
                                        <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                                            <FormField
                                                control={loginForm.control}
                                                name="email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Email</FormLabel>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                                                <Input placeholder="admin@gsmfix.com" className="pl-10" {...field} />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={loginForm.control}
                                                name="password"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Contraseña</FormLabel>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                                                <Input type="password" placeholder="******" className="pl-10" {...field} />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <Button type="submit" className="w-full" disabled={isLoading}>
                                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Ingresar
                                            </Button>
                                        </form>
                                    </Form>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="register">
                            <Card className="border-0 shadow-none">
                                <CardContent className="p-0">
                                    <Form {...registerForm}>
                                        <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                                            <FormField
                                                control={registerForm.control}
                                                name="email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Email</FormLabel>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                                                <Input placeholder="tu@email.com" className="pl-10" {...field} />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={registerForm.control}
                                                name="password"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Contraseña</FormLabel>
                                                        <CardDescription className="mb-2">Mínimo 6 caracteres</CardDescription>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                                                <Input type="password" placeholder="******" className="pl-10" {...field} />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <Button type="submit" className="w-full" disabled={isLoading}>
                                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Crear Cuenta
                                            </Button>
                                        </form>
                                    </Form>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}