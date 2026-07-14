import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck2 } from "lucide-react";
import { ModuleLanding } from "@/components/shell/module-landing";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({ meta: [{ title: "Events — Shekinah Glory Baptist Church" }] }),
  component: () => (
    <ModuleLanding
      title="Events"
      description="Event registration, QR check-in, and reports."
      icon={CalendarCheck2}
      tagline="Every event, effortlessly organized."
      features={[
        { title: "Event Setup", description: "Create events with capacity, sessions and fees." },
        { title: "Registration", description: "Public forms with confirmation emails." },
        { title: "QR Check-in", description: "Scan attendees at the door for fast entry." },
        { title: "Reports", description: "Attendance, no-shows, and revenue summaries." },
      ]}
    />
  ),
});
