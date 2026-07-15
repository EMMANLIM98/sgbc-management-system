import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/event-register")({
  head: () => ({ meta: [{ title: "Register for an Event — Shekinah Glory Baptist Church" }] }),
  component: EventRegisterLayout,
});

function EventRegisterLayout() {
  return <Outlet />;
}
