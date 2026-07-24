import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, Clock, ArrowRight, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listPublicEvents } from "@/modules/events/events.public.functions";

export const Route = createFileRoute("/event-register/")({
  head: () => ({ meta: [{ title: "Register for an Event — Shekinah Glory Baptist Church" }] }),
  component: PublicEventsListPage,
});

function PublicEventsListPage() {
  const listPublicEventsFn = useServerFn(listPublicEvents);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-events"],
    queryFn: () => listPublicEventsFn({ data: {} }),
    staleTime: 60_000,
  });

  const events = data?.events ?? [];

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200 px-6 py-10">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">
            Public Registration
          </p>
          <h1 className="text-3xl font-light text-gray-900 tracking-tight">
            Register for an Event
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            No login required. Pick an event and complete your registration.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {isLoading ? (
          <Card className="p-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-500" />
            <p className="text-sm text-gray-600">Loading available events...</p>
          </Card>
        ) : error ? (
          <Card className="p-6 border-red-200 bg-red-50">
            <p className="text-sm text-red-700">
              Unable to load events right now. Please try again later.
            </p>
          </Card>
        ) : events.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-base text-gray-800 font-medium">No open events at the moment</p>
            <p className="text-sm text-gray-600 mt-1">Please check back soon.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
              const eventDate = new Date(event.eventDate);
              return (
                <Card key={event.id} className="p-5 border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-2">
                      <h2 className="text-lg font-semibold text-gray-900">{event.title}</h2>
                      {event.description && (
                        <p className="text-sm text-gray-600 max-w-2xl">{event.description}</p>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {eventDate.toLocaleDateString()}
                        </span>

                        {(event.startTime || event.endTime) && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {event.startTime || ""}
                            {event.endTime ? ` - ${event.endTime}` : ""}
                          </span>
                        )}

                        {event.location && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>

                    <Link to="/event-register/$eventId" params={{ eventId: event.id }}>
                      <Button className="w-full sm:w-auto whitespace-nowrap">
                        Register
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
