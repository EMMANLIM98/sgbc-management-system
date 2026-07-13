import { createFileRoute } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { ModuleLanding } from "@/components/shell/module-landing";

export const Route = createFileRoute("/_authenticated/visitation")({
  head: () => ({ meta: [{ title: "Visitation — Shekinah Glory Baptist Church" }] }),
  component: () => (
    <ModuleLanding
      title="Visitation"
      description="Home visits, follow-ups and pastoral care."
      icon={Home}
      tagline="Care in every home."
      features={[
        { title: "Visit Requests", description: "Log requests from members, visitors, or referrals." },
        { title: "Assignments", description: "Assign visits to pastors, deacons, or ministry teams." },
        { title: "Visit Notes", description: "Record outcomes, prayer needs, and follow-ups." },
        { title: "Follow-up Schedule", description: "Track next visit dates and pending care items." },
      ]}
    />
  ),
});