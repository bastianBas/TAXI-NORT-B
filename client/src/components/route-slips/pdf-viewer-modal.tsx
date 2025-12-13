import { useState } from 'react';
import QRCode from "react-qr-code";
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { X, QrCode, FileText, ArrowLeft, Download, Loader2 } from 'lucide-react';
// Importamos la interfaz desde el diseño para mantener consistencia
import { RouteSlipPdf, type PdfData } from './pdf-design'; 
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Re-exportamos PdfData para que lo use la página principal
export type { PdfData };

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PdfData | null;
}

export default function PdfViewerModal({ isOpen, onClose, data }: PdfViewerModalProps) {
  const [showQR, setShowQR] = useState(false);

  if (!data) return null;

  // Datos para el QR (JSON Texto plano)
  const qrDataLocal = JSON.stringify({
    Empresa: "Taxi Nort",
    ID: data.id,
    Fecha: data.date,
    Conductor: data.driverName,
    Vehiculo: data.vehiclePlate,
    Estado: data.paymentStatus
  }, null, 2);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 bg-zinc-950 border-zinc-800 text-white">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2 text-white">
              <FileText className="w-5 h-5 text-blue-500" />
              Hoja de Ruta #{data.id}
            </h3>
            <p className="text-sm text-zinc-400">Generando documento localmente...</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
             <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 bg-zinc-900/50 p-4 overflow-hidden relative flex justify-center items-center">
          {showQR ? (
            <div className="text-center bg-white p-8 rounded-xl shadow-lg animate-in fade-in zoom-in duration-200">
              <h4 className="text-lg font-semibold mb-4 text-gray-900">Escanear Datos</h4>
              <div className="bg-white p-2 inline-block rounded border border-gray-200">
                <QRCode value={qrDataLocal} size={200} />
              </div>
              <p className="mt-4 text-sm text-gray-600 max-w-[200px] mx-auto">
                Este QR contiene los datos del viaje en formato texto.
              </p>
              <Button 
                variant="link" 
                onClick={() => setShowQR(false)} 
                className="mt-4 text-blue-600 hover:text-blue-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver al PDF
              </Button>
            </div>
          ) : (
            <div className="w-full h-full rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800">
               <PDFViewer width="100%" height="100%" showToolbar={true} className="w-full h-full">
                  <RouteSlipPdf data={data} />
               </PDFViewer>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex flex-col sm:flex-row justify-end gap-3">
          <Button 
            variant="secondary"
            onClick={() => setShowQR(!showQR)}
            className="gap-2"
          >
            <QrCode className="w-4 h-4" />
            {showQR ? "Ocultar QR" : "Mostrar QR Móvil"}
          </Button>

          <PDFDownloadLink 
            document={<RouteSlipPdf data={data} />} 
            fileName={`Hoja_Ruta_${data.date}_${data.id}.pdf`}
            className="no-underline"
          >
            {({ loading }) => (
               <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white" disabled={loading}>
                 {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4" />}
                 {loading ? 'Generando...' : 'Descargar PDF'}
               </Button>
            )}
          </PDFDownloadLink>
        </div>
      </DialogContent>
    </Dialog>
  );
}