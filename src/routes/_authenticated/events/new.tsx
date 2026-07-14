import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";
import { useCurrentChurch } from "@/hooks/use-current-church";
import { EventCreateForm } from "@/modules/events/ui/event-create-form";

export const Route = createFileRoute("/_authenticated/events/new")({
  head: () => ({ meta: [{ title: "Create Event — Shekinah Glory Baptist Church" }] }),
  component: NewEventPage,
});

function NewEventPage() {
  const navigate = useNavigate();
  const { currentChurchId, currentChurch, churches } = useCurrentChurch();

  const organizationId =
    currentChurch?.organization_id ||
    churches.find((church) => church.id === currentChurchId)?.organization_id ||
    "";

  if (!currentChurchId || !organizationId) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <p className="text-yellow-800">Please select a church before creating an event.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Create New Event"
        description="Admins can create events for participant registration and QR check-in."
      />

      <EventCreateForm
        churchId={currentChurchId}
        organizationId={organizationId}
        onCreated={(eventId) => {
          navigate({ to: "/events/$id", params: { id: eventId } });
        }}
      />
    </div>
  );
}
