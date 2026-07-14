/**
 * QR Code Display Component
 *
 * Displays a QR code for event registration check-in.
 * Allows printing and downloading the QR code.
 */

import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Printer } from "lucide-react";
import { useRef } from "react";

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
  size = 256,
}: QRCodeDisplayProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const canvas = qrRef.current?.querySelector("canvas") as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `qr-${registrationId}.png`;
      link.click();
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "", "height=400,width=400");
    if (printWindow) {
      const canvas = qrRef.current?.querySelector("canvas") as HTMLCanvasElement;
      if (canvas) {
        printWindow.document.write(`
          <html>
            <head>
              <title>QR Code - ${eventName}</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
                h1 { color: #1F2937; margin: 20px 0; }
                p { color: #6B7280; margin: 10px 0; }
                .qr-container { margin: 30px 0; }
              </style>
            </head>
            <body>
              <h1>${eventName}</h1>
              <p><strong>${attendeeName}</strong></p>
              <div class="qr-container">
                <img src="${canvas.toDataURL("image/png")}" alt="QR Code" style="width: 300px;" />
              </div>
              <p>Scan this QR code to check in</p>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col items-center gap-4">
        <h3 className="text-lg font-semibold text-center">Event Check-In QR Code</h3>

        <div ref={qrRef} className="border-2 border-dashed border-gray-300 p-4 rounded-lg bg-white">
          <QRCodeSVG value={token} size={size} level="H" includeMargin margin={10} />
        </div>

        <div className="text-center text-sm text-gray-600">
          <p className="font-medium">{attendeeName}</p>
          <p className="text-xs">{eventName}</p>
          <p className="text-xs mt-1 font-mono text-gray-500">{registrationId}</p>
        </div>

        <div className="flex gap-2 w-full">
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
            className="flex-1"
            title="Download QR code as PNG"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            className="flex-1"
            title="Print QR code"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          ⚠️ Keep this QR code secure. Do not share with others.
        </p>
      </div>
    </Card>
  );
}
