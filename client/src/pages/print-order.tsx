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
                // We don't auto-print immediately if we want to allow editing first, 
                // but user requested to keep existing behavior. 
                // We will keep auto-print but maybe they can cancel and edit.
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

    const ReceiptCopy = ({ title, showTerms }: { title: string, showTerms?: boolean }) => (
        <div className="border border-black p-6 text-sm mb-8 break-inside-avoid relative bg-white">
            {/* Header */}
            <div className="flex justify-between items-start mb-6 border-b border-black pb-4">
                <div>
                    <h1 className="text-2xl font-bold">RepairShop</h1>
                    <p className="text-xs mt-1">Servicio Técnico Especializado</p>
                    <p className="text-xs">Av. Principal 123, Ciudad</p>
                    <p className="text-xs">Tel: (555) 123-4567</p>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold">ORDEN #{order.id.slice(0, 8)}</h2>
                    <p className="font-bold border border-black px-2 py-1 inline-block mt-2">
                        {title}
                    </p>
                    <p className="mt-2">
                        Fecha: {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                    </p>
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-8 mb-6">
                {/* Client Info */}
                <div>
                    <h3 className="font-bold border-b border-black mb-2 uppercase text-xs">Información del Cliente</h3>
                    <div className="space-y-1">
                        <p><span className="font-semibold">Nombre:</span> {order.client.name}</p>
                        <p><span className="font-semibold">Teléfono:</span> {order.client.phone}</p>
                        {order.client.dni && <p><span className="font-semibold">DNI:</span> {order.client.dni}</p>}
                        {order.client.address && <p><span className="font-semibold">Dirección:</span> {order.client.address}</p>}
                        {order.client.email && <p><span className="font-semibold">Email:</span> {order.client.email}</p>}
                    </div>
                </div>

                {/* Device Info */}
                <div>
                    <h3 className="font-bold border-b border-black mb-2 uppercase text-xs">Información del Dispositivo</h3>
                    <div className="space-y-1">
                        <p><span className="font-semibold">Equipo:</span> {order.device.brand} {order.device.model}</p>
                        <p><span className="font-semibold">Color:</span> {order.device.color}</p>
                        {order.device.imei && <p><span className="font-semibold">IMEI:</span> {order.device.imei}</p>}
                        {order.device.serialNumber && <p><span className="font-semibold">Serie:</span> {order.device.serialNumber}</p>}
                        <p><span className="font-semibold">Condición:</span> {order.device.condition}</p>
                    </div>
                </div>
            </div>

            {/* Service Info */}
            <div className="mb-6">
                <h3 className="font-bold border-b border-black mb-2 uppercase text-xs">Detalles del Servicio</h3>
                <div className="grid grid-cols-1 gap-2">
                    <div>
                        <span className="font-semibold">Problema Reportado:</span>
                        <p className="ml-4">{order.problem}</p>
                    </div>
                    {order.notes && (
                        <div>
                            <span className="font-semibold">Notas:</span>
                            <p className="ml-4">{order.notes}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer / Cost */}
            <div className="flex justify-between items-end mt-8 pt-4 border-t border-black">
                <div className="text-xs max-w-[60%] space-y-4">
                    {showTerms && (
                        <div className="whitespace-pre-wrap">
                            <strong>Términos y Condiciones:</strong> {termsContent}
                        </div>
                    )}
                    <div className="pt-8 grid grid-cols-2 gap-8">
                        <div className="border-t border-black pt-2 text-center">Firma Cliente</div>
                        <div className="border-t border-black pt-2 text-center">Firma Técnico</div>
                    </div>
                </div>
                <div className="text-right min-w-[30%]">
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <span>Costo Estimado:</span>
                            <span className="font-bold">${order.estimatedCost.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white text-black p-4 md:p-8 font-mono print:p-0 print:m-0 print:bg-white print:overflow-visible">

            {/* Screen-only Controls */}
            <div className="print:hidden mb-6 flex justify-between items-center max-w-[21cm] mx-auto z-50 relative">
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
                        Imprimir Comprobante
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
                            Estos cambios se aplicarán solo a la copia del cliente y se guardarán en este navegador.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditingTerms(false)}>Cancelar</Button>
                        <Button onClick={handleSaveTerms}>Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Receipt Content - A4 Width centered */}
            {/* Using createPortal-like technique via fixed positioning for print to escape app layout */}
            <div className="print-area max-w-[21cm] mx-auto bg-white print:w-full print:max-w-none print:absolute print:top-0 print:left-0 print:m-0">
                <ReceiptCopy title="COPIA CLIENTE" showTerms={true} />
                <div className="border-b-2 border-dashed border-gray-300 my-8 print:my-4 print:border-gray-800" />
                <ReceiptCopy title="COPIA TÉCNICO" showTerms={false} />
            </div>

            <style>{`
        @media print {
          /* Hide everything by default */
          body > * {
            visibility: hidden;
          }
          /* Show only our print area */
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            margin: 1cm;
            size: auto;
          }
          /* Ensure backgrounds print */
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            background: white;
          }
        }
      `}</style>
        </div>
    );
}
