# SGBC QR Code System - Template Reference Implementation

## 📋 Overview

This guide explains how the SGBC QR code system uses the provided template image as the design standard. All QR codes generated in the system follow these specifications.

## 🎨 Template Image Specifications

The reference QR code image demonstrates:

### Visual Elements
- ✅ **SGBC Logo**: 🎯 **PERFECTLY CENTERED** at exact center (50% horizontal, 50% vertical) - 20% of QR code size
- ✅ **Logo Background**: Semi-transparent white circular background (87% opacity) for maximum contrast
- ✅ **QR Pattern**: Black modules on white background
- ✅ **Quiet Zone**: White border around entire QR code (minimum 4 modules)
- ✅ **Aspect Ratio**: Square (1:1)

### Technical Specifications
- **Error Correction Level**: High (30% data recovery)
- **Color Depth**: Monochrome (Black #000000 on White #FFFFFF)
- **Module Size**: Scalable (maintaining aspect ratio)
- **Format**: PNG with transparency support
- **Scannable**: ✅ Works with all smartphone cameras and QR scanners

## 🔧 How It's Implemented

### Component: QRCodeCanvas
**Location**: `src/components/ui/qr-code-canvas.tsx`

The component automatically generates QR codes matching the template:

```typescript
<QRCodeCanvas
  value="https://sgbc.app/register/event/123"
  title="Event Registration"
  subtitle="Attendee Name"
  size={300}              // Generates 300×300 px QR code
  showDownload            // Allow PNG download
  showPrint              // Allow printing
/>
```

**Output**: A QR code with:
- ✅ SGBC logo centered at 20%
- ✅ White background behind logo
- ✅ Black QR pattern
- ✅ White quiet zone border
- ✅ High error correction

### Service: BrandingService
**Location**: `src/lib/domain/branding.service.ts`

Provides the SGBC logo used in all QR codes:
```typescript
const logoPath = brandingService.getLogoPath();
// Returns: Path to SGBC branding logo
```

### Utility: QR Code Generator
**Location**: `src/lib/qr-code-generator.ts`

Handles low-level QR code generation with logo embedding:
```typescript
await generateQRCodeOnCanvas(canvas, data, {
  size: 300,
  faviconSize: 0.2  // 20% for logo
});
```

**Features**:
- Generates base QR code with high error correction
- Loads SGBC logo asynchronously
- Embeds logo in center with white background
- Handles loading errors gracefully

## 📐 Size Guidelines

Based on the template, here are recommended sizes:

### Display Contexts

| Use Case | Size | Context |
|----------|------|---------|
| Mobile In-App | 150×150 | Mobile app displays |
| Standard (Default) | 300×300 | Web, email, receipts |
| Large | 600×600 | Printed handouts |
| Extra Large | 1000×1000 | Posters, banners |

### Scale Preservation

All sizes maintain:
- ✅ Same logo size ratio (20%)
- ✅ Same quiet zone ratio (4 modules)
- ✅ Same visual appearance
- ✅ Same scannability

## 📱 Usage Examples

### Event Registration QR

```typescript
import { QRCodeCanvas } from '@/components/ui/qr-code-canvas';

export function EventRegistrationPage() {
  const eventId = "evt-123";
  const registrationLink = `https://sgbc.app/register/${eventId}`;

  return (
    <QRCodeCanvas
      value={registrationLink}
      title="Event Registration"
      subtitle="Sunday Service"
      size={400}
      showDownload
      downloadFilename="sgbc-event-registration.png"
    />
  );
}
```

**Generated QR Code**:
- Points to: Event registration page
- Logo: SGBC branding centered
- Scannable: Yes ✅
- Printable: Yes ✅
- Downloadable: Yes ✅

### Visitor Check-in QR

```typescript
export function VisitorCheckInQR() {
  const visitorId = "visitor-456";
  const checkInLink = `https://sgbc.app/visitors/${visitorId}`;

  return (
    <QRCodeCanvas
      value={checkInLink}
      title="Visitor Check-in"
      subtitle="Welcome to SGBC"
      size={250}
      showPrint
    />
  );
}
```

### Batch QR Generation

```typescript
export function BatchEventQRCodes() {
  const events = [
    { id: "evt-1", name: "Sunday Service" },
    { id: "evt-2", name: "Bible Study" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {events.map((event) => (
        <QRCodeCanvas
          key={event.id}
          value={`https://sgbc.app/register/${event.id}`}
          title={event.name}
          size={250}
          showDownload
          downloadFilename={`sgbc-${event.id}.png`}
        />
      ))}
    </div>
  );
}
```

## ✅ Verification Checklist

When generating QR codes, verify:

- [ ] **Logo Visibility**: SGBC logo clearly visible and centered
- [ ] **Logo Size**: Logo is approximately 20% of QR code size
- [ ] **White Background**: Logo has white background for contrast
- [ ] **Quiet Zone**: White border visible on all 4 sides
- [ ] **Aspect Ratio**: QR code is perfectly square
- [ ] **Color Scheme**: Black modules on white background
- [ ] **Scannable**: Successfully scans with smartphone camera
- [ ] **Download**: PNG download maintains quality
- [ ] **Print**: Printed output remains scannable

## 🧪 Testing

### Scan Testing

1. **Mobile Camera** (iOS/Android)
   ```
   Open native camera app
   Point at QR code
   Should open encoded URL
   Logo should not interfere
   ```

2. **QR Scanner App**
   ```
   Google Lens
   Barcode Scanner app
   QR Code Reader app
   All should successfully decode
   ```

3. **Desktop Decode**
   - Visit: https://www.qr-code-generator.com/qr-code-decoder/
   - Upload PNG
   - Verify decoded data matches encoded URL

### Quality Testing

```bash
# Check PNG file
file sgbc-qr-code.png
# Output: PNG image data

# Check file size (should be small)
ls -lh sgbc-qr-code.png
# Expected: < 50KB

# Verify image dimensions
identify sgbc-qr-code.png
# Expected: 300x300 (or requested size)
```

## 🎯 Design Consistency

All QR codes in SGBC system maintain:

```
┌─────────────────────────────────────┐
│        Consistent Styling           │
│                                     │
│   ✅ SGBC Logo Always Centered      │
│   ✅ 20% Logo Size (Fixed Ratio)    │
│   ✅ White Quiet Zone (Fixed)       │
│   ✅ Black on White (Fixed)         │
│   ✅ High Error Correction (Fixed)  │
│                                     │
│     Flexible Parameters:            │
│   • Size (150-1000 px)              │
│   • Title/Subtitle Text             │
│   • Download/Print Options          │
│   • Filename                        │
│                                     │
└─────────────────────────────────────┘
```

## 🔍 Component Architecture

```
┌──────────────────────────────────┐
│   QRCodeCanvas Component          │
│   (UI Layer - React)              │
└──────────────────────┬────────────┘
                       │
                       ↓
┌──────────────────────────────────┐
│   generateQRCodeOnCanvas          │
│   (Utility - Canvas + Logo)       │
└──────────────────────┬────────────┘
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  QR Code Lib │ │  Logo Loader │ │   Canvas API │
│  (qrcode.js) │ │   (loadImg)  │ │  (HTML5)     │
└──────────────┘ └──────────────┘ └──────────────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
                       ↓
┌──────────────────────────────────┐
│   BrandingService                 │
│   (Logo Configuration)            │
└──────────────────────────────────┘
```

## 📚 File References

### Core Files
- `src/components/ui/qr-code-canvas.tsx` - React component
- `src/lib/qr-code-generator.ts` - Generation utility
- `src/lib/domain/branding.service.ts` - Logo configuration
- `assets/qr-code-examples/QR_CODE_TEMPLATE.md` - Template specs
- `assets/qr-code-examples/SGBC_QR_Template_Usage.md` - This file

### Related Documentation
- Event Registration: `docs/ENDPOINT_REFACTORING_EXAMPLE.md`
- API Response Format: `src/lib/api/response.ts`

## 🚀 Quick Start

### Generate a QR Code

```typescript
import { QRCodeCanvas } from '@/components/ui/qr-code-canvas';

function MyQRCode() {
  return (
    <QRCodeCanvas
      value="https://example.com/my-page"
      title="My QR Code"
      size={300}
      showDownload
    />
  );
}
```

### Download as PNG

```typescript
// Component handles this automatically with showDownload prop
// User clicks "Download" button
// File saves as: sgbc-qr-code.png (or custom filename)
```

### Print QR Code

```typescript
// Component handles this automatically with showPrint prop
// User clicks "Print" button
// Browser print dialog opens
// User prints with system printer
```

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Logo not appearing | Check logo URL is accessible, CORS enabled |
| QR won't scan | Reduce logo size, ensure adequate white space |
| Low image quality | Use larger size (600+ px) before scaling |
| Download not working | Check browser permissions, try different browser |
| Print quality poor | Ensure printer settings are set to best quality |

## 📝 Notes

- The QR code template is a **design reference**, not a static image
- Each QR code is **dynamically generated** based on encoded data
- The **logo is always embedded** automatically
- All **sizes maintain the same proportions**
- The system is **fully responsive** across devices

---

**Template Version**: 1.0  
**Last Updated**: 2026-07-24  
**Status**: ✅ Complete and Production-Ready
