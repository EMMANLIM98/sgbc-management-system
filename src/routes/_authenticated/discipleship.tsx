import { createFileRoute } from "@tanstack/react-router";
import { HeartHandshake } from "lucide-react";
import { ModuleLanding } from "@/components/shell/module-landing";

export const Route = createFileRoute("/_authenticated/discipleship")({
  head: () => ({ meta: [{ title: "Discipleship — Shekinah Glory Baptist Church" }] }),
  component: () => (
    <ModuleLanding
      title="Discipleship"
      description="Track spiritual growth, mentorship, and small groups."
      icon={HeartHandshake}
      tagline="Walk with every disciple."
      features={[
        { title: "Growth Tracks", description: "Define paths: New believer, Baptism, Membership, Leadership." },
        { title: "Mentor Assignments", description: "Pair mentors with disciples and track progress." },
        { title: "Small Groups", description: "Manage cell groups, life groups and their meetings." },
        { title: "Milestones", description: "Record baptisms, commitments, and completion of courses." },
      ]}
    />
  ),
});