import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { ModuleLanding } from "@/components/shell/module-landing";

export const Route = createFileRoute("/_authenticated/sunday-school")({
  head: () => ({ meta: [{ title: "Sunday School — Shekinah Glory Baptist Church" }] }),
  component: () => (
    <ModuleLanding
      title="Sunday School"
      description="Classes, teachers, attendance and lesson tracking."
      icon={GraduationCap}
      tagline="Organize every class and every learner."
      features={[
        {
          title: "Classes & Departments",
          description: "Group learners by age, level, or program.",
        },
        { title: "Enrollment", description: "Add students, assign teachers, track promotions." },
        { title: "Attendance", description: "Weekly attendance with per-class summaries." },
        { title: "Lesson Plans", description: "Store lessons, memory verses, and resources." },
      ]}
    />
  ),
});
