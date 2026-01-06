import { Plus, Smartphone } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PatternLock } from "@/components/ui/pattern-lock";
import type { Device, LockType } from "@shared/schema";
import { OrderFormValues, NewDeviceValues } from "./schemas";

interface DeviceSelectionProps {
    form: UseFormReturn<OrderFormValues>;
    deviceForm: UseFormReturn<NewDeviceValues>;
    devices?: Device[];
    selectedClientId: string;
    showNewDevice: boolean;
    setShowNewDevice: (show: boolean) => void;
    onCreateDevice: (data: NewDeviceValues) => void;
    isCreatingDevice: boolean;
}

export function DeviceSelection({
    form,
    deviceForm,
    devices,
    selectedClientId,
    showNewDevice,
    setShowNewDevice,
    onCreateDevice,
    isCreatingDevice,
}: DeviceSelectionProps) {
    const lockType = deviceForm.watch("lockType");

    return (
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
                                                <SelectValue
                                                    placeholder={
                                                        selectedClientId
                                                            ? "Selecciona un dispositivo"
                                                            : "Primero selecciona un cliente"
                                                    }
                                                />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {devices?.map((device) => (
                                                <SelectItem key={device.id} value={device.id}>
                                                    {device.brand} {device.model}{" "}
                                                    {device.imei && `- ${device.imei}`}
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
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>IMEI</Label>
                                <Input
                                    {...deviceForm.register("imei")}
                                    placeholder="123456789012345"
                                    className="font-mono"
                                    data-testid="input-device-imei"
                                />
                            </div>
                            <div>
                                <Label>Tipo de Bloqueo</Label>
                                <Select
                                    value={lockType || "NONE"}
                                    onValueChange={(value) => {
                                        const actualValue = value === "NONE" ? "" : value;
                                        deviceForm.setValue("lockType", actualValue as LockType);
                                        // Limpiar el valor cuando cambia el tipo
                                        deviceForm.setValue("lockValue", "");
                                        deviceForm.clearErrors("lockValue");
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NONE">Ninguno</SelectItem>
                                        <SelectItem value="PIN">PIN</SelectItem>
                                        <SelectItem value="PATRON">Patrón</SelectItem>
                                        <SelectItem value="PASSWORD">Contraseña</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {lockType && (
                            <div className="space-y-2">
                                {lockType === "PIN" && (
                                    <div>
                                        <Label>PIN *</Label>
                                        <Input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            maxLength={8}
                                            {...deviceForm.register("lockValue", {
                                                required: lockType === "PIN" ? "El PIN es requerido" : false,
                                                minLength: {
                                                    value: 4,
                                                    message: "El PIN debe tener al menos 4 dígitos",
                                                },
                                                maxLength: {
                                                    value: 8,
                                                    message: "El PIN no puede tener más de 8 dígitos",
                                                },
                                                validate: (value) => {
                                                    if (lockType === "PIN" && value) {
                                                        if (!/^\d+$/.test(value)) {
                                                            return "El PIN solo puede contener números";
                                                        }
                                                        if (value.length < 4) {
                                                            return "El PIN debe tener al menos 4 dígitos";
                                                        }
                                                    }
                                                    return true;
                                                },
                                                onChange: (e) => {
                                                    // Solo permitir números
                                                    const value = e.target.value.replace(/\D/g, "").slice(0, 8);
                                                    e.target.value = value;
                                                    deviceForm.setValue("lockValue", value);
                                                },
                                            })}
                                            placeholder="1234"
                                            autoComplete="off"
                                            data-testid="input-lock-pin"
                                        />
                                        {deviceForm.formState.errors.lockValue && (
                                            <p className="text-sm text-destructive mt-1">
                                                {deviceForm.formState.errors.lockValue.message}
                                            </p>
                                        )}
                                        {deviceForm.watch("lockValue") && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {deviceForm.watch("lockValue")?.length || 0}/8 dígitos
                                            </p>
                                        )}
                                    </div>
                                )}
                                {lockType === "PASSWORD" && (
                                    <div>
                                        <Label>Contraseña *</Label>
                                        <Input
                                            type="text"
                                            maxLength={20}
                                            {...deviceForm.register("lockValue", {
                                                required:
                                                    lockType === "PASSWORD"
                                                        ? "La contraseña es requerida"
                                                        : false,
                                                maxLength: {
                                                    value: 20,
                                                    message:
                                                        "La contraseña no puede tener más de 20 caracteres",
                                                },
                                                onChange: (e) => {
                                                    const value = e.target.value.slice(0, 20);
                                                    deviceForm.setValue("lockValue", value);
                                                },
                                            })}
                                            placeholder="Ingresa la contraseña"
                                            autoComplete="off"
                                            data-testid="input-lock-password"
                                        />
                                        {deviceForm.formState.errors.lockValue && (
                                            <p className="text-sm text-destructive mt-1">
                                                {deviceForm.formState.errors.lockValue.message}
                                            </p>
                                        )}
                                        {deviceForm.watch("lockValue") && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {deviceForm.watch("lockValue")?.length || 0}/20
                                                caracteres
                                            </p>
                                        )}
                                    </div>
                                )}
                                {lockType === "PATRON" && (
                                    <div>
                                        <Label>Patrón de Desbloqueo *</Label>
                                        <PatternLock
                                            value={deviceForm.watch("lockValue") || ""}
                                            onChange={(pattern) => {
                                                deviceForm.setValue("lockValue", pattern);
                                                // Validar que el patrón tenga al menos 4 puntos
                                                if (pattern) {
                                                    try {
                                                        const points = JSON.parse(pattern);
                                                        if (Array.isArray(points) && points.length < 4) {
                                                            deviceForm.setError("lockValue", {
                                                                type: "manual",
                                                                message: "El patrón debe tener al menos 4 puntos",
                                                            });
                                                        } else {
                                                            deviceForm.clearErrors("lockValue");
                                                        }
                                                    } catch {
                                                        deviceForm.setError("lockValue", {
                                                            type: "manual",
                                                            message: "Patrón inválido",
                                                        });
                                                    }
                                                }
                                            }}
                                        />
                                        {deviceForm.formState.errors.lockValue && (
                                            <p className="text-sm text-destructive mt-1">
                                                {deviceForm.formState.errors.lockValue.message}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Color</Label>
                                <Input
                                    {...deviceForm.register("color")}
                                    placeholder="Negro"
                                />
                            </div>
                            <div>
                                <Label>Condición</Label>
                                <Input
                                    {...deviceForm.register("condition")}
                                    placeholder="Bueno"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                size="sm"
                                onClick={deviceForm.handleSubmit((data) =>
                                    onCreateDevice(data)
                                )}
                                disabled={isCreatingDevice}
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
    );
}
