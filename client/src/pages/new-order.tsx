import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Client, Device, LockType } from "@shared/schema";
import { ClientSelection } from "@/components/orders/client-selection";
import { DeviceSelection } from "@/components/orders/device-selection";
import { OrderDetails } from "@/components/orders/order-details";
import { orderFormSchema, newDeviceSchema, OrderFormValues, NewDeviceValues } from "@/components/orders/schemas";

export default function NewOrder() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showNewDevice, setShowNewDevice] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: devices } = useQuery<Device[]>({
    queryKey: ["/api/devices", selectedClientId],
    enabled: !!selectedClientId,
  });

  const form = useForm<OrderFormValues>({
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
      intakeChecklist: {},
    },
  });

  const deviceForm = useForm<NewDeviceValues>({
    resolver: zodResolver(newDeviceSchema),
    defaultValues: {
      brand: "",
      model: "",
      imei: "",
      serialNumber: "",
      color: "",
      condition: "Bueno",
      lockType: "" as LockType,
      lockValue: "",
    },
  });

  // Watch for client/device changes to reset checklist
  useEffect(() => {
    form.resetField("intakeChecklist");
  }, [selectedClientId, selectedDeviceId, form]);


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
      setSelectedDeviceId(newDevice.id);
      setShowNewDevice(false);
      deviceForm.reset({
        brand: "",
        model: "",
        imei: "",
        serialNumber: "",
        color: "",
        condition: "Bueno",
        lockType: "" as LockType,
        lockValue: "",
      });
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
    createOrder.mutate(data as unknown as z.infer<typeof orderFormSchema>);
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
            <ClientSelection
              form={form}
              clients={clients}
              onClientSelect={(clientId) => {
                setSelectedClientId(clientId);
                form.setValue("deviceId", "");
                setSelectedDeviceId("");
              }}
            />

            <DeviceSelection
              form={form}
              deviceForm={deviceForm}
              devices={devices}
              selectedClientId={selectedClientId}
              showNewDevice={showNewDevice}
              setShowNewDevice={setShowNewDevice}
              onCreateDevice={(data) => createDevice.mutate(data)}
              isCreatingDevice={createDevice.isPending}
            />
          </div>

          <OrderDetails form={form} />

          {/* Intake Checklist Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Checklist de Recepción</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { name: "charges", label: "¿Carga?" },
                  { name: "powersOn", label: "¿Enciende?" },
                  { name: "dropped", label: "¿Golpeado?" },
                  { name: "wet", label: "¿Mojado?" },
                  { name: "openedBefore", label: "¿Abierto previamente?" },
                  { name: "inWarranty", label: "¿En garantía?" },
                ].map((item) => (
                  <FormField
                    key={item.name}
                    control={form.control}
                    name={`intakeChecklist.${item.name}` as any}
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>{item.label}</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id={`${item.name}-yes`} />
                              <label htmlFor={`${item.name}-yes`} className="font-normal cursor-pointer">Sí</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id={`${item.name}-no`} />
                              <label htmlFor={`${item.name}-no`} className="font-normal cursor-pointer">No</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="unknown" id={`${item.name}-unknown`} />
                              <label htmlFor={`${item.name}-unknown`} className="font-normal cursor-pointer">Desconocido</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
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

