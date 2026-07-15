import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({ meta: [{ title: "Events — Shekinah Glory Baptist Church" }] }),
  component: EventsLayout,
});

function EventsLayout() {
  return <Outlet />;
}
