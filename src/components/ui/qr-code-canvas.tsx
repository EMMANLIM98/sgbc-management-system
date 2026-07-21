/**
 * Reusable QR Code Canvas Component with Logo Support
 *
 * Domain Layer: Uses generateQRCodeOnCanvas for logo embedding
 * Application Layer: Canvas management, state handling, user interactions
 * Presentation Layer: UI rendering, download/print buttons
 *
 * Usage:
 * <QRCodeCanvas
 *   value="https://example.com/register"
 *   title="Event Registration"
 *   subtitle="John Doe"
 *   size={300}
 *   showDownload
 *   showPrint
 * />
 */

import { useEffect, useRef, useState } from "react";
import { Download, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  generateQRCodeOnCanvas,
  downloadCanvasAsImage,
  printCanvasQRCode,
} from "@/lib/qr-code-generator";

interface QRCodeCanvasProps {
  /** The data to encode in the QR code */
  value: string;
  /** Optional title displayed above the QR code */
  title?: string;
  /** Optional subtitle displayed above the QR code */
  subtitle?: string;
  /** QR code size in pixels (default: 300) */
  size?: number;
  /** Show download button (default: false) */
  showDownload?: boolean;
  /** Show print button (default: false) */
  showPrint?: boolean;
  /** Filename for downloaded QR code */
  downloadFilename?: string;
  /** Custom CSS class for the container */
  className?: string;
  /** Callback when QR code generation completes */
  onComplete?: () => void;
}

export function QRCodeCanvas({
  value,
  title,
  subtitle,
  size = 300,
  showDownload = false,
  showPrint = false,
  downloadFilename = "qr-code.png",
  className = "",
  onComplete,
}: QRCodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Generate QR code on mount or when value changes
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      generateQRCode();
    }, 100);

    return () => clearTimeout(timer);
  }, [value, size]);

  const generateQRCode = async () => {
    if (!canvasRef.current) {
      console.error("[QR Canvas] Canvas ref not available - canvas may not be mounted yet");
      setHasError(true);
      setIsGenerating(false);
      return;
    }

    try {
      setIsGenerating(true);
      setHasError(false);
      console.log("[QR Canvas] Starting QR code generation for:", value);

      // Ensure canvas is clear and ready
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get canvas 2D context");
      }

      // Use domain layer function for logo-embedded QR code
      await generateQRCodeOnCanvas(canvasRef.current, value, {
        size,
        faviconSize: 0.2, // 20% of QR code size for logo
      });

      console.log("[QR Canvas] QR code generated successfully");
      onComplete?.();
    } catch (error) {
      console.error("[QR Canvas] Failed to generate QR code:", error);
      setHasError(true);
      // Don't show toast for logo loading failures (they're non-critical)
      if (!String(error).includes("logo") && !String(error).includes("image")) {
        toast.error("Failed to generate QR code");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) {
      toast.error("Canvas not available");
      return;
    }
    downloadCanvasAsImage(canvasRef.current, downloadFilename);
    toast.success("QR code downloaded!");
  };

  const handlePrint = () => {
    if (!canvasRef.current) {
      toast.error("Canvas not available");
      return;
    }
    printCanvasQRCode(canvasRef.current, {
      title,
      subtitle,
    });
  };

  return (
    <div className={className}>
      {/* Title and subtitle */}
      {(title || subtitle) && (
        <div className="text-center mb-4">
          {title && <p className="text-sm font-medium text-gray-700">{title}</p>}
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      )}

      {/* QR Code Canvas Container */}
      <div className="flex justify-center p-4 bg-white border border-gray-200 rounded-lg mb-4">
        {isGenerating && !hasError ? (
          <div className="flex items-center justify-center" style={{ width: size, height: size }}>
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : hasError ? (
          <div className="flex items-center justify-center" style={{ width: size, height: size }}>
            <div className="text-center">
              <p className="text-sm text-red-600">Failed to generate QR code</p>
              <Button
                onClick={() => generateQRCode()}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={size}
            height={size}
            style={{ display: "block", maxWidth: "100%", height: "auto" }}
          />
        )}
      </div>

      {/* Action Buttons */}
      {(showDownload || showPrint) && !hasError && !isGenerating && (
        <div className="flex gap-2">
          {showDownload && (
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={isGenerating}
            >
              <Download className="w-4 h-4 mr-2" />
              Save QR
            </Button>
          )}
          {showPrint && (
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={isGenerating}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
