import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { ModuleLanding } from "@/components/shell/module-landing";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Inventory — Shekinah Glory Baptist Church" }] }),
  component: () => (
    <ModuleLanding
      title="Inventory"
      description="Assets, supplies and equipment tracking."
      icon={Package}
      tagline="Know what you have, where it is."
      features={[
        {
          title: "Items & Categories",
          description: "Chairs, instruments, media gear, curriculum and more.",
        },
        { title: "Locations", description: "Rooms, buildings, and campuses." },
        {
          title: "Stock & Movements",
          description: "Track quantities, borrow, return and disposal.",
        },
        { title: "Maintenance", description: "Schedule service and repairs for equipment." },
      ]}
    />
  ),
});
