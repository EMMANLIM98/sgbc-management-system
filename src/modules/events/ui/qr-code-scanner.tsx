/**
 * QR Code Scanner Component
 *
 * Captures video from camera and scans QR codes for event check-in.
 * Uses HTML5 QR code library for decoding.
 */

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeScannerConfig } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, X, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface QRScannerProps {
  onScan: (token: string) => Promise<void>;
  isLoading?: boolean;
  eventId: string;
}

type ScanState = "idle" | "scanning" | "success" | "error";

export function QRCodeScanner({ onScan, isLoading = false, eventId }: QRScannerProps) {
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [lastScanned, setLastScanned] = useState<string>("");
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scanState !== "scanning" || !containerRef.current) return;

    const config: Html5QrcodeScannerConfig = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      rememberLastUsedCamera: true,
      supportedScanTypes: [],
    };

    const scanner = new Html5QrcodeScanner(`qr-reader-${eventId}`, config, false);

    scannerRef.current = scanner;

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
        // Ignore scanning errors, they're normal
      },
    );

    return () => {
      scanner.clear().catch(() => {});
      scannerRef.current = null;
    };
  }, [scanState, eventId, onScan, lastScanned]);

  const startScanning = () => {
    setScanState("scanning");
    setErrorMessage("");
    setLastScanned("");
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      await scannerRef.current.clear();
    }
    setScanState("idle");
  };

  return (
    <div className="space-y-4">
      {scanState === "idle" && (
        <Card className="p-6">
          <div className="flex flex-col items-center gap-4">
            <h3 className="text-lg font-semibold">QR Code Scanner</h3>
            <p className="text-sm text-gray-600">
              Click below to start scanning check-in QR codes with your device camera.
            </p>
            <Button onClick={startScanning} size="lg" disabled={isLoading}>
              {isLoading ? "Processing..." : "Start Scanner"}
            </Button>
          </div>
        </Card>
      )}

      {scanState === "scanning" && (
        <Card className="p-6">
          <div className="flex flex-col items-center gap-4">
            <h3 className="text-lg font-semibold">Scanning...</h3>
            <div id={`qr-reader-${eventId}`} className="w-full max-w-sm" ref={containerRef} />
            <Button onClick={stopScanning} variant="destructive" size="lg">
              <X className="w-4 h-4 mr-2" />
              Stop Scanning
            </Button>
          </div>
        </Card>
      )}

      {scanState === "success" && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Check-in Successful</AlertTitle>
          <AlertDescription className="text-green-700">
            Attendee has been checked in. Resuming scan...
          </AlertDescription>
        </Alert>
      )}

      {scanState === "error" && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Check-in Failed</AlertTitle>
          <AlertDescription className="text-red-700">{errorMessage}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
