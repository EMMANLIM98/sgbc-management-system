/**
 * Event Registration QR Code Component
 *
 * Unified component for displaying QR codes after event registration.
 * Used in both authenticated (/events/register?eventId=) and public (/event-register/{eventId}) routes.
 * Generates QR code with SGBC logo, allows download and printing.
 */

import { Card } from "@/components/ui/card";
import { QRCodeCanvas } from "@/components/ui/qr-code-canvas";

export interface EventRegistrationQRProps {
  qrToken: string;
  registrationId: string;
  attendeeName: string;
  eventName: string;
  size?: number;
  showWarning?: boolean;
}

export function EventRegistrationQR({
  qrToken,
  registrationId,
  attendeeName,
  eventName,
  size = 300,
  showWarning = true,
}: EventRegistrationQRProps) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <QRCodeCanvas
          value={qrToken}
          title={eventName}
          subtitle={attendeeName}
          size={size}
          showDownload
          showPrint
          downloadFilename={`event-registration-${registrationId}.png`}
        />

        <p className="text-xs text-gray-500 mt-4 font-mono break-all text-center">
          {registrationId}
        </p>
      </Card>

      {showWarning && (
        <p className="text-xs text-gray-500 text-center">
          Keep this QR code private - it is unique to your registration.
        </p>
      )}
    </div>
  );
}
