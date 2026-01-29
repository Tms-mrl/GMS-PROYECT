import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Check, ChevronsUpDown, User, MapPin, Phone, Mail, FileText, StickyNote, UserPlus } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Client, Device } from "@shared/schema"; // <--- LockType ELIMINADO
import { DeviceSelection } from "@/components/orders/device-selection";
import { OrderDetails } from "@/components/orders/order-details";
import { orderFormSchema, newDeviceSchema, OrderFormValues, NewDeviceValues } from "@/components/orders/schemas";

// Definimos el tipo localmente para evitar el error de importación
type LockType = "PIN" | "PASSWORD" | "PATRON" | "NONE";

export default function NewOrder() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Estados para modales y UI
  const [showNewDevice, setShowNewDevice] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [openClientCombobox, setOpenClientCombobox] = useState(false);

  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  // Queries
  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: devices } = useQuery<Device[]>({
    queryKey: ["/api/devices", selectedClientId],
    enabled: !!selectedClientId,
  });

  // Forms
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
      lockType: "" as any, // Inicializar vacío
      lockValue: "",
    },
  });

  // Estado para el formulario del nuevo cliente (Expandido)
  const [newClientData, setNewClientData] = useState({
    name: "",
    phone: "",
    email: "",
    dni: "",
    address: "",
    notes: ""
  });

  // Resetear checklist al cambiar selección
  useEffect(() => {
    form.resetField("intakeChecklist");
  }, [selectedClientId, selectedDeviceId, form]);

  // --- MUTACIÓN CREAR CLIENTE (EXPANDIDA) ---
  const createClient = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/clients", newClientData);
      return res.json();
    },
    onSuccess: (newClient: Client) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });

      // Seleccionar automáticamente al nuevo cliente
      form.setValue("clientId", newClient.id);
      setSelectedClientId(newClient.id);
      form.setValue("deviceId", ""); // Reset device selection
      setSelectedDeviceId("");

      setShowNewClient(false);
      // Reset form fields
      setNewClientData({ name: "", phone: "", email: "", dni: "", address: "", notes: "" });

      toast({ title: "Cliente creado y seleccionado" });
    },
    onError: () => {
      toast({ title: "Error al crear cliente", variant: "destructive" });
    }
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
      setSelectedDeviceId(newDevice.id);
      setShowNewDevice(false);
      deviceForm.reset({
        brand: "",
        model: "",
        imei: "",
        serialNumber: "",
        color: "",
        condition: "Bueno",
        lockType: "" as any,
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

            {/* --- SECCIÓN SELECCIÓN DE CLIENTE (Con Recuadro Tipo Card) --- */}
            <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-full">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Cliente</h3>
              </div>

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Seleccionar Cliente *</FormLabel>
                        <Popover open={openClientCombobox} onOpenChange={setOpenClientCombobox}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openClientCombobox}
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value
                                  ? clients?.find((client) => client.id === field.value)?.name
                                  : "Buscar cliente..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0">
                            <Command>
                              <CommandInput placeholder="Buscar cliente..." />
                              <CommandList>
                                <CommandEmpty>No encontrado.</CommandEmpty>
                                <CommandGroup>
                                  {clients?.map((client) => (
                                    <CommandItem
                                      value={client.name}
                                      key={client.id}
                                      onSelect={() => {
                                        form.setValue("clientId", client.id);
                                        setSelectedClientId(client.id);
                                        form.setValue("deviceId", "");
                                        setSelectedDeviceId("");
                                        setOpenClientCombobox(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          client.id === field.value ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span>{client.name}</span>
                                        <span className="text-xs text-muted-foreground">{client.phone}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Botón ÍCONO pequeño para crear cliente */}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowNewClient(true)}
                  title="Crear Nuevo Cliente"
                  className="mb-[2px]"
                >
                  <UserPlus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* SELECCIÓN DE DISPOSITIVO */}
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

      {/* --- MODAL CREAR CLIENTE (EXPANDIDO) --- */}
      <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre Completo *</label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={newClientData.name}
                    onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Teléfono *</label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={newClientData.phone}
                    onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
                    placeholder="Ej: 11 1234 5678"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    className="pl-9"
                    value={newClientData.email}
                    onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                    placeholder="cliente@email.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">DNI / Documento</label>
                <div className="relative">
                  <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={newClientData.dni}
                    onChange={(e) => setNewClientData({ ...newClientData, dni: e.target.value })}
                    placeholder="DNI"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Dirección</label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={newClientData.address}
                  onChange={(e) => setNewClientData({ ...newClientData, address: e.target.value })}
                  placeholder="Calle 123, Ciudad"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notas / ¿Quién retira?</label>
              <div className="relative">
                <StickyNote className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  className="pl-9 min-h-[80px]"
                  value={newClientData.notes}
                  onChange={(e) => setNewClientData({ ...newClientData, notes: e.target.value })}
                  placeholder="Notas adicionales sobre el cliente..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewClient(false)}>Cancelar</Button>
            <Button
              onClick={() => createClient.mutate()}
              disabled={!newClientData.name || !newClientData.phone || createClient.isPending}
            >
              {createClient.isPending ? "Guardando..." : "Guardar y Seleccionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}