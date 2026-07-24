/**
 * QR Code Scanner Component
 *
 * Captures video from camera and scans QR codes for event check-in.
 * Uses manual camera access with html5-qrcode for fallback.
 */

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, X, CheckCircle, Zap, ZoomIn, ZoomOut } from "lucide-react";
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
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );
  const [torchActive, setTorchActive] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(3);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScannedRef = useRef<{ code: string; time: number } | null>(null);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // Check if QR code was recently scanned (within 2 seconds) to prevent accidental double-scans
  const isRecentDuplicate = (code: string): boolean => {
    const lastScanned = lastScannedRef.current;
    if (!lastScanned) return false;
    const timeSinceLastScan = Date.now() - lastScanned.time;
    return lastScanned.code === code && timeSinceLastScan < 2000; // 2 second window
  };

  // Camera permission and scanner management
  const handleStartScanning = () => {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setErrorMessage(
        "Camera requires HTTPS on mobile browsers. Open this app with https:// or localhost.",
      );
      setScanState("error");
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("Camera API is not available in this browser.");
      setScanState("error");
      return;
    }

    setScanState("scanning");
    setErrorMessage("");
    setFeedback(null);
    lastScannedRef.current = "";
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

        // Try manual camera access first
        console.log("Attempting manual camera access via getUserMedia()...");
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });

          console.log("✓ Camera stream obtained successfully");
          streamRef.current = stream;

          if (!isComponentMounted) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          // Check camera capabilities for max zoom
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack && "getCapabilities" in videoTrack) {
            const capabilities = (videoTrack as any).getCapabilities();
            if (capabilities.zoom) {
              setMaxZoom(Math.min(capabilities.zoom.max || 3, 5));
              console.log(`Max zoom capability: ${capabilities.zoom.max || 3}x`);
            }
          }

          // Create video element
          let videoElement = container.querySelector("video") as HTMLVideoElement;
          if (!videoElement) {
            videoElement = document.createElement("video");
            videoElement.setAttribute("playsinline", "true");
            videoElement.setAttribute("autoplay", "true");
            videoElement.setAttribute("muted", "true");
            videoElement.style.width = "100%";
            videoElement.style.height = "100%";
            videoElement.style.objectFit = "cover";
            videoElement.style.transition = "transform 0.2s ease-out";
            container.innerHTML = "";
            container.appendChild(videoElement);
            console.log("Created video element");
          }

          videoRef.current = videoElement;
          videoElement.srcObject = stream;

          // Wait for video to be ready
          await new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
              console.log("Video metadata loaded, starting playback");
              videoElement.play();
              resolve(null);
            };
          });

          console.log("✓ Video stream is playing");

          // Initialize Html5Qrcode for decoding
          const qrcodeInstance = new Html5Qrcode(containerId);
          scannerRef.current = qrcodeInstance as any;

          // Start continuous scanning with larger detection area
          await qrcodeInstance.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 350 },
            (decodedText: string) => {
              console.log("QR code detected:", decodedText);
              // Prevent accidental duplicate scans within 2 seconds
              if (isRecentDuplicate(decodedText)) {
                console.log("Duplicate scan prevented (same code within 2 seconds)");
                return;
              }
              lastScannedRef.current = { code: decodedText, time: Date.now() };

              onScanRef
                .current(decodedText)
                .then(() => {
                  if (isComponentMounted) {
                    setFeedback({ type: "success", message: "Attendee checked in successfully." });
                    setTimeout(() => setFeedback(null), 2000);
                  }
                })
                .catch((error) => {
                  if (isComponentMounted) {
                    setFeedback({
                      type: "error",
                      message: error instanceof Error ? error.message : "Check-in failed",
                    });
                    setTimeout(() => setFeedback(null), 3000);
                  }
                });
            },
            (errorMessage: string) => {
              // Ignore scanning errors
              if (errorMessage && errorMessage.length > 50) {
                console.debug(`Scanning: ${errorMessage.substring(0, 100)}`);
              }
            },
          );

          console.log("✓ Scanner initialized successfully");
          return;
        } catch (manualError) {
          console.warn(
            "Manual camera access failed, falling back to Html5QrcodeScanner:",
            manualError,
          );
        }

        // Fallback to Html5QrcodeScanner
        console.log("Using Html5QrcodeScanner fallback...");
        const config = {
          fps: 10,
          qrbox: { width: 350, height: 350 },
          rememberLastUsedCamera: true,
          disableFlip: false,
          showTorchButtonIfSupported: true,
          aspectRatio: 1.0,
        };

        const scanner = new Html5QrcodeScanner(containerId, config, true);

        if (!isComponentMounted) {
          await scanner.clear();
          return;
        }

        scannerRef.current = scanner;

        try {
          await scanner.render(
            (decodedText: string) => {
              console.debug("QR code scanned:", decodedText);
              // Prevent accidental duplicate scans within 2 seconds
              if (isRecentDuplicate(decodedText)) {
                console.log("Duplicate scan prevented (same code within 2 seconds)");
                return;
              }
              lastScannedRef.current = { code: decodedText, time: Date.now() };

              onScanRef
                .current(decodedText)
                .then(() => {
                  if (isComponentMounted) {
                    setFeedback({ type: "success", message: "Attendee checked in successfully." });
                    setTimeout(() => {
                      setFeedback(null);
                    }, 2000);
                  }
                })
                .catch((error) => {
                  if (isComponentMounted) {
                    setFeedback({
                      type: "error",
                      message: error instanceof Error ? error.message : "Check-in failed",
                    });
                    setTimeout(() => {
                      setFeedback(null);
                    }, 3000);
                  }
                });
            },
            (error: string) => {
              if (error && typeof error === "string") {
                console.debug(`Scanning error: ${error.substring(0, 200)}`);
              }
            },
          );

          console.log("✓ Html5QrcodeScanner fallback initialized");
        } catch (error) {
          if (!isComponentMounted) return;

          let errorMsg = "Failed to initialize camera scanner";

          if (error instanceof DOMException) {
            if (error.name === "NotAllowedError") {
              errorMsg =
                "Camera permission denied. Please allow camera access in your browser settings.";
            } else if (error.name === "NotFoundError") {
              errorMsg = "No camera found on this device.";
              setScanState("camera-not-found");
            } else if (error.name === "NotReadableError") {
              errorMsg = "Camera is already in use by another app.";
            }
          } else if (error instanceof Error) {
            errorMsg = error.message;
          }

          console.error("Scanner error:", error);
          setErrorMessage(errorMsg);
          setScanState("error");
        }
      } catch (error) {
        if (!isComponentMounted) return;
        console.error("Scanner initialization error:", error);
        setErrorMessage("Failed to initialize camera scanner");
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
          (scannerRef.current as any).clear?.().catch(() => {});
        } catch (e) {
          console.debug("Error clearing scanner:", e);
        }
        scannerRef.current = null;
      }
      // Stop media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      videoRef.current = null;
    };
  }, [scanState, eventId]);

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

  const adjustZoom = async (direction: "in" | "out") => {
    const increment = 0.5;
    const newZoom = direction === "in" ? zoom + increment : Math.max(1, zoom - increment);

    if (newZoom > maxZoom) {
      console.log(`Max zoom (${maxZoom}x) reached`);
      return;
    }

    setZoom(newZoom);

    // Apply zoom to camera if stream is available
    if (streamRef.current) {
      try {
        const videoTrack = streamRef.current.getVideoTracks()[0];
        if (videoTrack && "getCapabilities" in videoTrack && "applyConstraints" in videoTrack) {
          const capabilities = (videoTrack as any).getCapabilities();
          if (capabilities.zoom) {
            await (videoTrack as any).applyConstraints({
              advanced: [{ zoom: Math.min(newZoom, capabilities.zoom.max) }],
            });
            console.log(`Zoom set to ${newZoom}x`);
          }
        }
      } catch (error) {
        console.debug("Zoom adjustment not supported on this device:", error);
      }
    }

    // Also scale the video element for visual feedback
    if (videoRef.current) {
      videoRef.current.style.transform = `scale(${newZoom})`;
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
            <div className="w-full max-w-md flex gap-2">
              <Button
                onClick={() => adjustZoom("out")}
                variant="outline"
                size="sm"
                disabled={zoom <= 1}
                className="flex-1"
              >
                <ZoomOut className="w-4 h-4 mr-2" />
                Zoom Out
              </Button>
              <div className="flex items-center justify-center px-3 py-2 bg-gray-100 rounded border border-gray-300 flex-1 text-sm font-medium">
                {zoom.toFixed(1)}x
              </div>
              <Button
                onClick={() => adjustZoom("in")}
                variant="outline"
                size="sm"
                disabled={zoom >= maxZoom}
                className="flex-1"
              >
                <ZoomIn className="w-4 h-4 mr-2" />
                Zoom In
              </Button>
            </div>
            <div className="flex gap-2 w-full max-w-md">
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

      {feedback?.type === "success" && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Check-in Successful</AlertTitle>
          <AlertDescription className="text-green-700">{feedback.message}</AlertDescription>
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
          <AlertTitle className="text-red-800">Scanner Error</AlertTitle>
          <AlertDescription className="text-red-700">{errorMessage}</AlertDescription>
          <div className="mt-3">
            <Button onClick={() => setScanState("idle")} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </Alert>
      )}

      {feedback?.type === "error" && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Check-in Failed</AlertTitle>
          <AlertDescription className="text-red-700">{feedback.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
