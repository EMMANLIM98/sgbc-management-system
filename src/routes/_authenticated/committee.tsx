import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { ModuleLanding } from "@/components/shell/module-landing";

export const Route = createFileRoute("/_authenticated/committee")({
  head: () => ({ meta: [{ title: "Committee — Shekinah Glory Baptist Church" }] }),
  component: () => (
    <ModuleLanding
      title="Committee"
      description="Committees, meetings, minutes and resolutions."
      icon={ClipboardList}
      tagline="Govern with clarity."
      features={[
        {
          title: "Committees",
          description: "Deacons, Trustees, Finance, Missions committees and more.",
        },
        {
          title: "Members & Roles",
          description: "Chair, secretary, and member assignments per term.",
        },
        { title: "Meeting Minutes", description: "Record agendas, decisions and action items." },
        { title: "Resolutions", description: "Track motions passed and their follow-through." },
      ]}
    />
  ),
});
