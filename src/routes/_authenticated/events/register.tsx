/**
 * Event Registration Page
 */

import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { PageHeader } from "@/components/shell/page-header";
import { EventRegistrationForm } from "@/modules/events/ui/event-registration-form";
import { QRCodeDisplay } from "@/modules/events/ui/qr-code-display";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { listEvents } from "@/modules/events/events.functions";
import { useCurrentChurch } from "@/hooks/use-current-church";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/events/register")({
  head: () => ({ meta: [{ title: "Register for Event — Shekinah Glory Baptist Church" }] }),
  validateSearch: (search) =>
    z
      .object({
        eventId: z.string().uuid().optional(),
      })
      .parse(search),
  component: EventRegister,
});

function EventRegister() {
  const search = Route.useSearch();
  const { currentChurchId, currentChurch, churches } = useCurrentChurch();
  const listEventsFn = useServerFn(listEvents);
  const [registered, setRegistered] = useState<{
    id: string;
    attendeeName: string;
    qrToken: string;
  } | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>(search.eventId ?? "");

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["events", currentChurchId],
    queryFn: () =>
      listEventsFn({
        data: {
          churchId: currentChurchId || null,
          futureOnly: true,
        },
      }),
    enabled: !!currentChurchId,
  });

  const events = eventsData?.events || [];
  const selectedEvent = events.find((e: any) => e.id === selectedEventId);
  const organizationId =
    currentChurch?.organization_id ||
    churches.find((church) => church.id === currentChurchId)?.organization_id ||
    "";

  if (!currentChurchId) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <p className="text-yellow-800">Please select a church first</p>
        </Card>
      </div>
    );
  }

  if (registered) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <PageHeader
          title="Registration Successful!"
          description="Your QR code has been emailed to you"
        />

        <QRCodeDisplay
          token={registered.qrToken}
          eventName={selectedEvent?.title || "Event"}
          attendeeName={registered.attendeeName}
          registrationId={registered.id}
        />

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setRegistered(null);
              setSelectedEventId("");
            }}
            className="text-blue-600 hover:underline"
          >
            Register another person
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader title="Register for Event" description="Sign up for an upcoming church event" />

      {eventsLoading ? (
        <Card className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600">Loading events...</p>
        </Card>
      ) : events.length === 0 ? (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <p className="text-blue-800">No upcoming events at this time</p>
        </Card>
      ) : (
        <>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Select Event</label>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">-- Choose an event --</option>
              {events.map((event: any) => (
                <option key={event.id} value={event.id}>
                  {event.title} ({new Date(event.eventDate).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          {selectedEventId && selectedEvent && (
            <EventRegistrationForm
              eventId={selectedEventId}
              churchId={currentChurchId}
              organizationId={organizationId}
              eventName={selectedEvent.title}
              onRegistered={(result) => {
                setRegistered({
                  id: result.id,
                  attendeeName: result.attendeeName,
                  qrToken: result.qrToken,
                });
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
