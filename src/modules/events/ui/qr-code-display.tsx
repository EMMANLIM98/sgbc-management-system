/**
 * QR Code Display Component
 *
 * Displays a QR code for event registration check-in as an image.
 * Allows printing and downloading the QR code as PNG.
 */

import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Printer } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export interface QRCodeDisplayProps {
  token: string;
  eventName: string;
  attendeeName: string;
  registrationId: string;
  size?: number;
}

export function QRCodeDisplay({
  token,
  eventName,
  attendeeName,
  registrationId,
  size = 300,
}: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    const generateQRCode = async () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        console.warn("Canvas not ready yet, retrying...");
        setTimeout(() => generateQRCode(), 100);
        return;
      }

      try {
        // Set canvas dimensions
        canvas.width = size;
        canvas.height = size;
        
        await QRCode.toCanvas(canvas, token, {
          errorCorrectionLevel: "H",
          margin: 2,
          width: size,
          color: {
            dark: "#111827",
            light: "#ffffff",
          },
        });
        console.log("QR code generated successfully");
      } catch (error) {
        console.error("Failed to generate QR code:", error);
      } finally {
        setIsGenerating(false);
      }
    };

    if (token) {
      setIsGenerating(true);
      generateQRCode();
    }
  }, [token, size]);

  const handleDownload = () => {
    if (!canvasRef.current) return;

    const link = document.createElement("a");
    link.href = canvasRef.current.toDataURL("image/png");
    link.download = `qr-${registrationId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!canvasRef.current) return;

    const printWindow = window.open("", "", "height=500,width=500");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${eventName}</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 20px; margin: 0; }
              h1 { color: #1F2937; margin: 20px 0 10px 0; font-size: 24px; }
              p { color: #6B7280; margin: 5px 0; }
              .qr-container { margin: 30px auto; }
              .qr-container img { max-width: 400px; height: auto; }
              .footer { margin-top: 20px; font-size: 12px; color: #9CA3AF; }
              @media print {
                body { margin: 0; padding: 10mm; }
              }
            </style>
          </head>
          <body>
            <h1>${eventName}</h1>
            <p><strong>${attendeeName}</strong></p>
            <p style="font-size: 12px; color: #9CA3AF;">${registrationId}</p>
            <div class="qr-container">
              <img src="${canvasRef.current.toDataURL("image/png")}" alt="QR Code" />
            </div>
            <p style="margin-top: 20px;">Scan this QR code to check in to the event</p>
            <div class="footer">
              <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Card className="border border-gray-200 bg-white shadow-sm p-6">
      <div className="flex flex-col items-center gap-4">
        <h3 className="text-lg font-semibold text-gray-900 text-center">Event Check-In QR Code</h3>

        <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg bg-white relative">
          {isGenerating && (
            <div className="w-80 h-80 flex items-center justify-center absolute inset-0 bg-white rounded">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          )}
          <canvas 
            ref={canvasRef}
            style={{ display: "block", maxWidth: "100%", height: "auto" }}
            className="mx-auto"
          />
        </div>

        <div className="text-center text-sm text-gray-600 w-full">
          <p className="font-medium text-gray-900">{attendeeName}</p>
          <p className="text-xs text-gray-500">{eventName}</p>
          <p className="text-xs mt-1 font-mono text-gray-500">{registrationId}</p>
        </div>

        <div className="flex gap-2 w-full">
          <Button
            onClick={handleDownload}
            disabled={isGenerating}
            variant="outline"
            size="sm"
            className="flex-1 border-gray-200 text-gray-900 hover:bg-gray-50"
            title="Download QR code as PNG image"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Image
          </Button>
          <Button
            onClick={handlePrint}
            disabled={isGenerating}
            variant="outline"
            size="sm"
            className="flex-1 border-gray-200 text-gray-900 hover:bg-gray-50"
            title="Print QR code"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>
    </Card>
  );
}
