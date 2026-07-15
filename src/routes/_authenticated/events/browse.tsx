/**
 * Events Browse Page
 */

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/page-header";
import { EventListing } from "@/modules/events/ui/event-listing";
import { useCurrentChurch } from "@/hooks/use-current-church";
import { CalendarPlus, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/events/browse")({
  head: () => ({ meta: [{ title: "Browse Events — Shekinah Glory Baptist Church" }] }),
  component: EventsBrowse,
});

function EventsBrowse() {
  const navigate = useNavigate();
  const { currentChurchId } = useCurrentChurch();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3">
        <PageHeader title="Browse Events" description="View and manage upcoming events" />
        <div className="flex items-center gap-2">
          <Link to="/events/new">
            <Button variant="outline">
              <CalendarPlus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </Link>
          <Link to="/events/register">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Registration
            </Button>
          </Link>
        </div>
      </div>

      <EventListing
        churchId={currentChurchId || undefined}
        futureOnly={true}
        onEventClick={(eventId) => {
          navigate({ to: "/events/$id", params: { id: eventId } });
        }}
      />

      <p className="text-sm text-gray-500 mt-4">
        Tip: Click an event to open check-in scanner, analytics, and event-specific registration.
      </p>
    </div>
  );
}
