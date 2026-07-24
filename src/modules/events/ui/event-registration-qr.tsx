/**
 * Event Registration QR Code Component
 *
 * Unified component for displaying QR codes after event registration.
 * Used in both authenticated and public event registration routes.
 */

import { Card } from "@/components/ui/card";
import { QRCodeCanvas } from "@/components/ui/qr-code-canvas";

export interface EventRegistrationQRProps {
  qrToken: string;
  registrationId: string;
  attendeeName: string;
  eventName: string;
  size?: number;
}

export function EventRegistrationQR({
  qrToken,
  registrationId,
  attendeeName,
  eventName,
  size = 300,
}: EventRegistrationQRProps) {
  return (
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
  );
}
