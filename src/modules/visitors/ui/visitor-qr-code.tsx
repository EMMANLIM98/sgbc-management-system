import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VisitorQRCodeProps {
  churchId: string;
  churchName?: string;
}

export function VisitorQRCode({ churchId, churchName = "Church" }: VisitorQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const registrationUrl = `${window.location.origin}/visitor-register/${churchId}`;

  useEffect(() => {
    generateQRCode();
  }, [churchId]);

  const generateQRCode = async () => {
    if (!canvasRef.current) return;

    try {
      setIsGenerating(true);
      // Set canvas dimensions for proper rendering
      canvasRef.current.width = 300;
      canvasRef.current.height = 300;

      await QRCode.toCanvas(canvasRef.current, registrationUrl, {
        errorCorrectionLevel: "H",
        margin: 2,
        width: 300,
        color: {
          dark: "#111827",
          light: "#ffffff",
        },
      });
    } catch (error) {
      console.error("Failed to generate QR code:", error);
      toast.error("Failed to generate QR code");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQRCode = () => {
    if (!canvasRef.current) return;

    const link = document.createElement("a");
    link.href = canvasRef.current.toDataURL("image/png");
    link.download = `${churchName}-visitor-registration.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("QR code downloaded!");
  };

  return (
    <Card className="border border-gray-200 bg-white shadow-sm p-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Visitor Registration QR Code</h3>
        <p className="text-sm text-gray-600 mb-4">Scan this code to register as a visitor</p>

        <div className="flex justify-center mb-4">
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
            {isGenerating ? (
              <div className="w-80 h-80 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <canvas ref={canvasRef} className="w-80 h-80" />
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-center">
          <Button
            onClick={generateQRCode}
            disabled={isGenerating}
            variant="outline"
            className="border-gray-200 text-gray-900 hover:bg-gray-50"
          >
            Regenerate
          </Button>
          <Button
            onClick={downloadQRCode}
            disabled={isGenerating}
            className="bg-gray-900 text-white hover:bg-gray-800"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Link: <span className="font-mono text-gray-600">{registrationUrl}</span>
        </p>
      </div>
    </Card>
  );
}
