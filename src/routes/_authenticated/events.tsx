import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";
import { EventListing } from "@/modules/events/ui/event-listing";
import { Calendar, QrCode, Barcode3, BarChart3, UserPlus } from "lucide-react";
import { useCurrentChurch } from "@/hooks/use-current-church";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({ meta: [{ title: "Events — Shekinah Glory Baptist Church" }] }),
  component: EventsLanding,
});

function EventsLanding() {
  const { currentChurchId } = useCurrentChurch();

  return (
    <div className="space-y-8 pb-8">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <PageHeader
            title="Events Management"
            description="Register attendees, scan QR codes, and view real-time analytics"
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 space-y-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">Register for Event</h3>
                <p className="text-sm text-gray-600 mt-1">Sign up for an upcoming event</p>
              </div>
              <UserPlus className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
            <Link to="/events/register" className="inline-block w-full">
              <Button className="w-full">Start Registration</Button>
            </Link>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">View Events</h3>
                <p className="text-sm text-gray-600 mt-1">Browse upcoming and past events</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600 opacity-20" />
            </div>
            <Link to="/events/" className="inline-block w-full">
              <Button variant="outline" className="w-full">
                View All Events
              </Button>
            </Link>
          </Card>
        </div>

        {/* Upcoming Events Listing */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
          <EventListing
            churchId={currentChurchId || undefined}
            futureOnly={true}
            onEventClick={(eventId) => {
              window.location.href = `/events/${eventId}`;
            }}
          />
        </div>
      </div>
    </div>
  );
}
