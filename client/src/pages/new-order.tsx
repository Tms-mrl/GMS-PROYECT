import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Smartphone, User } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Client, Device } from "@shared/schema";

const orderFormSchema = z.object({
  clientId: z.string().min(1, "Selecciona un cliente"),
  deviceId: z.string().min(1, "Selecciona o crea un dispositivo"),
  problem: z.string().min(1, "Describe el problema"),
  estimatedCost: z.string().transform((val) => parseFloat(val) || 0),
  estimatedDate: z.string(),
  priority: z.enum(["normal", "urgente"]),
  technicianName: z.string(),
  notes: z.string(),
});

const newDeviceSchema = z.object({
  brand: z.string().min(1, "La marca es requerida"),
  model: z.string().min(1, "El modelo es requerido"),
  imei: z.string(),
  serialNumber: z.string(),
  color: z.string(),
  condition: z.string(),
});

export default function NewOrder() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showNewDevice, setShowNewDevice] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: devices } = useQuery<Device[]>({
    queryKey: ["/api/devices", selectedClientId],
    enabled: !!selectedClientId,
  });

  const form = useForm({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      clientId: "",
      deviceId: "",
      problem: "",
      estimatedCost: "0",
      estimatedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      priority: "normal" as const,
      technicianName: "",
      notes: "",
    },
  });

  const deviceForm = useForm({
    resolver: zodResolver(newDeviceSchema),
    defaultValues: {
      brand: "",
      model: "",
      imei: "",
      serialNumber: "",
      color: "",
      condition: "Bueno",
    },
  });

  const createDevice = useMutation({
    mutationFn: async (data: z.infer<typeof newDeviceSchema>) => {
      const res = await apiRequest("POST", "/api/devices", {
        ...data,
        clientId: selectedClientId,
      });
      return res.json();
    },
    onSuccess: (newDevice: Device) => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices", selectedClientId] });
      form.setValue("deviceId", newDevice.id);
      setShowNewDevice(false);
      deviceForm.reset();
      toast({ title: "Dispositivo agregado" });
    },
  });

  const createOrder = useMutation({
    mutationFn: async (data: z.infer<typeof orderFormSchema>) => {
      const res = await apiRequest("POST", "/api/orders", {
        ...data,
        status: "recibido",
        diagnosis: "",
        solution: "",
        finalCost: 0,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Orden creada exitosamente" });
      navigate("/ordenes");
    },
    onError: () => {
      toast({ title: "Error al crear la orden", variant: "destructive" });
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    createOrder.mutate(data);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild data-testid="button-back">
          <Link href="/ordenes">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Nueva Orden de Reparación</h1>
          <p className="text-muted-foreground">Registra una nueva reparación</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seleccionar Cliente *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedClientId(value);
                          form.setValue("deviceId", "");
                        }}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-client">
                            <SelectValue placeholder="Selecciona un cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients?.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name} - {client.phone}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button variant="outline" size="sm" asChild>
                  <Link href="/clientes/nuevo">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Cliente
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Dispositivo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showNewDevice ? (
                  <>
                    <FormField
                      control={form.control}
                      name="deviceId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Seleccionar Dispositivo *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={!selectedClientId}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-device">
                                <SelectValue placeholder={selectedClientId ? "Selecciona un dispositivo" : "Primero selecciona un cliente"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {devices?.map((device) => (
                                <SelectItem key={device.id} value={device.id}>
                                  {device.brand} {device.model} {device.imei && `- ${device.imei}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowNewDevice(true)}
                      disabled={!selectedClientId}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Dispositivo
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Marca *</Label>
                        <Input 
                          {...deviceForm.register("brand")} 
                          placeholder="Samsung, Apple..."
                          data-testid="input-device-brand"
                        />
                      </div>
                      <div>
                        <Label>Modelo *</Label>
                        <Input 
                          {...deviceForm.register("model")} 
                          placeholder="Galaxy S21..."
                          data-testid="input-device-model"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>IMEI</Label>
                      <Input 
                        {...deviceForm.register("imei")} 
                        placeholder="123456789012345"
                        className="font-mono"
                        data-testid="input-device-imei"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Color</Label>
                        <Input {...deviceForm.register("color")} placeholder="Negro" />
                      </div>
                      <div>
                        <Label>Condición</Label>
                        <Input {...deviceForm.register("condition")} placeholder="Bueno" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="button"
                        size="sm"
                        onClick={deviceForm.handleSubmit((data) => createDevice.mutate(data))}
                        disabled={createDevice.isPending}
                        data-testid="button-save-device"
                      >
                        Guardar Dispositivo
                      </Button>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowNewDevice(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalles de la Reparación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="problem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Problema Reportado *</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Describe el problema que reporta el cliente..."
                        className="min-h-24"
                        data-testid="input-problem"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="estimatedCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo Estimado</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min="0" 
                          step="0.01"
                          data-testid="input-estimated-cost"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimatedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha Estimada</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="date"
                          data-testid="input-estimated-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridad</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-priority">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="technicianName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Técnico Asignado</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Nombre del técnico"
                        data-testid="input-technician"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas Adicionales</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Cualquier información adicional..."
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" asChild>
              <Link href="/ordenes">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={createOrder.isPending} data-testid="button-submit-order">
              {createOrder.isPending ? "Creando..." : "Crear Orden"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
