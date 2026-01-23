import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OrderFormValues } from "./schemas"; // Asegúrate que la ruta a schemas sea correcta

interface OrderDetailsProps {
    form: UseFormReturn<OrderFormValues>;
}

export function OrderDetails({ form }: OrderDetailsProps) {
    return (
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
    );
}