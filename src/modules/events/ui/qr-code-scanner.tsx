/**
 * QR Code Scanner Component
 *
 * Captures video from camera and scans QR codes for event check-in.
 * Uses HTML5 QR code library for decoding with mobile device support.
 */

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeScannerConfig } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, X, CheckCircle, Zap } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface QRScannerProps {
  onScan: (token: string) => Promise<void>;
  isLoading?: boolean;
  eventId: string;
}

type ScanState = "idle" | "scanning" | "success" | "error" | "camera-not-found";

export function QRCodeScanner({ onScan, isLoading = false, eventId }: QRScannerProps) {
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [lastScanned, setLastScanned] = useState<string>("");
  const [torchActive, setTorchActive] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Camera permission and scanner management
  const handleStartScanning = () => {
    setScanState("scanning");
    setErrorMessage("");
    setLastScanned("");
  };

  useEffect(() => {
    if (scanState !== "scanning" || !containerRef.current) return;

    let isComponentMounted = true;
    const containerId = `qr-reader-${eventId}`;

    const initializeScanner = async () => {
      try {
        // Check if container exists
        const container = document.getElementById(containerId);
        if (!container) {
          console.error(`Container ${containerId} not found`);
          if (isComponentMounted) {
            setErrorMessage("Scanner container not found");
            setScanState("error");
          }
          return;
        }

        const config: Html5QrcodeScannerConfig = {
          fps: 15,
          qrbox: { width: 280, height: 280 },
          rememberLastUsedCamera: true,
          disableFlip: false,
        };

        const scanner = new Html5QrcodeScanner(containerId, config, false);
        
        if (!isComponentMounted) {
          scanner.clear().catch(() => {});
          return;
        }

        scannerRef.current = scanner;

        // This will request camera access and handle permissions
        await scanner.render(
          (decodedText: string) => {
            if (decodedText === lastScanned) return;

            setLastScanned(decodedText);
            if (isComponentMounted) {
              setScanState("success");
            }

            // Call the onScan callback (don't await in the scanner callback)
            onScan(decodedText)
              .then(() => {
                if (isComponentMounted) {
                  setTimeout(() => {
                    setScanState("scanning");
                    setErrorMessage("");
                  }, 2000);
                }
              })
              .catch((error) => {
                if (isComponentMounted) {
                  setScanState("error");
                  setErrorMessage(error instanceof Error ? error.message : "Check-in failed");
                  setTimeout(() => {
                    setScanState("scanning");
                    setErrorMessage("");
                  }, 3000);
                }
              });
          },
          (error: string) => {
            // Ignore scanning errors - this is normal during operation
          }
        );

        console.debug("Scanner initialized successfully");
      } catch (error) {
        if (!isComponentMounted) return;

        let errorMsg = "Failed to initialize camera scanner";
        
        if (error instanceof DOMException) {
          if (error.name === "NotAllowedError") {
            errorMsg = "Camera permission denied. Please allow camera access to scan QR codes.";
          } else if (error.name === "NotFoundError") {
            errorMsg = "No camera found on this device.";
            setScanState("camera-not-found");
          } else if (error.name === "NotReadableError") {
            errorMsg = "Camera is already in use. Please close other apps using the camera.";
          }
        } else if (error instanceof Error) {
          errorMsg = error.message;
        }

        console.error("Scanner error:", error);
        setErrorMessage(errorMsg);
        setScanState("error");
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      initializeScanner();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      isComponentMounted = false;
      if (scannerRef.current) {
        try {
          scannerRef.current.clear().catch(() => {});
        } catch (e) {
          console.debug("Error clearing scanner:", e);
        }
        scannerRef.current = null;
      }
    };
  }, [scanState, eventId, onScan, lastScanned]);

  const stopScanning = async () => {
    if (scannerRef.current) {
      await scannerRef.current.clear();
    }
    setScanState("idle");
  };

  const toggleTorch = async () => {
    if (scannerRef.current) {
      try {
        // Toggle torch if available
        await (scannerRef.current as any).toggleTorch();
        setTorchActive(!torchActive);
      } catch (error) {
        // Torch not supported on this device
        console.debug("Torch not supported on this device");
      }
    }
  };

  return (
    <div className="space-y-4">
      {scanState === "idle" && (
        <Card className="p-6">
          <div className="flex flex-col items-center gap-4">
            <h3 className="text-lg font-semibold">QR Code Scanner</h3>
            <p className="text-sm text-gray-600">
              Click below to access your device camera and scan check-in QR codes.
            </p>
            <Button onClick={handleStartScanning} size="lg" disabled={isLoading} className="w-full">
              {isLoading ? "Processing..." : "📱 Start Camera Scanner"}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              This requires camera access. Make sure to grant permission when prompted.
            </p>
          </div>
        </Card>
      )}

      {scanState === "scanning" && (
        <Card className="p-6">
          <div className="flex flex-col items-center gap-4">
            <h3 className="text-lg font-semibold">Scanning...</h3>
            <p className="text-xs text-gray-500">Point your camera at a QR code</p>
            <div
              id={`qr-reader-${eventId}`}
              className="w-full max-w-md border-2 border-blue-400 rounded-lg overflow-hidden"
              ref={containerRef}
              style={{ aspectRatio: "1/1" }}
            />
            <div className="flex gap-2">
              <Button onClick={toggleTorch} variant="outline" size="sm" className="flex-1">
                <Zap className="w-4 h-4 mr-2" />
                {torchActive ? "Flash Off" : "Flash On"}
              </Button>
              <Button onClick={stopScanning} variant="destructive" size="lg" className="flex-1">
                <X className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </div>
          </div>
        </Card>
      )}

      {scanState === "success" && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">✅ Check-in Successful</AlertTitle>
          <AlertDescription className="text-green-700">
            Attendee has been checked in. Resuming scan...
          </AlertDescription>
        </Alert>
      )}

      {scanState === "camera-not-found" && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Camera Not Found</AlertTitle>
          <AlertDescription className="text-red-700">
            No camera detected on this device. Please use a device with a camera, or enter QR codes
            manually.
          </AlertDescription>
        </Alert>
      )}

      {scanState === "error" && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">❌ Error</AlertTitle>
          <AlertDescription className="text-red-700">{errorMessage}</AlertDescription>
          <div className="mt-3">
            <Button onClick={() => setScanState("idle")} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </Alert>
      )}
    </div>
  );
}
