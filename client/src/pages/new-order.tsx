import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
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
    // data comes largely as strings (from standard inputs) but validation rules might have transformed it?
    // Actually zodResolver transforms "estimatedCost" string -> number.
    // So 'data' passed here IS transformed.
    // We just need to signal TS that it is safe to use as the mutation input.
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
