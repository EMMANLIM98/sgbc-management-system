import { createFileRoute, Outlet } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/members")({
  head: () => ({ meta: [{ title: "Membership — Shekinah Glory Baptist Church" }] }),
  component: () => <Outlet />,
});
