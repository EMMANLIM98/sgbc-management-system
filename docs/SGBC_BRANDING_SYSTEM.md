# SGBC Logo & Branding System

## Overview

Professional, minimalist branding system for SGBC that integrates the SGBC logo throughout the application. Follows DDD principles with a centralized branding service as the single source of truth.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│    Presentation Layer (React Components)            │
│  - Logo Component (header, compact variants)        │
│  - Header with integrated SGBC branding             │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│    Application Layer (QR Code Generation)           │
│  - generateQRCodeOnCanvas (uses BrandingService)    │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│       Domain Layer (Business Logic)                 │
│  - BrandingService: Single source of truth          │
│  - BrandingConfig: Logo path, colors, etc.          │
└─────────────────────────────────────────────────────┘
```

## Components

### BrandingService (Domain Layer)

**File**: `src/lib/domain/branding.service.ts`

Centralized management of all branding assets. Single source of truth for logo configuration.

**Key Methods**:

- `getLogoPath()` - Returns `/SGBC_Logo.jpg`
- `getQRCodeLogoSize()` - Returns logo size (256px)
- `getOrganizationName()` - Returns "SGBC"
- `getPrimaryColor()` - Returns brand primary color (#111827)
- `getBackgroundColor()` - Returns background color (#ffffff)
- `getConfig()` - Returns complete BrandingConfig

**Usage**:

```typescript
import { brandingService } from "@/lib/domain/branding.service";

const logoPath = brandingService.getLogoPath(); // "/SGBC_Logo.jpg"
const color = brandingService.getPrimaryColor(); // "#111827"
```

### Logo Component

**File**: `src/components/ui/logo.tsx`

Reusable, minimalist logo component for consistent branding throughout the app.

**Variants**:

- `header` - Full logo with optional text for main header
- `compact` - Logo only for sidebar/smaller spaces

**Sizes**:

- `sm` - 32x32px
- `md` - 48x48px (default)
- `lg` - 64x64px

**Features**:

- Professional shadow and rounding
- Responsive
- Mobile-friendly
- Clean, minimalist design
- White background with generous spacing

**Usage**:

```typescript
import { Logo } from "@/components/ui/logo";

// In header
<Logo variant="header" size="md" showText={false} />

// In sidebar
<Logo variant="compact" size="sm" />

// Custom size
<Logo width={100} height={100} variant="header" />
```

### Updated QR Code Generator

**File**: `src/lib/qr-code-generator.ts`

Now uses `BrandingService` for logo configuration instead of hardcoded favicon.

**Changes**:

- Imports and uses `brandingService` for logo path
- Defaults to `/SGBC_Logo.jpg` instead of `/favicon.ico`
- Embedded logo is professional and branded
- Log messages updated to reference "SGBC logo"

**Usage** (automatically uses SGBC logo):

```typescript
await generateQRCodeOnCanvas(canvas, data, {
  size: 300,
  faviconSize: 0.12,
  // includeLogoAsset defaults to BrandingService.getLogoPath()
});
```

### Enhanced Header (Topbar)

**File**: `src/components/shell/topbar.tsx`

**Improvements**:

- Displays SGBC logo prominently on the left
- Clean vertical divider separates logo from content
- Professional navigation hierarchy
- Mobile responsive (logo visible, organization hidden on mobile)
- Generous spacing and clear typography
- Maintains minimalist aesthetic

**Layout**:

```
┌─ Logo ─┐─────┬─ Organization ──┬─ Church Selector ──────┐  User Menu ─┐
│ [SGBC] │     │ SGBC - Antipolo │  > Select Church...    │─ User Name ─┤
└────────┴─────┴─────────────────┴────────────────────────┘─────────────┘
```

## Design Principles

### Color Scheme

- **Primary**: #111827 (Dark Navy) - Professional, trust-building
- **Background**: #ffffff (White) - Clean, modern
- **Accents**: Gray tones for hierarchy and separation

### Typography

- **Organization Name**: Uppercase, small caps - Emphasis
- **Labels**: Small, muted - Secondary information
- **User Info**: Medium weight - Readable

### Spacing

- Generous gaps between sections (gap-3, gap-6)
- Proper padding within components (px-4, px-6)
- Clear visual hierarchy through spacing

### Mobile Responsiveness

- Logo always visible (core branding)
- Organization/church selector hidden on mobile
- Stacked layout for small screens
- Touch-friendly button sizes

## Integration with QR Codes

All QR codes now embed the SGBC logo:

1. **Event Check-In QR Codes**: `/modules/events/ui/qr-code-display.tsx`
2. **Visitor Registration QR Codes**: `/modules/visitors/ui/visitor-qr-code.tsx`

**Automatic Logo Embedding**:

- QR codes automatically use SGBC_Logo.jpg from BrandingService
- Logo appears in center of QR code with white background
- Professional appearance for all QR-based registrations

## Adding Custom Branding

To support different organizations in the future:

```typescript
// In a church/organization settings page:
import { brandingService } from "@/lib/domain/branding.service";

function updateOrgBranding() {
  brandingService.setConfig({
    organizationName: "SGBC - Cainta",
    logoPath: "/org-logos/cainta.jpg",
    colors: {
      primary: "#1e40af", // Custom blue
      background: "#ffffff",
    },
  });
}
```

## File Structure

```
src/
├── lib/
│   └── domain/
│       └── branding.service.ts        # BrandingService
├── components/
│   ├── ui/
│   │   └── logo.tsx                   # Logo component
│   └── shell/
│       └── topbar.tsx                 # Updated header
└── modules/
    ├── events/ui/
    │   └── qr-code-display.tsx        # Uses BrandingService
    └── visitors/ui/
        └── visitor-qr-code.tsx        # Uses BrandingService

public/
└── SGBC_Logo.jpg                      # Brand asset
```

## DDD Architecture Benefits

✅ **Single Source of Truth** - Branding configured once, used everywhere
✅ **Type Safe** - TypeScript interfaces for branding config
✅ **Maintainable** - Easy to update branding globally
✅ **Scalable** - Support multiple organizations with custom branding
✅ **Testable** - BrandingService can be mocked/tested independently
✅ **Professional** - Consistent branding throughout app
✅ **Non-Technical Friendly** - Clear, simple UI with logo
✅ **Mobile Optimized** - Responsive design works on all devices

## Design Details

### Header Styling

- Height: 64px (h-16) - Comfortable spacing
- Border bottom: Subtle gray divider
- Logo size: 48x48px with rounded corners and shadow
- Generous padding: 16-24px horizontal

### Logo Appearance

- Rounded corners (4px)
- Subtle box shadow for depth
- Maintains aspect ratio
- Object-cover for consistent sizing

### QR Code Branding

- SGBC logo embedded in center
- 15% of QR code size (optimized for scanner compatibility)
- White background square behind logo
- Professional dark border around logo background

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Android)

## Performance

- Logo component uses native `<img>` tags (fast)
- BrandingService is singleton (no re-renders)
- QR code logo embedding is non-blocking
- Minimal CSS for styling

## Accessibility

- Proper `alt` text on logo image
- Semantic HTML structure in header
- Color contrast meets WCAG AA standards
- Touch targets are appropriately sized

## Future Enhancements

1. **Multi-Organization Support** - Different logos per SGBC location
2. **Dark Mode** - Color scheme variations
3. **Logo Upload** - Allow organizations to upload custom logos
4. **Branding Customization** - Settings page for colors, fonts
5. **Brand Assets Library** - Icon sets, patterns, templates
