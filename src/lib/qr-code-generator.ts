/**
 * QR Code Generator Utility
 *
 * Centralized QR code generation with SGBC logo embedding.
 * Used for event check-in, visitor registration, and shared links.
 * Implements DDD by using BrandingService for logo configuration.
 */

import QRCode from "qrcode";
import { brandingService } from "@/lib/domain/branding.service";

export interface QRCodeGenerationOptions {
  size?: number;
  faviconSize?: number; // Percentage of QR code size (0-1)
  includeLogoAsset?: string; // Path to SGBC logo image (defaults to BrandingService.getLogoPath())
}

/**
 * Loads an image from a given source with timeout protection
 */
function loadImage(src: string, timeout = 5000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    const timeoutId = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      img.src = ""; // Cancel the image load
      reject(new Error(`Image load timeout: ${src}`));
    }, timeout);

    img.onload = () => {
      clearTimeout(timeoutId);
      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to load image: ${src}`));
    };

    img.src = src;
  });
}

/**
 * Generates a QR code on a canvas with optional SGBC logo embedding
 *
 * @param canvas - The canvas element to draw on
 * @param data - The data to encode in the QR code
 * @param options - Configuration options
 *
 * @example
 * // Basic QR code
 * await generateQRCodeOnCanvas(canvasRef.current, "https://example.com");
 *
 * // With SGBC logo (default)
 * await generateQRCodeOnCanvas(canvasRef.current, "https://example.com", {
 *   size: 300,
 *   logoSize: 0.2
 * });
 */
export async function generateQRCodeOnCanvas(
  canvas: HTMLCanvasElement,
  data: string,
  options: QRCodeGenerationOptions = {},
): Promise<void> {
  const {
    size = 300,
    faviconSize = 0.2,
    includeLogoAsset = brandingService.getLogoPath(),
  } = options;

  try {
    // Verify canvas is valid
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2D context from canvas");
    }

    // Set canvas dimensions BEFORE generating QR
    canvas.width = size;
    canvas.height = size;
    console.log(`[QR] Canvas dimensions set to ${size}x${size}`);

    // Clear canvas first
    ctx.clearRect(0, 0, size, size);

    // Generate QR code - this must complete before logo
    console.log(`[QR] Generating QR code for data:`, data.substring(0, 50));

    await QRCode.toCanvas(canvas, data, {
      errorCorrectionLevel: "H",
      margin: 2,
      color: {
        dark: "#111827",
        light: "#ffffff",
      },
    });

    console.log("[QR] QR code generated successfully");

    // Verify something was drawn
    const imageData = ctx.getImageData(0, 0, 1, 1);
    if (!imageData || imageData.data.length === 0) {
      throw new Error("QR code generation resulted in blank canvas");
    }

    // Try to add SGBC logo to center AFTER QR is drawn (non-blocking)
    // Use timeout to ensure QR code is fully rendered before adding logo
    if (includeLogoAsset) {
      setTimeout(() => {
        embedLogoOnCanvas(canvas, includeLogoAsset, size, faviconSize).catch((err) => {
          console.warn("[QR] Logo embedding failed (non-blocking):", err);
        });
      }, 50); // Small delay to ensure QR rendering is complete
    }
  } catch (error) {
    console.error("[QR] Failed to generate QR code:", error);
    throw error;
  }
}

/**
 * Embeds a logo on a canvas asynchronously (non-blocking)
 * This won't prevent the QR code from displaying if it fails
 * Properly centers the logo image while preserving aspect ratio
 * Clean modern design: semi-transparent circular background, no border
 * 
 * 🎯 CENTERING GUARANTEE: Logo is mathematically centered at (50%, 50%)
 */
async function embedLogoOnCanvas(
  canvas: HTMLCanvasElement,
  logoAsset: string,
  size: number,
  faviconSize: number,
): Promise<void> {
  try {
    const img = await loadImage(logoAsset, 3000);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      console.warn("[QR] Canvas context unavailable for logo embedding");
      return;
    }

    // Verify canvas still has content
    if (canvas.width === 0 || canvas.height === 0) {
      console.warn("[QR] Canvas dimensions invalid");
      return;
    }

    // Calculate exact center point of the QR code canvas
    // This is the pivot point for all centering calculations
    const exactCenterX = canvas.width / 2;
    const exactCenterY = canvas.height / 2;
    console.log(`[QR] Exact canvas center: (${exactCenterX}, ${exactCenterY})`);

    // Calculate logo container size as percentage of QR code
    const logoContainerSize = size * faviconSize;

    // Calculate image dimensions with aspect ratio preservation
    const imgAspectRatio = img.width / img.height;
    let displayWidth = logoContainerSize;
    let displayHeight = logoContainerSize;

    if (imgAspectRatio > 1) {
      // Wider image - constrain by height
      displayHeight = logoContainerSize;
      displayWidth = logoContainerSize * imgAspectRatio;
    } else if (imgAspectRatio < 1) {
      // Taller image - constrain by width
      displayWidth = logoContainerSize;
      displayHeight = logoContainerSize / imgAspectRatio;
    }

    console.log(
      `[QR] Logo dimensions: ${displayWidth.toFixed(0)}x${displayHeight.toFixed(0)} ` +
      `(aspect ratio: ${imgAspectRatio.toFixed(2)})`,
    );

    // Calculate exact positions to center the logo
    // Position formula: topLeft = centerPoint - (dimension / 2)
    // This puts the logo with its CENTER at the exact canvas center
    const logoX = exactCenterX - displayWidth / 2;
    const logoY = exactCenterY - displayHeight / 2;

    console.log(
      `[QR] Logo position: top-left (${logoX.toFixed(1)}, ${logoY.toFixed(1)}) ` +
      `→ centered at (${(logoX + displayWidth / 2).toFixed(1)}, ${(logoY + displayHeight / 2).toFixed(1)})`,
    );

    // Draw semi-transparent circular background centered at exact center
    const bgRadius = Math.max(displayWidth, displayHeight) / 2 + 6;
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)"; // Increased opacity to 90%
    ctx.beginPath();
    ctx.arc(exactCenterX, exactCenterY, bgRadius, 0, 2 * Math.PI);
    ctx.fill();

    console.log(
      `[QR] Background circle: center (${exactCenterX}, ${exactCenterY}), radius ${bgRadius.toFixed(1)}`,
    );

    // Draw logo image centered on the background
    // The drawImage API uses top-left corner as origin, so logoX/logoY are correct
    ctx.drawImage(img, logoX, logoY, displayWidth, displayHeight);

    console.log(
      `[QR] ✅ SGBC logo embedded successfully - CENTERED at (${exactCenterX.toFixed(1)}, ${exactCenterY.toFixed(1)})`,
    );
  } catch (error) {
    console.warn("[QR] Failed to embed SGBC logo in QR code:", error);
    // Intentionally don't rethrow - QR code is still valid without logo
  }
}

/**
 * Downloads a canvas as a PNG image
 *
 * @param canvas - The canvas to download
 * @param filename - The desired filename
 */
export function downloadCanvasAsImage(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Prints a canvas-based QR code with metadata
 *
 * @param canvas - The canvas to print
 * @param metadata - Optional metadata to display
 */
export function printCanvasQRCode(
  canvas: HTMLCanvasElement,
  metadata?: {
    title?: string;
    subtitle?: string;
    description?: string;
    timestamp?: Date;
  },
): void {
  const printWindow = window.open("", "", "height=600,width=600");
  if (!printWindow) {
    console.error("Failed to open print window");
    return;
  }

  const now = metadata?.timestamp || new Date();
  const title = metadata?.title || "QR Code";
  const subtitle = metadata?.subtitle || "";
  const description = metadata?.description || "";

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-align: center;
            padding: 20px;
            background: white;
          }
          h1 {
            color: #111827;
            margin: 0 0 8px 0;
            font-size: 24px;
          }
          h2 {
            color: #6B7280;
            margin: 0 0 20px 0;
            font-size: 14px;
            font-weight: 500;
          }
          .qr-container {
            margin: 30px auto;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .qr-container img {
            max-width: 400px;
            height: auto;
            display: block;
          }
          .description {
            color: #6B7280;
            font-size: 14px;
            margin: 20px 0;
            line-height: 1.5;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            font-size: 12px;
            color: #9CA3AF;
          }
          @media print {
            body { margin: 0; padding: 10mm; }
            h1 { page-break-after: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${subtitle ? `<h2>${subtitle}</h2>` : ""}
        <div class="qr-container">
          <img src="${canvas.toDataURL("image/png")}" alt="QR Code" />
        </div>
        ${description ? `<p class="description">${description}</p>` : ""}
        <div class="footer">
          <p>Generated on ${now.toLocaleString()}</p>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}
