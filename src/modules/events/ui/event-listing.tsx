/**
 * Event Listing Component
 *
 * Displays a list of upcoming events for a church.
 * Allows filtering and quick actions.
 */

import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, ChevronRight, Loader2 } from "lucide-react";
import { listEvents } from "@/modules/events/events.functions";
import { formatDate } from "@/lib/utils";

export interface EventListingProps {
  churchId?: string;
  futureOnly?: boolean;
  onEventClick?: (eventId: string) => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  scheduled: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

export function EventListing({ churchId, futureOnly = true, onEventClick }: EventListingProps) {
  const listFn = useServerFn(listEvents);

  const { data, isLoading, error } = useQuery({
    queryKey: ["events", churchId, futureOnly],
    queryFn: () =>
      listFn({
        data: {
          churchId: churchId || null,
          futureOnly,
        },
      }),
  });

  if (isLoading) {
    return (
      <Card className="p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
        <p className="text-gray-600">Loading events...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 bg-red-50 border-red-200">
        <p className="text-red-800">Failed to load events</p>
      </Card>
    );
  }

  const events = data?.events || [];

  if (events.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-600">No events found</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event: any) => (
        <Card key={event.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg truncate">{event.title}</h3>
                <Badge className={statusColors[event.status] || ""}>{event.status}</Badge>
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>{formatDate(new Date(event.eventDate))}</span>
                </div>

                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={() => onEventClick?.(event.id)}
              variant="ghost"
              size="sm"
              className="flex-shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
