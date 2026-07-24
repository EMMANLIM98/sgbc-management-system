import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/shell/app-shell";
import { InactivityProvider } from "@/integrations/supabase/inactivity-provider";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error("[Auth] Failed to get user:", error);
      throw redirect({ to: "/auth" });
    }

    if (!data.user) {
      console.warn("[Auth] No user found in session");
      throw redirect({ to: "/auth" });
    }

    console.log("[Auth] User authenticated:", data.user.id);
    return { user: data.user };
  },
  component: () => (
    <InactivityProvider inactivityTimeoutMinutes={60}>
      <AppShell>
        <Outlet />
      </AppShell>
    </InactivityProvider>
  ),
});
