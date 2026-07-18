/**
 * Event Detail Page
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QRCodeScanner } from "@/modules/events/ui/qr-code-scanner";
import { EventAnalyticsDashboard } from "@/modules/events/ui/event-analytics-dashboard";
import { EventCheckinReport } from "@/modules/events/ui/event-checkin-report";
import { Loader2, Calendar, MapPin, UserPlus, Link2 } from "lucide-react";
import { getEvent, checkInWithQR } from "@/modules/events/events.functions";
import { useCurrentChurch } from "@/hooks/use-current-church";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/events/$id")({
  head: () => ({ meta: [{ title: "Event Details — Shekinah Glory Baptist Church" }] }),
  component: EventDetail,
});

function EventDetail() {
  const { id } = Route.useParams();
  const { currentChurchId } = useCurrentChurch();
  const getEventFn = useServerFn(getEvent);
  const checkInFn = useServerFn(checkInWithQR);

  const {
    data: eventData,
    isLoading: eventLoading,
    error: eventError,
  } = useQuery({
    queryKey: ["event", id],
    queryFn: () => getEventFn({ data: { id } }),
  });

  const event = eventData;

  if (eventLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600">Loading event details...</p>
        </Card>
      </div>
    );
  }

  if (eventError) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card className="p-6 bg-red-50 border-red-200">
          <p className="text-red-800 font-medium mb-1">Unable to load event</p>
          <p className="text-sm text-red-700">
            {eventError instanceof Error ? eventError.message : "Please try again."}
          </p>
        </Card>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card className="p-6 bg-red-50 border-red-200">
          <p className="text-red-800">Event not found</p>
        </Card>
      </div>
    );
  }

  const eventDate = new Date(event.eventDate);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-4">
        <PageHeader title={event.title} description={event.description} />
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const url = `${window.location.origin}/event-register/${id}`;
              navigator.clipboard
                .writeText(url)
                .then(() => toast.success("Public registration link copied!"));
            }}
          >
            <Link2 className="w-4 h-4 mr-2" />
            Share Link
          </Button>
          <Link to="/events/register" search={{ eventId: id }}>
            <Button className="whitespace-nowrap">
              <UserPlus className="w-4 h-4 mr-2" />
              Register Attendee
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-4 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-xs text-gray-600">Event Date</p>
            <p className="font-medium">{eventDate.toLocaleDateString()}</p>
          </div>
        </Card>

        {event.location && (
          <Card className="p-4 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-xs text-gray-600">Location</p>
              <p className="font-medium">{event.location}</p>
            </div>
          </Card>
        )}
      </div>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="checkin">Check-In</TabsTrigger>
          <TabsTrigger value="attendees">Attendees</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <EventAnalyticsDashboard eventId={id} />
        </TabsContent>

        <TabsContent value="checkin">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Attendee Check-In</h3>
            <QRCodeScanner
              eventId={id}
              onScan={async (token) => {
                const deviceName =
                  typeof navigator !== "undefined"
                    ? `${navigator.platform} - ${navigator.userAgent}`
                    : "Unknown device";
                await checkInFn({
                  data: {
                    qrToken: token,
                    eventId: id,
                    churchId: currentChurchId || "",
                    deviceName,
                  },
                });
              }}
            />
          </Card>
        </TabsContent>

        <TabsContent value="attendees">
          <EventCheckinReport eventId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
