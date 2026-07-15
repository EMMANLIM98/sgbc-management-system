import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { EventListing } from "@/modules/events/ui/event-listing";
import { Calendar, PlusCircle, UserPlus } from "lucide-react";
import { useCurrentChurch } from "@/hooks/use-current-church";

export const Route = createFileRoute("/_authenticated/events/")({
  component: EventsLanding,
});

function EventsLanding() {
  const navigate = useNavigate();
  const { currentChurchId } = useCurrentChurch();

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200 px-6 py-12 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-light text-gray-900 tracking-tight">Events</h1>
          <p className="mt-3 text-base text-gray-600 font-normal">
            Manage registrations, check-ins, and view analytics
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 sm:px-8 space-y-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Link to="/events/register" className="group">
            <div className="h-full p-6 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 cursor-pointer">
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">New Registration</h3>
                    <p className="mt-1 text-sm text-gray-600">Register an attendee for an event</p>
                  </div>
                  <UserPlus className="w-6 h-6 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
                </div>
                <Button className="mt-auto w-full bg-gray-900 hover:bg-gray-800 text-white">
                  Get Started
                </Button>
              </div>
            </div>
          </Link>

          <Link to="/events/new" className="group">
            <div className="h-full p-6 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 cursor-pointer">
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Create Event</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Set up a new event for registrations
                    </p>
                  </div>
                  <PlusCircle className="w-6 h-6 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
                </div>
                <Button
                  variant="outline"
                  className="mt-auto w-full border-gray-300 text-gray-900 hover:bg-gray-100"
                >
                  New Event
                </Button>
              </div>
            </div>
          </Link>

          <Link to="/events/browse" className="group">
            <div className="h-full p-6 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 cursor-pointer">
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Browse Events</h3>
                    <p className="mt-1 text-sm text-gray-600">View all upcoming and past events</p>
                  </div>
                  <Calendar className="w-6 h-6 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
                </div>
                <Button
                  variant="outline"
                  className="mt-auto w-full border-gray-300 text-gray-900 hover:bg-gray-100"
                >
                  View All
                </Button>
              </div>
            </div>
          </Link>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-light text-gray-900 tracking-tight">Upcoming Events</h2>
            <p className="mt-2 text-sm text-gray-600">Next events for your church</p>
          </div>
          <EventListing
            churchId={currentChurchId || undefined}
            futureOnly={true}
            onEventClick={(eventId) => {
              navigate({ to: "/events/$id", params: { id: eventId } });
            }}
          />
        </div>
      </div>
    </div>
  );
}
