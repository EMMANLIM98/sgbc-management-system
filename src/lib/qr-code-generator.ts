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

    // Generate QR code - this must complete before favicon
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
    // This will happen asynchronously but won't prevent QR from displaying
    if (includeLogoAsset) {
      embedLogoOnCanvas(canvas, includeLogoAsset, size, faviconSize).catch((err) => {
        console.warn("[QR] Logo embedding failed (non-blocking):", err);
      });
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

    // Calculate logo dimensions - size it as a percentage of the QR code
    const logoDisplaySize = size * faviconSize;

    // Calculate image scaling to fit within container while preserving aspect ratio
    const imgAspectRatio = img.width / img.height;
    let displayWidth = logoDisplaySize;
    let displayHeight = logoDisplaySize;

    if (imgAspectRatio > 1) {
      // Image is wider than tall - scale by height
      displayHeight = logoDisplaySize;
      displayWidth = logoDisplaySize * imgAspectRatio;
    } else if (imgAspectRatio < 1) {
      // Image is taller than wide - scale by width
      displayWidth = logoDisplaySize;
      displayHeight = logoDisplaySize / imgAspectRatio;
    }
    // If aspect ratio is 1 (square), use calculated size as-is

    // Center image perfectly in the QR code
    // 🎯 CENTERED at exact center: 50% horizontal (centerX), 50% vertical (centerY)
    // Formula: position = centerPoint - (dimension / 2)
    // This ensures logo is mathematically centered regardless of QR or logo size
    const centerX = size / 2;
    const centerY = size / 2;
    const imgX = centerX - displayWidth / 2;
    const imgY = centerY - displayHeight / 2;

    // Draw subtle semi-transparent circular background for visibility
    // This makes the logo pop without a hard border/square
    const bgRadius = Math.max(displayWidth, displayHeight) / 2 + 6;
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath();
    ctx.arc(centerX, centerY, bgRadius, 0, 2 * Math.PI);
    ctx.fill();

    // Draw logo image centered on the background
    ctx.drawImage(img, imgX, imgY, displayWidth, displayHeight);
    console.log(
      "[QR] SGBC logo embedded successfully - centered at (" +
        centerX.toFixed(1) +
        ", " +
        centerY.toFixed(1) +
        ") with size " +
        displayWidth.toFixed(0) +
        "x" +
        displayHeight.toFixed(0),
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
