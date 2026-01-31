import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { RepairOrderWithDetails, Settings } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect } from "react";

// --- HELPERS ---
const getFinancials = (order: RepairOrderWithDetails) => {
    const totalCost = order.finalCost > 0 ? order.finalCost : order.estimatedCost;

    const totalPaid = order.payments?.reduce((sum, p) => {
        if (p.items && p.items.length > 0) {
            const repairPayment = p.items
                .filter((i: any) => i.type === 'repair' || (!i.type && !i.name.toLowerCase().includes('recargo')))
                .reduce((s: number, i: any) => s + Number(i.price || 0), 0);
            return sum + repairPayment;
        }
        return sum + Number(p.amount);
    }, 0) || 0;

    const balance = Math.max(0, totalCost - totalPaid);
    return { totalCost, totalPaid, balance };
};

// Helper para obtener SI/NO de la respuesta
const getCheckValue = (checklist: any, key: string) => {
    const val = checklist?.[key];
    if (val === "yes") return "SI";
    if (val === "no") return "NO";
    return "-";
};

// Helper para limpiar el texto de la pregunta (quitar signos para ahorrar espacio en la hoja)
const cleanLabel = (text: string) => {
    return text.replace(/[¿?]/g, "").substring(0, 10); // Max 10 caracteres
};

// ==========================================
// 1. COPIA DEL TÉCNICO (Parte Superior - 42% Altura)
// ==========================================
const TechnicianCopy = ({ order, settings }: { order: RepairOrderWithDetails, settings?: Settings }) => {
    const { totalCost, totalPaid, balance } = getFinancials(order);

    // Obtenemos las opciones dinámicas O las que tenga la orden guardada
    const checklistItems = settings?.checklistOptions && settings.checklistOptions.length > 0
        ? settings.checklistOptions
        : Object.keys(order.intakeChecklist || {});

    return (
        <div className="flex flex-col h-full text-[10px] font-sans text-black leading-tight border-b-2 border-dashed border-gray-400 pb-2">
            {/* HEADER TÉCNICO */}
            <div className="flex justify-between items-center mb-1 border-b-2 border-black pb-1">
                <div className="flex items-center gap-2">
                    <span className="bg-black text-white px-2 py-0.5 font-bold text-xs">COPIA TALLER</span>
                    <span className="font-bold text-lg">#{order.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="text-[9px]">
                    Ingreso: <b>{format(new Date(order.createdAt), "dd/MM HH:mm")}</b> | Impreso: {format(new Date(), "dd/MM HH:mm")}
                </div>
            </div>

            {/* DATOS PRINCIPALES */}
            <div className="flex border border-black mb-1">
                {/* CLIENTE */}
                <div className="w-1/2 border-r border-black p-1">
                    <div className="font-bold bg-gray-200 px-1 mb-1 text-[9px]">DATOS DEL CLIENTE</div>
                    <div className="grid grid-cols-[45px_1fr] gap-y-0.5">
                        <span className="font-bold">Nombre:</span> <span className="uppercase truncate">{order.client.name}</span>
                        <span className="font-bold">Tel:</span> <span>{order.client.phone}</span>
                        <span className="font-bold">DNI:</span> <span>{order.client.dni || "-"}</span>
                    </div>
                </div>
                {/* EQUIPO */}
                <div className="w-1/2 p-1">
                    <div className="font-bold bg-gray-200 px-1 mb-1 text-[9px]">DATOS DEL EQUIPO</div>
                    <div className="grid grid-cols-[50px_1fr] gap-y-0.5">
                        <span className="font-bold">Modelo:</span> <span className="uppercase truncate">{order.device.brand} {order.device.model}</span>
                        <span className="font-bold">Pass/Pin:</span> <span className="font-mono font-bold text-xs">{order.device.lockValue || "NO"} ({order.device.lockType})</span>
                        <span className="font-bold">IMEI:</span> <span className="font-mono truncate">{order.device.imei || "-"}</span>
                    </div>
                </div>
            </div>

            {/* DETALLES TÉCNICOS (CHECKLIST Y FALLA) */}
            <div className="flex gap-1 flex-1 min-h-0 mb-1">
                {/* Checklist Dinámico */}
                <div className="w-1/3 border border-black text-[9px]">
                    <div className="bg-gray-200 font-bold text-center border-b border-black py-0.5">CHECKLIST</div>
                    <div className="grid grid-cols-2 p-1 gap-x-2 gap-y-0.5">
                        {checklistItems.length > 0 ? (
                            checklistItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between border-b border-dotted border-gray-300 overflow-hidden">
                                    <span className="truncate mr-1" title={item}>{cleanLabel(item)}:</span>
                                    <b>{getCheckValue(order.intakeChecklist, item)}</b>
                                </div>
                            ))
                        ) : (
                            <span className="col-span-2 text-center italic text-gray-500">Sin checklist</span>
                        )}
                    </div>
                </div>

                {/* Falla y Obs */}
                <div className="w-2/3 flex flex-col gap-1">
                    <div className="border border-black flex-1 p-1 overflow-hidden">
                        <span className="font-bold underline text-[9px]">REPARACIÓN SOLICITADA:</span>
                        <p className="italic ml-1 leading-snug">"{order.problem}"</p>
                    </div>
                    <div className="border border-black flex-1 p-1 overflow-hidden">
                        <span className="font-bold underline text-[9px]">OBSERVACIONES TÉCNICAS:</span>
                        <p className="ml-1 leading-snug">{order.notes || "-"}</p>
                    </div>
                </div>
            </div>

            {/* PIE TÉCNICO: PAGOS Y FIRMA */}
            <div className="flex items-end gap-2 h-10">
                <div className="w-3/5 border border-black flex text-xs h-full">
                    <div className="flex-1 border-r border-black flex flex-col justify-center items-center bg-gray-50">
                        <span className="text-[8px] text-gray-500">TOTAL</span>
                        <span className="font-bold">${totalCost}</span>
                    </div>
                    <div className="flex-1 border-r border-black flex flex-col justify-center items-center bg-gray-50">
                        <span className="text-[8px] text-gray-500">ADELANTO</span>
                        <span className="font-bold">${totalPaid}</span>
                    </div>
                    <div className="flex-1 flex flex-col justify-center items-center bg-gray-200">
                        <span className="text-[8px] text-gray-600 font-bold">RESTA</span>
                        <span className="font-bold text-sm">${balance}</span>
                    </div>
                </div>
                <div className="w-2/5 border-b border-black text-center pb-0.5">
                    <span className="text-[7px] font-bold uppercase">Firma Conformidad Cliente</span>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 2. COPIA DEL CLIENTE (Parte Inferior - 53% Altura)
// ==========================================
const ClientCopy = ({ order, settings }: { order: RepairOrderWithDetails, settings?: Settings }) => {
    const { totalCost, totalPaid, balance } = getFinancials(order);
    const terminos = settings?.receiptDisclaimer || "Sin términos configurados. Configurelos en Ajustes.";

    return (
        <div className="flex flex-col h-full pt-2 text-[11px] font-sans text-black leading-snug">
            {/* HEADER NEGOCIO */}
            <div className="flex justify-between items-start mb-2 border-b-2 border-black pb-2">
                <div className="flex gap-3 items-center">
                    {/* LOGO */}
                    {settings?.logoUrl ? (
                        <img src={settings.logoUrl} alt="Logo" className="w-12 h-12 object-contain" />
                    ) : (
                        <div className="w-12 h-12 bg-black text-white rounded-md flex items-center justify-center text-xl font-bold">
                            GSM
                        </div>
                    )}

                    <div>
                        <h2 className="font-bold text-lg uppercase leading-none mb-1">{settings?.shopName || "MI TALLER"}</h2>
                        <div className="text-[9px] space-y-0.5 text-gray-700">
                            <p>📍 {settings?.address || "Dirección no configurada"}</p>
                            <p>📱 {settings?.phone || "Teléfono no configurado"}</p>
                            <p>📧 {settings?.email || ""}</p>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="border border-black px-2 py-1 bg-gray-100 mb-1 inline-block">
                        <span className="block text-[8px] text-gray-500 text-center">ORDEN N°</span>
                        <span className="font-bold text-xl block leading-none">#{order.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <p className="text-[10px] mt-1">Fecha: <b>{format(new Date(order.createdAt), "dd/MM/yyyy")}</b></p>
                </div>
            </div>

            {/* CUERPO PRINCIPAL */}
            <div className="flex gap-3 mb-2">
                {/* COLUMNA IZQUIERDA: EQUIPO Y PROBLEMA */}
                <div className="w-2/3 flex flex-col gap-2">
                    <div className="border border-black p-1.5 rounded-sm">
                        <div className="font-bold bg-gray-200 px-1 -mx-1.5 -mt-1.5 mb-1.5 border-b border-black text-[9px] py-0.5">
                            DATOS DEL EQUIPO
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                            <div><span className="font-bold">Equipo:</span> <span className="uppercase">{order.device.brand} {order.device.model}</span></div>
                            <div><span className="font-bold">Color:</span> <span className="uppercase">{order.device.color || "-"}</span></div>
                            <div className="col-span-2"><span className="font-bold">IMEI/SN:</span> <span className="font-mono text-[10px]">{order.device.imei || "-"}</span></div>
                            <div className="col-span-2 border-t border-dotted border-gray-400 mt-1 pt-1"><span className="font-bold">Cliente:</span> {order.client.name}</div>
                        </div>
                    </div>

                    <div className="border border-black p-1.5 rounded-sm flex-1">
                        <div className="font-bold text-[9px] underline mb-1">REPARACIÓN SOLICITADA:</div>
                        <p className="italic font-medium">{order.problem}</p>
                    </div>
                </div>

                {/* COLUMNA DERECHA: FINANZAS */}
                <div className="w-1/3">
                    <div className="border border-black rounded-sm overflow-hidden h-full flex flex-col">
                        <div className="bg-black text-white font-bold text-center py-1 text-[10px]">RESUMEN DE PAGO</div>
                        <div className="p-2 flex-1 flex flex-col justify-center space-y-2 text-right">
                            <div className="flex justify-between border-b border-dashed border-gray-400 pb-1">
                                <span>Total:</span>
                                <span className="font-bold">${totalCost}</span>
                            </div>
                            <div className="flex justify-between text-green-700 border-b border-dashed border-gray-400 pb-1">
                                <span>Adelanto:</span>
                                <span className="font-bold">- ${totalPaid}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold bg-gray-200 p-1 -mx-2 -mb-2 mt-auto">
                                <span>RESTA:</span>
                                <span>${balance}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* TÉRMINOS Y CONDICIONES */}
            <div className="flex-1 border-t-2 border-black pt-1 min-h-0 overflow-hidden flex flex-col">
                <h3 className="font-bold text-[9px] mb-1 underline">TÉRMINOS Y CONDICIONES:</h3>
                <div className="text-[9px] text-justify leading-snug text-gray-700 whitespace-pre-wrap h-full overflow-hidden">
                    {terminos}
                </div>
            </div>

            {/* FIRMA FINAL */}
            <div className="mt-2 flex justify-end">
                <div className="w-1/3 border-t border-black text-center pt-1">
                    <span className="text-[8px] font-bold">FIRMA Y ACLARACIÓN RESPONSABLE</span>
                </div>
            </div>
        </div>
    );
};

// --- PÁGINA PRINCIPAL ---
export default function OrderPrint() {
    const [, params] = useRoute("/ordenes/:id/print");
    const orderId = params?.id;

    const { data: order, isLoading } = useQuery<RepairOrderWithDetails>({
        queryKey: ["/api/orders", orderId],
        enabled: !!orderId,
    });

    const { data: settings } = useQuery<Settings>({
        queryKey: ["/api/settings"],
    });

    useEffect(() => {
        if (order && settings !== undefined) {
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [order, settings]);

    if (isLoading || !order) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-white">
                <Skeleton className="h-[297mm] w-[210mm]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8 print:p-0 print:bg-white font-sans print:overflow-hidden">
            {/* BOTONES */}
            <div className="max-w-[210mm] mx-auto mb-6 flex justify-between print:hidden">
                <Button variant="outline" asChild>
                    <Link href={`/ordenes/${orderId}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver a la Orden
                    </Link>
                </Button>
                <Button onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir
                </Button>
            </div>

            {/* ÁREA DE IMPRESIÓN */}
            <div id="print-area" className="bg-white w-[210mm] h-[296mm] mx-auto p-[8mm] shadow-lg print:shadow-none print:w-full print:h-[296mm] print:absolute print:top-0 print:left-0 print:m-0 flex flex-col justify-between overflow-hidden box-border">
                {/* TÉCNICO */}
                <div className="h-[42%]">
                    <TechnicianCopy order={order} settings={settings} />
                </div>

                {/* LÍNEA DE CORTE */}
                <div className="relative py-1 flex items-center justify-center print:py-1 h-[5%]">
                    <div className="absolute w-full border-b-2 border-dashed border-gray-400"></div>
                    <span className="relative bg-white px-2 text-[8px] text-gray-500 font-bold tracking-widest">CORTE AQUÍ</span>
                </div>

                {/* CLIENTE */}
                <div className="h-[53%]">
                    <ClientCopy order={order} settings={settings} />
                </div>
            </div>

            <style>{`
        @media print {
          @page { margin: 0; size: A4; }
          html, body {
            height: 100%;
            overflow: hidden;
          }
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 296mm;
            margin: 0;
            padding: 8mm;
          }
        }
      `}</style>
        </div>
    );
}