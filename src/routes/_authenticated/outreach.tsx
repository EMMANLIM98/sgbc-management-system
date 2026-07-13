import { createFileRoute } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { ModuleLanding } from "@/components/shell/module-landing";

export const Route = createFileRoute("/_authenticated/outreach")({
  head: () => ({ meta: [{ title: "Outreach — Shekinah Glory Baptist Church" }] }),
  component: () => (
    <ModuleLanding
      title="Outreach"
      description="Evangelism, missions and community outreach."
      icon={MapPin}
      tagline="Reach every corner."
      features={[
        { title: "Outreach Events", description: "Plan crusades, evangelism, and community services." },
        { title: "Contacts", description: "Record contacts made and their status." },
        { title: "Follow-ups", description: "Convert contacts into visitors and members." },
        { title: "Mission Fields", description: "Track partner locations and pastors on the field." },
      ]}
    />
  ),
});