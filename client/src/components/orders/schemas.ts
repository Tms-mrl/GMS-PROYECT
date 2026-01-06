import { z } from "zod";

export const orderFormSchema = z.object({
    clientId: z.string().min(1, "Selecciona un cliente"),
    deviceId: z.string().min(1, "Selecciona o crea un dispositivo"),
    problem: z.string().min(1, "Describe el problema"),
    estimatedCost: z.string().transform((val) => parseFloat(val) || 0),
    estimatedDate: z.string(),
    priority: z.enum(["normal", "urgente"]),
    technicianName: z.string(),
    notes: z.string(),
});

export const newDeviceSchema = z.object({
    brand: z.string().min(1, "La marca es requerida"),
    model: z.string().min(1, "El modelo es requerido"),
    imei: z.string(),
    serialNumber: z.string(),
    color: z.string(),
    condition: z.string(),
    lockType: z.enum(["PIN", "PATRON", "PASSWORD"]).or(z.literal("")).optional(),
    lockValue: z.string().optional(),
});

export type OrderFormValues = z.input<typeof orderFormSchema>;
export type NewDeviceValues = z.input<typeof newDeviceSchema>;
