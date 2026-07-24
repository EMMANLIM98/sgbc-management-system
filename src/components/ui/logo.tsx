/**
 * Logo Component
 *
 * Reusable, minimalist logo component for the application header.
 * Displays SGBC branding with professional styling.
 *
 * Features:
 * - Responsive sizing
 * - Supports light/dark modes
 * - Clean, minimalist design
 * - Mobile-friendly
 *
 * Usage:
 * <Logo variant="header" />
 * <Logo variant="compact" size="sm" />
 */

import { brandingService } from "@/lib/domain/branding.service";

interface LogoProps {
  /** Logo variant: header for full size, compact for sidebar */
  variant?: "header" | "compact";
  /** Size preset: sm, md, lg */
  size?: "sm" | "md" | "lg";
  /** Custom width in pixels */
  width?: number;
  /** Custom height in pixels */
  height?: number;
  /** Show organization name text */
  showText?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get size values based on size prop
 */
function getSizeValues(size: "sm" | "md" | "lg" | undefined): { width: number; height: number } {
  switch (size) {
    case "sm":
      return { width: 32, height: 32 };
    case "md":
      return { width: 48, height: 48 };
    case "lg":
      return { width: 64, height: 64 };
    default:
      return { width: 48, height: 48 };
  }
}

export function Logo({
  variant = "header",
  size,
  width,
  height,
  showText = false,
  className = "",
}: LogoProps) {
  const logoPath = brandingService.getLogoPath();
  const orgName = brandingService.getOrganizationName();
  const sizeValues = getSizeValues(size);

  const finalWidth = width || sizeValues.width;
  const finalHeight = height || sizeValues.height;

  if (variant === "header") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <img
          src={logoPath}
          alt={orgName}
          width={finalWidth}
          height={finalHeight}
          className="rounded-md shadow-sm object-cover"
        />
        {showText && (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-sm text-gray-900 leading-tight">{orgName}</span>
            <span className="text-xs text-gray-500">Management</span>
          </div>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <img
          src={logoPath}
          alt={orgName}
          width={finalWidth}
          height={finalHeight}
          className="rounded-md shadow-sm object-cover"
        />
      </div>
    );
  }

  return null;
}
