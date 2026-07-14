import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { ModuleLanding } from "@/components/shell/module-landing";

export const Route = createFileRoute("/_authenticated/ministry")({
  head: () => ({ meta: [{ title: "Ministry — Shekinah Glory Baptist Church" }] }),
  component: () => (
    <ModuleLanding
      title="Ministry"
      description="Ministries, teams, schedules and volunteers."
      icon={Sparkles}
      tagline="Empower every servant."
      features={[
        { title: "Ministry Teams", description: "Worship, Ushers, Media, Prayer, Youth and more." },
        { title: "Volunteer Roster", description: "Track team members, roles, and availability." },
        { title: "Service Schedules", description: "Rotate people across weekly services." },
        { title: "Trainings", description: "Log trainings, certifications, and refreshers." },
      ]}
    />
  ),
});
