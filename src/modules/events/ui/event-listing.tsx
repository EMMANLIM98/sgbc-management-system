/**
 * Event Listing Component
 *
 * Displays a list of upcoming events for a church.
 * Allows filtering and quick actions.
 */

import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, ChevronRight } from "lucide-react";
import { listEvents } from "@/modules/events/events.functions";
import { formatDate } from "@/lib/utils";

export interface EventListingProps {
  churchId?: string;
  futureOnly?: boolean;
  onEventClick?: (eventId: string) => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  scheduled: "bg-gray-100 text-gray-700 border-gray-200",
  active: "bg-gray-100 text-gray-700 border-gray-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-gray-100 text-gray-700 border-gray-200",
};

export function EventListing({ churchId, futureOnly = true, onEventClick }: EventListingProps) {
  const listFn = useServerFn(listEvents);

  const { data, isLoading, error } = useQuery({
    queryKey: ["events", churchId, futureOnly],
    queryFn: async () => {
      try {
        return await listFn({
          data: {
            churchId: churchId || null,
            futureOnly,
          },
        });
      } catch (err) {
        console.error("Failed to load events:", err);
        throw err;
      }
    },
    enabled: !!churchId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  if (!churchId) {
    return (
      <div className="p-8 text-center border border-gray-200 rounded-lg bg-white">
        <p className="text-gray-700 font-medium">Please select a church first</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center border border-gray-200 rounded-lg bg-white">
        <p className="text-gray-700 font-medium mb-2">Unable to load events</p>
        <p className="text-sm text-gray-500 mb-4">
          {error instanceof Error ? error.message : "Please try again later"}
        </p>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          size="sm"
          className="border-gray-200 text-gray-900 hover:bg-gray-50"
        >
          Retry
        </Button>
      </div>
    );
  }

  const events = data?.events || [];

  if (data?.setupRequired) {
    return (
      <div className="p-8 text-center border border-gray-200 rounded-lg bg-white">
        <p className="text-gray-900 font-medium mb-2">Events module setup required</p>
        <p className="text-sm text-gray-600 mb-4">
          {data.setupMessage ||
            "Run the Supabase events migration before using event creation and registration."}
        </p>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          size="sm"
          className="border-gray-200 text-gray-900 hover:bg-gray-50"
        >
          Recheck
        </Button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-12 text-center border border-gray-200 rounded-lg bg-white">
        <Calendar className="w-10 h-10 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600 font-medium">No events scheduled</p>
        <p className="text-sm text-gray-500 mt-1">Events will appear here as they are added</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event: any) => (
        <button
          key={event.id}
          onClick={() => onEventClick?.(event.id)}
          className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 group"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium text-gray-900 truncate group-hover:text-gray-700">
                  {event.title}
                </h3>
                <span
                  className={`text-xs font-medium px-2.5 py-0.5 rounded border flex-shrink-0 ${statusColors[event.status] || "bg-gray-100 text-gray-700 border-gray-200"}`}
                >
                  {event.status}
                </span>
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  <span>{formatDate(new Date(event.eventDate))}</span>
                </div>

                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 flex-shrink-0 text-gray-400" />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 group-hover:text-gray-600 transition-colors" />
          </div>
        </button>
      ))}
    </div>
  );
}
