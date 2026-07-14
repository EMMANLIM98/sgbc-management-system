/**
 * Events Listing Page
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/page-header";
import { EventListing } from "@/modules/events/ui/event-listing";
import { useCurrentChurch } from "@/hooks/use-current-church";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/events/")({
  head: () => ({ meta: [{ title: "Events — Shekinah Glory Baptist Church" }] }),
  component: EventsIndex,
});

function EventsIndex() {
  const { currentChurchId } = useCurrentChurch();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Events" description="Manage upcoming events" />
        <Link to="/events/register">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Registration
          </Button>
        </Link>
      </div>

      <EventListing
        churchId={currentChurchId || undefined}
        futureOnly={true}
        onEventClick={(eventId) => {
          window.location.href = `/events/${eventId}`;
        }}
      />
    </div>
  );
}
