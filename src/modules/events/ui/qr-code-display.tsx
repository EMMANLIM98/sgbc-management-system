/**
 * QR Code Display Component
 *
 * Displays a QR code for event registration check-in as an image.
 * Allows printing and downloading the QR code as PNG.
 * Uses centralized QR code generator with favicon embedding.
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Printer } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  generateQRCodeOnCanvas,
  downloadCanvasAsImage,
  printCanvasQRCode,
} from "@/lib/qr-code-generator";

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
        setIsGenerating(true);
        await generateQRCodeOnCanvas(canvas, token, {
          size: 300,
          faviconSize: 0.2,
          includeLogoAsset: "/favicon.ico",
        });
        console.log("QR code generated successfully with favicon");
      } catch (error) {
        console.error("Failed to generate QR code:", error);
      } finally {
        setIsGenerating(false);
      }
    };

    if (token) {
      generateQRCode();
    }
  }, [token]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    downloadCanvasAsImage(canvasRef.current, `qr-${registrationId}.png`);
  };

  const handlePrint = () => {
    if (!canvasRef.current) return;
    printCanvasQRCode(canvasRef.current, {
      title: eventName,
      subtitle: attendeeName,
      description: `Registration ID: ${registrationId}`,
      timestamp: new Date(),
    });
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
            width={300}
            height={300}
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
