import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { RepairOrderWithDetails, Settings } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useState } from "react";
import { Printer, ArrowLeft, Edit } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function PrintOrder() {
    const [, params] = useRoute("/ordenes/:id/print");
    const orderId = params?.id;
    const [isReadyToPrint, setIsReadyToPrint] = useState(false);

    // Fetch Order
    const { data: order, isLoading: isLoadingOrder } = useQuery<RepairOrderWithDetails>({
        queryKey: ["/api/orders", orderId],
        enabled: !!orderId,
    });

    // Fetch Settings (Para datos reales del taller)
    const { data: settings, isLoading: isLoadingSettings } = useQuery<Settings>({
        queryKey: ["/api/settings"],
    });

    // Terms State
    const [termsContent, setTermsContent] = useState("");
    const [isEditingTerms, setIsEditingTerms] = useState(false);

    // Sincronizar términos con la configuración cuando cargue
    useEffect(() => {
        if (settings?.receiptDisclaimer) {
            setTermsContent(settings.receiptDisclaimer);
        }
    }, [settings]);

    // Auto-print logic
    useEffect(() => {
        if (order && settings && !isLoadingOrder && !isLoadingSettings) {
            const timer = setTimeout(() => {
                setIsReadyToPrint(true);
                // window.print(); // Descomentar para imprimir automático
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [order, settings, isLoadingOrder, isLoadingSettings]);

    if (isLoadingOrder || isLoadingSettings) {
        return (
            <div className="p-8 space-y-6 max-w-[21cm] mx-auto">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="text-center py-16">
                <p className="text-muted-foreground">Orden no encontrada</p>
                <Button asChild className="mt-4">
                    <Link href="/ordenes">Volver a Órdenes</Link>
                </Button>
            </div>
        );
    }

    // --- HEADER COMPONENT (Dinámico) ---
    const Header = ({ title }: { title: string }) => (
        <div className="flex justify-between items-start border-b border-black pb-2 mb-2 h-20">
            <div className="flex gap-4 items-center">
                {/* Logo si existe */}
                {settings?.logoUrl && (
                    <img
                        src={settings.logoUrl}
                        alt="Logo"
                        className="h-16 w-16 object-contain"
                    />
                )}
                <div>
                    <h1 className="text-xl font-bold uppercase tracking-tight leading-none">
                        {settings?.shopName || "SERVICIO TÉCNICO"}
                    </h1>
                    <p className="text-[10px] font-semibold mt-1">Servicio Técnico Especializado</p>
                    <p className="text-[10px]">{settings?.address}</p>
                    <p className="text-[10px]">
                        {[settings?.phone, settings?.email].filter(Boolean).join(" | ")}
                    </p>
                </div>
            </div>
            <div className="text-right">
                <div className="text-lg font-bold">ORDEN #{order.id.slice(0, 8)}</div>
                <div className="inline-block border border-black px-2 py-0.5 text-xs font-bold mt-1 bg-gray-100">
                    {title}
                </div>
                <div className="text-[10px] mt-1">
                    {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                </div>
            </div>
        </div>
    );

    // --- CUSTOMER COPY (70/30 Layout) ---
    const CustomerCopy = () => (
        <div className="flex flex-col h-full relative">
            <Header title="COMPROBANTE CLIENTE" />

            <div className="flex-1 flex flex-col gap-2 min-h-0">
                {/* 70/30 Grid */}
                <div className="grid grid-cols-[70%_30%] gap-4 text-xs">
                    <div>
                        <h3 className="font-bold border-b border-black mb-1 uppercase text-[10px]">Cliente</h3>
                        <p className="font-semibold">{order.client.name}</p>
                        <p>{order.client.phone}</p>
                        <p className="truncate">{order.client.email}</p>
                        {order.client.address && <p className="truncate text-[10px] text-gray-600">{order.client.address}</p>}
                    </div>
                    <div>
                        <h3 className="font-bold border-b border-black mb-1 uppercase text-[10px]">Dispositivo</h3>
                        <p className="font-bold">{order.device.brand}</p>
                        <p>{order.device.model}</p>
                        <p className="text-[10px] mt-1">IMEI: {order.device.imei || '-'}</p>
                    </div>
                </div>

                {/* Financials */}
                <div className="border border-black p-2 mt-2 flex justify-between items-center bg-gray-50 text-xs">
                    <div>
                        <span className="font-bold mr-2">Total Estimado:</span>
                        ${order.estimatedCost.toFixed(2)}
                    </div>
                    <div>
                        <span className="font-bold mr-2">A Pagar:</span>
                        ${order.estimatedCost.toFixed(2)}
                    </div>
                </div>

                {/* Terms */}
                <div className="flex-1 border border-black p-2 mt-2 flex flex-col min-h-0">
                    <h3 className="font-bold text-[10px] mb-1">TÉRMINOS Y CONDICIONES</h3>
                    <div className="text-[9px] leading-tight text-justify overflow-y-hidden whitespace-pre-wrap flex-grow">
                        {termsContent || settings?.receiptDisclaimer || "Sin términos definidos."}
                    </div>
                </div>
            </div>

            {/* Signature */}
            <div className="mt-4 pt-4 border-t border-black flex justify-between text-[10px]">
                <div className="w-1/3 text-center">
                    <div className="border-t border-black my-4"></div>
                    Firma Cliente
                </div>
                <div className="w-1/3 text-center">
                    <div className="border-t border-black my-4"></div>
                    Recibido por (Tienda)
                </div>
            </div>
        </div>
    );

    // --- TECHNICIAN COPY (70/30 + Compact Checklist) ---
    const TechnicianCopy = () => (
        <div className="flex flex-col h-full relative">
            <Header title="ORDEN DE TALLER" />

            <div className="flex-1 flex flex-col gap-2 min-h-0 text-xs text-black">
                {/* 70/30 Grid */}
                <div className="grid grid-cols-[70%_30%] gap-4">
                    <div>
                        <h3 className="font-bold border-b border-black mb-1 uppercase text-[10px]">Detalle Cliente</h3>
                        <p className="font-semibold">{order.client.name}</p>
                        <p>Tel: {order.client.phone}</p>
                        {order.client.notes && <p className="italic text-[10px] mt-1">"{order.client.notes}"</p>}
                    </div>

                    <div>
                        <h3 className="font-bold border-b border-black mb-1 uppercase text-[10px]">Equipo</h3>
                        <p>{order.device.brand} {order.device.model}</p>
                        <p>Color: {order.device.color}</p>
                        <p>Patrón: {order.device.lockValue || 'N/A'}</p>
                    </div>
                </div>

                {/* Problem */}
                <div className="border border-black p-2 mt-1 bg-gray-50">
                    <p><span className="font-bold">Problema Reportado:</span> {order.problem}</p>
                    {order.notes && <p className="mt-1 border-t border-dashed border-gray-300 pt-1 text-[10px]"><span className="font-bold">Notas Internas:</span> {order.notes}</p>}
                </div>

                {/* COMPACT CHECKLIST (4 Columnas) */}
                <div className="flex-1 mt-1 border border-black p-1 min-h-0 overflow-y-auto">
                    <h3 className="font-bold border-b border-black mb-1 uppercase text-[9px]">Estado de Ingreso</h3>
                    <div className="grid grid-cols-4 gap-x-2 gap-y-0 text-[9px]"> {/* 4 Cols + Menos espacio vertical */}
                        {order.intakeChecklist && typeof order.intakeChecklist === 'object' ? (
                            Object.entries(order.intakeChecklist).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between border-b border-gray-100">
                                    <span className="capitalize truncate mr-1 text-gray-600">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                    <span className={`font-bold ${value === true || value === 'yes' ? 'text-black' :
                                            value === false || value === 'no' ? 'text-gray-300' : 'text-gray-500'
                                        }`}>
                                        {value === true || value === 'yes' ? 'SI' :
                                            value === false || value === 'no' ? 'NO' :
                                                typeof value === 'string' ? value : '-'}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="col-span-4 text-gray-400 italic">Sin checklist.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tech Footer */}
            <div className="mt-2 pt-2 border-t border-black text-[10px] flex justify-between items-end">
                <div>
                    <p>ID Interno: <span className="font-mono text-xs">{order.id}</span></p>
                    <p className="text-[9px] text-gray-500">Impreso: {format(new Date(), "dd/MM/yy HH:mm")}</p>
                </div>
                <div className="w-1/3 text-center">
                    <div className="border-t border-black my-4"></div>
                    Firma Técnico Responsable
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-100 text-black font-sans">
            {/* Controles de Pantalla */}
            <div className="print:hidden p-4 bg-white shadow-sm mb-4 flex justify-between items-center sticky top-0 z-50">
                <Button variant="outline" asChild>
                    <Link href={`/ordenes/${orderId}`}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver
                    </Link>
                </Button>

                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setIsEditingTerms(true)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar Términos
                    </Button>
                    <Button onClick={() => window.print()} disabled={!isReadyToPrint}>
                        <Printer className="h-4 w-4 mr-2" />
                        Imprimir A4
                    </Button>
                </div>
            </div>

            {/* Modal Editar Términos */}
            <Dialog open={isEditingTerms} onOpenChange={setIsEditingTerms}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Términos (Vista Previa)</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            value={termsContent}
                            onChange={(e) => setTermsContent(e.target.value)}
                            className="min-h-[150px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsEditingTerms(false)}>Listo</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* HOJA DE IMPRESIÓN (A4) */}
            <div id="printable-area" className="mx-auto bg-white shadow-lg print:shadow-none print:m-0 print:p-0 overflow-hidden"
                style={{ width: '210mm', height: '296mm' }}
            >
                <div className="flex flex-col h-full p-[10mm]">

                    {/* COPIA CLIENTE (Flex-1 para llenar mitad superior) */}
                    <div className="flex-1 min-h-0 pb-4">
                        <CustomerCopy />
                    </div>

                    {/* LÍNEA DE CORTE */}
                    <div className="border-b-2 border-dashed border-gray-400 w-full my-2 relative">
                        <span className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-[10px] text-gray-500 rotate-180 print:block hidden">
                            ✄ CORTAR AQUÍ
                        </span>
                        <span className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-[10px] text-gray-500 block print:hidden">
                            --- LÍNEA DE CORTE ---
                        </span>
                    </div>

                    {/* COPIA TALLER (Flex-1 para llenar mitad inferior) */}
                    <div className="flex-1 min-h-0 pt-4">
                        <TechnicianCopy />
                    </div>

                </div>
            </div>

            <style>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 0; 
                    }
                    html, body {
                        height: 297mm; 
                        overflow: hidden !important; 
                    }
                    body * {
                        visibility: hidden; 
                    }
                    #printable-area, #printable-area * {
                        visibility: visible;
                    }
                    #printable-area {
                        position: fixed;
                        left: 0;
                        top: 0;
                        width: 210mm !important;
                        height: 296mm !important; 
                        margin: 0 !important;
                        padding: 0 !important;
                        z-index: 9999;
                        overflow: hidden !important; 
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                    }
                }
            `}</style>
        </div>
    );
}