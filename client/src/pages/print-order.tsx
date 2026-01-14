import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { RepairOrderWithDetails } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useState } from "react";
import { Printer, ArrowLeft, Edit } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const DEFAULT_TERMS = "La empresa no se hace responsable por pérdida de información. Equipos no retirados en 30 días pasarán a bodega. Garantía de 30 días sobre la reparación realizada.";

export default function PrintOrder() {
    const [, params] = useRoute("/ordenes/:id/print");
    const orderId = params?.id;
    const [isReadyToPrint, setIsReadyToPrint] = useState(false);

    // Terms & Conditions State
    const [termsContent, setTermsContent] = useState(DEFAULT_TERMS);
    const [isEditingTerms, setIsEditingTerms] = useState(false);

    useEffect(() => {
        // Load terms from localStorage on mount
        const savedTerms = localStorage.getItem("printTerms");
        if (savedTerms) {
            setTermsContent(savedTerms);
        }
    }, []);

    const handleSaveTerms = () => {
        localStorage.setItem("printTerms", termsContent);
        setIsEditingTerms(false);
    };

    const { data: order, isLoading } = useQuery<RepairOrderWithDetails>({
        queryKey: ["/api/orders", orderId],
        enabled: !!orderId,
    });

    useEffect(() => {
        if (order && !isLoading) {
            // Small delay to ensure rendering is complete (including icons/fonts)
            const timer = setTimeout(() => {
                setIsReadyToPrint(true);
                // Auto-print disabled to allow reviewing layout first, or re-enable if desired behavior
                window.print();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [order, isLoading]);

    if (isLoading) {
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

    // Common Header for both copies
    const Header = ({ title }: { title: string }) => (
        <div className="flex justify-between items-start border-b border-black pb-2 mb-2">
            <div>
                <h1 className="text-xl font-bold uppercase tracking-tight">RepairShop</h1>
                <p className="text-[10px]">Servicio Técnico Especializado</p>
                <p className="text-[10px]">Av. Principal 123, Ciudad | (555) 123-4567</p>
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

    // --- CUSTOMER COPY COMPONENT ---
    const CustomerCopy = () => (
        <div className="flex flex-col h-full relative">
            <Header title="COMPROBANTE CLIENTE" />

            <div className="flex-1 flex flex-col gap-2 min-h-0">
                {/* Main Grid: Client Basic & Fees / Device */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                        <h3 className="font-bold border-b border-black mb-1 uppercase text-[10px]">Cliente</h3>
                        <p>{order.client.name}</p>
                        <p>{order.client.phone} / {order.client.email}</p>
                    </div>
                    <div>
                        <h3 className="font-bold border-b border-black mb-1 uppercase text-[10px]">Dispositivo</h3>
                        <p><span className="font-semibold">Modelo:</span> {order.device.brand} {order.device.model}</p>
                        <p><span className="font-semibold">IMEI/SN:</span> {order.device.imei || order.device.serialNumber || 'N/A'}</p>
                    </div>
                </div>

                {/* Financials */}
                <div className="border border-black p-2 mt-2 flex justify-between items-center bg-gray-50 text-xs">
                    <div>
                        <span className="font-bold mr-2">Total Estimado:</span>
                        ${order.estimatedCost.toFixed(2)}
                    </div>
                    {/* Add deposit/due logic here if available in schema */}
                    <div>
                        <span className="font-bold mr-2">A Pagar:</span>
                        ${order.estimatedCost.toFixed(2)}
                    </div>
                </div>

                {/* Terms and Conditions - Fills remaining height */}
                <div className="flex-1 border border-black p-2 mt-2 flex flex-col min-h-0">
                    <h3 className="font-bold text-[10px] mb-1">TÉRMINOS Y CONDICIONES</h3>
                    {/* Use overflow-hidden to prevent page break if text is massive, 
                        though requirement says fill height. Flex-1 does that. */}
                    <div className="text-[10px] leading-tight text-justify overflow-y-hidden whitespace-pre-wrap flex-grow">
                        {termsContent}
                    </div>
                </div>
            </div>

            {/* Signature Area */}
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

    // --- TECHNICIAN COPY COMPONENT ---
    const TechnicianCopy = () => (
        <div className="flex flex-col h-full relative">
            <Header title="ORDEN DE TALLER" />

            <div className="flex-1 flex flex-col gap-2 min-h-0 text-xs text-black">
                {/* Detailed Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Full Client Info */}
                    <div>
                        <h3 className="font-bold border-b border-black mb-1 uppercase text-[10px]">Detalle Cliente</h3>
                        <p className="truncate"><span className="font-semibold">Nombre:</span> {order.client.name}</p>
                        <p className="truncate"><span className="font-semibold">Tel/WS:</span> {order.client.phone}</p>
                        {order.client.email && <p className="truncate"><span className="font-semibold">Email:</span> {order.client.email}</p>}
                        {order.client.address && <p className="truncate"><span className="font-semibold">Dir:</span> {order.client.address}</p>}
                    </div>

                    {/* Full Device Info */}
                    <div>
                        <h3 className="font-bold border-b border-black mb-1 uppercase text-[10px]">Detalle Equipo</h3>
                        <p><span className="font-semibold">Equipo:</span> {order.device.brand} {order.device.model}</p>
                        <p><span className="font-semibold">Color:</span> {order.device.color} | <span className="font-semibold">Cond:</span> {order.device.condition}</p>
                        <p><span className="font-semibold">IMEI:</span> {order.device.imei || '-'}</p>
                        <p><span className="font-semibold">SN:</span> {order.device.serialNumber || '-'}</p>
                    </div>
                </div>

                {/* Problem & Notes */}
                <div className="border border-black p-2 mt-1">
                    <p><span className="font-bold">Problema:</span> {order.problem}</p>
                    {order.notes && <p className="mt-1 border-t border-dashed border-gray-400 pt-1"><span className="font-bold">Notas Internas:</span> {order.notes}</p>}
                </div>

                {/* Intake Checklist */}
                <div className="flex-1 mt-1 border border-black p-2 min-h-0 overflow-y-auto">
                    <h3 className="font-bold border-b border-black mb-1 uppercase text-[10px]">Checklist de Ingreso</h3>
                    <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-[10px]">
                        {order.intakeChecklist && typeof order.intakeChecklist === 'object' ? (
                            Object.entries(order.intakeChecklist).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between border-b border-gray-100 pb-0.5">
                                    <span className="capitalize truncate mr-1">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                    <span className={`font-bold ${value === true || value === 'yes' ? 'text-black' :
                                        value === false || value === 'no' ? 'text-gray-400' : 'text-gray-600'
                                        }`}>
                                        {value === true || value === 'yes' ? 'SI' :
                                            value === false || value === 'no' ? 'NO' :
                                                typeof value === 'string' ? value : '-'}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="col-span-3 text-gray-500 italic">No hay checklist registrado.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tech Footer */}
            <div className="mt-2 pt-2 border-t border-black text-[10px] flex justify-between">
                <div>
                    <p>ID Interno: {order.id}</p>
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
            {/* Screen-only Controls */}
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

            {/* Edit Terms Dialog */}
            <Dialog open={isEditingTerms} onOpenChange={setIsEditingTerms}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Términos y Condiciones</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            value={termsContent}
                            onChange={(e) => setTermsContent(e.target.value)}
                            className="min-h-[150px]"
                            placeholder="Ingrese los términos y condiciones..."
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                            Afecta solo a la impresión actual en este navegador.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditingTerms(false)}>Cancelar</Button>
                        <Button onClick={handleSaveTerms}>Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* PRINT CONTAINER / SHEET */}
            <div id="printable-area" className="mx-auto bg-white shadow-lg print:shadow-none print:m-0 print:p-0 overflow-hidden"
                style={{ width: '210mm', height: '296mm' }} // Slightly less than 297 to be safe
            >
                {/* Using flex column to split the page exactly in half (or weighted) */}
                <div className="flex flex-col h-full p-[10mm]">

                    {/* CUSTOMER COPY SECTION - Flex grow to fill top half approx */}
                    <div className="flex-1 min-h-0 pb-4">
                        <CustomerCopy />
                    </div>

                    {/* SEPARATOR */}
                    <div className="border-b-2 border-dashed border-gray-400 w-full my-2 relative">
                        <span className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-[10px] text-gray-500 rotate-180 print:block hidden">
                            CORTAR AQUÍ
                        </span>
                        <span className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-[10px] text-gray-500 block print:hidden">
                            LÍNEA DE CORTE
                        </span>
                    </div>

                    {/* TECHNICIAN COPY SECTION - Flex grow to fill bottom half approx */}
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

                    /* ESTO ES LO QUE FALTABA: */
                    html, body {
                        height: 100vh; 
                        height: 297mm; 
                        overflow: hidden !important; /* Corta radicalmente el scroll */
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
