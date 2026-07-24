# QR Code Design Template & Reference

## Overview

This document describes the SGBC QR code template and design standards. All generated QR codes should follow this pattern for consistency across the system.

## Template Reference

The reference QR code image (included in this folder) demonstrates the desired:

- **Logo Placement**: SGBC logo centered at 20% of QR code size
- **Error Correction**: High level (QR code remains scannable with ~30% data loss)
- **Color Scheme**: Black QR code on white background
- **Aspect Ratio**: Square (1:1)
- **Border/Quiet Zone**: White padding around QR code (4 modules minimum)

## QR Code Specifications

### Dimensions

- **Default Size**: 300×300 pixels
- **Minimum Size**: 100×100 pixels (for small displays)
- **Maximum Size**: 1000×1000 pixels (for posters)
- **Aspect Ratio**: Always square (1:1)

### Logo Embedding

- **Logo Size**: 15% of total QR code size (optimized for scanner readability)
- **Position**: ✅ **PERFECTLY CENTERED** - both horizontally and vertically at exact center (50%, 50%)
- **Centering Formula**:
  - X position: `(qrSize / 2) - (logoWidth / 2)`
  - Y position: `(qrSize / 2) - (logoHeight / 2)`
- **Background**: White square (opaque) with 6px padding for contrast and scanner compatibility
- **Aspect Ratio Handling**: Logo image preserves original aspect ratio while scaling to 20% container
- **Preservation**: Logo obscures maximum 20% of QR code data (within High error correction tolerance)
- **Current Logo**: SGBC branding logo from `src/lib/domain/branding.service.ts`

### Color Scheme

- **Foreground (QR Modules)**: #000000 (Black)
- **Background (Quiet Zone)**: #FFFFFF (White)
- **Logo Container**: #FFFFFF (White background for logo contrast)

### Error Correction Level

- **Level Used**: High (30% recovery capacity)
- **Reason**: Allows logo to obscure up to 20% without affecting scannability
- **Standard**: QR Code ISO/IEC 18004

## Implementation

### Current Component

Location: `src/components/ui/qr-code-canvas.tsx`

**Features**:

- ✅ Logo embedding with automatic scaling
- ✅ Download as PNG
- ✅ Print functionality
- ✅ Error handling with fallback states
- ✅ Responsive sizing

### QR Code Generator

Location: `src/lib/qr-code-generator.ts`

**Methods**:

- `generateQRCodeOnCanvas()` - Generates QR code with logo on canvas
- `downloadCanvasAsImage()` - Downloads as PNG
- `printCanvasQRCode()` - Prints QR code

### Usage Example

```typescript
import { QRCodeCanvas } from '@/components/ui/qr-code-canvas';

export function EventRegistrationQR() {
  return (
    <QRCodeCanvas
      value="https://sgbc.app/register/event/123"
      title="Event Registration"
      subtitle="John Doe"
      size={300}
      showDownload
      showPrint
      downloadFilename="sgbc-event-qr.png"
    />
  );
}
```

## Visual Specifications

### Layout - Perfect Centering

```
┌─────────────────────────────────────────────────┐
│              Quiet Zone (White)                 │
│  ┌───────────────────────────────────────┐     │
│  │                                       │     │
│  │         QR Code Pattern (Black)       │     │
│  │                                       │     │
│  │      ┌─────────────────────────┐     │     │
│  │      │   ⭕ SGBC Logo ⭕       │     │     │
│  │      │   (Centered at 50%,50%) │     │     │
│  │      │   20% of QR size        │     │     │
│  │      └─────────────────────────┘     │     │
│  │      (White circular background)     │     │
│  │                                       │     │
│  └───────────────────────────────────────┘     │
│              Quiet Zone (White)                 │
└─────────────────────────────────────────────────┘
```

**Key**: Logo is positioned at the exact mathematical center of the QR code using perfect centering calculations.

### Dimensions Breakdown (300×300 example)

- Total Size: 300×300 px
- Quiet Zone: ~12 px on each side (4 QR modules)
- QR Pattern Area: 276×276 px
- Logo Container: 60×60 px (20% of 300)
- Logo Actual: ~50×50 px (with padding)

## Use Cases

### 1. Event Registration

```
Size: 300×300 px
Title: "Event Registration"
Data: https://sgbc.app/register/event/[eventId]
```

### 2. Visitor Check-in

```
Size: 250×250 px
Title: "Visitor Check-in"
Data: https://sgbc.app/visitors/check-in/[visitorId]
```

### 3. Mobile Verification

```
Size: 200×200 px
Title: "Verify Attendance"
Data: https://sgbc.app/verify/[token]
```

### 4. Printed Materials (Posters)

```
Size: 600×600 px
Title: "Sunday Service Registration"
Data: https://sgbc.app/register/service/[serviceId]
```

## Testing Checklist

- [ ] QR code is square (1:1 aspect ratio)
- [ ] Logo is centered both horizontally and vertically
- [ ] Logo size is approximately 20% of QR code
- [ ] Logo has white background for contrast
- [ ] Quiet zone (white border) present on all sides
- [ ] QR code scans successfully with smartphone camera
- [ ] QR code scans successfully with dedicated QR scanner
- [ ] PNG download preserves quality
- [ ] Print output maintains scannability
- [ ] Responsive to different sizes (100px to 1000px)

## Scanning Test

To verify a generated QR code:

1. **Smartphone Camera**
   - Open native camera app
   - Point at QR code
   - Should open URL or show notification
   - Logo should not interfere with scanning

2. **QR Code Scanner Apps**
   - Barcode Scanner
   - QR Code Reader
   - Google Lens
   - Should all successfully decode

3. **Desktop/Web**
   - Use online QR decoder: https://www.qr-code-generator.com/qr-code-generator-online/
   - Upload generated PNG
   - Should decode correctly

## Customization Guidelines

### Logo Changes

To use a different logo:

1. Update `src/lib/domain/branding.service.ts`
2. Change `getLogoUrl()` method
3. Logo should be square (1:1 aspect ratio)
4. Keep file size minimal (~50KB)

### Size Variations

- **Small (100×100)**: Mobile in-app displays
- **Medium (300×300)**: Standard (default)
- **Large (600×600)**: Printed materials
- **Extra Large (1000×1000)**: Banners/signage

### Color Variations

Standard QR codes are black and white. Do NOT use:

- ❌ Colors other than black/white
- ❌ Gradients or patterns
- ❌ Transparency (except logo background)
- ❌ Rotating/skewing the QR code

## Performance Notes

- **Canvas Rendering**: ~50-100ms for typical size
- **Download**: Instant (client-side PNG generation)
- **Print**: Depends on browser/printer (typically <1s)
- **Memory**: ~2-5MB for largest sizes (1000×1000)

## Troubleshooting

### QR Code Won't Scan

1. ✅ Increase error correction level in generator
2. ✅ Reduce logo size from 20% to 15%
3. ✅ Ensure adequate quiet zone (white border)
4. ✅ Increase contrast (pure black on pure white)

### Logo Not Appearing

1. ✅ Check logo URL is accessible
2. ✅ Verify image format (PNG recommended)
3. ✅ Check CORS headers if loading externally
4. ✅ Ensure logo is square (1:1)

### Download/Print Issues

1. ✅ Try different browser
2. ✅ Check browser permissions
3. ✅ Verify printer is ready (for print)
4. ✅ Check browser console for errors

## References

- **QR Code Standard**: ISO/IEC 18004
- **Library Used**: qrcode.react (currently)
- **Alternative**: qrcode (node package)
- **Logo Embedding**: Custom canvas manipulation

## Future Enhancements

- [ ] SVG QR code generation (scalable)
- [ ] Animated QR codes (for dynamic content)
- [ ] Color customization UI
- [ ] Batch QR generation
- [ ] QR code history/management
- [ ] Real-time QR code preview
- [ ] Advanced logo positioning options

---

**Last Updated**: 2026-07-24  
**Version**: 1.0  
**Status**: Template Reference Complete
