# SGBC QR Code System - Quick Reference

## 📌 Template Reference

The QR code image you provided is the **design template** for all SGBC QR codes.

### What the Template Shows

```
┌─────────────────────────┐
│   White Quiet Zone      │
│  ┌─────────────────┐   │
│  │    QR Pattern   │   │
│  │    (Black)      │   │
│  │  ┌───────────┐  │   │
│  │  │SGBC Logo  │  │   │
│  │  │ (Centered)│  │   │
│  │  └───────────┘  │   │
│  └─────────────────┘   │
└─────────────────────────┘
```

### Key Specifications

| Aspect | Specification |
|--------|---------------|
| **Logo Placement** | 🎯 **PERFECTLY CENTERED** (50% H, 50% V) |
| **Logo Size** | 20% of QR code total size |
| **Logo Background** | Semi-transparent white circle (87% opacity) |
| **QR Pattern** | Black modules on white |
| **Quiet Zone** | White border (4+ modules) |
| **Aspect Ratio** | Square (1:1) |
| **Error Correction** | High (30% recovery) |
| **Scannable** | ✅ Yes |

## 🚀 Using in Your Project

### 1. Generate QR Code with Template Design

```typescript
import { QRCodeCanvas } from '@/components/ui/qr-code-canvas';

<QRCodeCanvas
  value="https://sgbc.app/register/123"
  title="Event Registration"
  size={300}
  showDownload
/>
```

**Output**: QR code that matches template design:
- ✅ SGBC logo centered
- ✅ 20% logo size
- ✅ White quiet zone
- ✅ Black on white

### 2. Download Template-Matching QR Code

```typescript
// User clicks "Download" button
// Downloads PNG file following template design
// Can be printed or shared
```

### 3. Verify QR Code Matches Template

Checklist:
- [ ] Logo is visible and centered
- [ ] Logo background is white
- [ ] White border exists around code
- [ ] QR code is square
- [ ] Scans with phone camera

## 📐 Size Variations

All sizes maintain template design:

| Size | Use Case | Logo Size |
|------|----------|-----------|
| 150×150 | Mobile app | 30×30 |
| 300×300 | Standard | 60×60 |
| 600×600 | Printed | 120×120 |
| 1000×1000 | Posters | 200×200 |

## 📁 Files Created

```
assets/qr-code-examples/
├── QR_CODE_TEMPLATE.md          (Detailed specifications)
├── SGBC_QR_Template_Usage.md    (Implementation guide)
└── QR_CODE_QUICK_REFERENCE.md   (This file)
```

## 🔗 Related Files

- Component: `src/components/ui/qr-code-canvas.tsx`
- Generator: `src/lib/qr-code-generator.ts`
- Branding: `src/lib/domain/branding.service.ts`

## ✅ Current Status

- ✅ QRCodeCanvas component generates template-matching QR codes
- ✅ SGBC logo automatically embedded at 20%
- ✅ High error correction (30% recovery)
- ✅ Download and print support
- ✅ Fully responsive across sizes

## 🎯 Summary

The QR code template image shows how all SGBC QR codes should look:

1. **SGBC logo** centered in middle
2. **20% logo size** of total QR code
3. **White background** behind logo
4. **Black QR pattern** with white quiet zone
5. **Scannable** with any QR reader

Your current system **already implements** this template design!

---

**Version**: 1.0  
**Date**: 2026-07-24
