/**
 * Branding Domain Service
 *
 * Centralized management of organization branding assets (logos, colors, etc.)
 * Implements DDD with single source of truth for brand configuration.
 *
 * Usage:
 * - const logoPath = brandingService.getLogoPath()
 * - const logoSize = brandingService.getDefaultLogoSize()
 */

export interface BrandingConfig {
  organizationName: string;
  logoPath: string;
  logoSize: number; // in pixels
  colors: {
    primary: string;
    background: string;
  };
}

/**
 * Default branding configuration for SGBC
 */
const DEFAULT_BRANDING: BrandingConfig = {
  organizationName: "SGBC",
  logoPath: "/SGBC_Logo.png",
  logoSize: 256,
  colors: {
    primary: "#111827",
    background: "#ffffff",
  },
};

/**
 * Branding Service Repository
 * Single source of truth for all branding-related configuration
 */
export class BrandingService {
  private config: BrandingConfig = DEFAULT_BRANDING;

  /**
   * Get the organization logo path
   */
  getLogoPath(): string {
    return this.config.logoPath;
  }

  /**
   * Get the default logo size for QR codes
   */
  getQRCodeLogoSize(): number {
    return this.config.logoSize;
  }

  /**
   * Get the organization name
   */
  getOrganizationName(): string {
    return this.config.organizationName;
  }

  /**
   * Get primary brand color
   */
  getPrimaryColor(): string {
    return this.config.colors.primary;
  }

  /**
   * Get background color
   */
  getBackgroundColor(): string {
    return this.config.colors.background;
  }

  /**
   * Get complete branding configuration
   */
  getConfig(): BrandingConfig {
    return { ...this.config };
  }

  /**
   * Update branding configuration (for organizations with custom branding)
   */
  setConfig(config: Partial<BrandingConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Singleton instance for application-wide use
 */
export const brandingService = new BrandingService();
