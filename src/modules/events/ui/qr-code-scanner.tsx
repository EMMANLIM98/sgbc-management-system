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

type ScanState = "idle" | "requesting-permission" | "scanning" | "success" | "error" | "camera-not-found";

export function QRCodeScanner({ onScan, isLoading = false, eventId }: QRScannerProps) {
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [lastScanned, setLastScanned] = useState<string>("");
  const [torchActive, setTorchActive] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Request camera permissions explicitly
  const requestCameraPermission = async () => {
    try {
      setScanState("requesting-permission");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      // Stop the stream immediately, just checking permission
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
          setErrorMessage("Camera permission denied. Please allow camera access to scan QR codes.");
        } else if (error.name === "NotFoundError") {
          setErrorMessage("No camera found on this device.");
          setScanState("camera-not-found");
          return false;
        } else if (error.name === "NotReadableError") {
          setErrorMessage("Camera is already in use. Please close other apps using the camera.");
        } else {
          setErrorMessage(`Camera error: ${error.message}`);
        }
      } else {
        setErrorMessage("Unable to access camera. Please check your device permissions.");
      }
      setScanState("error");
      return false;
    }
  };

  useEffect(() => {
    if (scanState !== "scanning" || !containerRef.current) return;

    const initializeScanner = () => {
      try {
        const config: Html5QrcodeScannerConfig = {
          fps: 15,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0,
          rememberLastUsedCamera: true,
          supportedScanTypes: [],
          showTorchButtonIfSupported: true,
          disableFlip: false,
          formatsToSupport: [],
        };

        const scanner = new Html5QrcodeScanner(`qr-reader-${eventId}`, config, false);
        scannerRef.current = scanner;

        // Don't await - render() is synchronous with callbacks
        scanner.render(
          async (decodedText: string) => {
            if (decodedText === lastScanned) return; // Ignore duplicate scans

            setLastScanned(decodedText);
            setScanState("success");

            try {
              await onScan(decodedText);
              // Reset after success
              setTimeout(() => {
                setScanState("scanning");
                setErrorMessage("");
              }, 2000);
            } catch (error) {
              setScanState("error");
              setErrorMessage(error instanceof Error ? error.message : "Check-in failed");
              setTimeout(() => {
                setScanState("scanning");
                setErrorMessage("");
              }, 3000);
            }
          },
          (error: any) => {
            // Ignore scanning errors during scanning - they're normal
            if (error && typeof error === 'string' && error.includes('NotFoundError')) {
              console.debug('QR code not found in frame');
            }
          },
        );
      } catch (error) {
        console.error('Scanner initialization error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Failed to initialize camera scanner';
        setErrorMessage(errorMsg);
        setScanState("error");
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      initializeScanner();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          scannerRef.current.clear().catch(() => {});
        } catch (error) {
          console.debug('Error clearing scanner:', error);
        }
        scannerRef.current = null;
      }
    };
  }, [scanState, eventId, onScan, lastScanned]);

  const startScanning = async () => {
    const hasPermission = await requestCameraPermission();
    if (hasPermission) {
      setScanState("scanning");
      setErrorMessage("");
      setLastScanned("");
    }
  };

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
            <Button onClick={startScanning} size="lg" disabled={isLoading} className="w-full">
              {isLoading ? "Processing..." : "📱 Start Camera Scanner"}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              This requires camera access. Make sure to grant permission when prompted.
            </p>
          </div>
        </Card>
      )}

      {scanState === "requesting-permission" && (
        <Card className="p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin">📷</div>
            <h3 className="text-lg font-semibold">Requesting Camera Access</h3>
            <p className="text-sm text-gray-600">Please allow camera access in the popup...</p>
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
