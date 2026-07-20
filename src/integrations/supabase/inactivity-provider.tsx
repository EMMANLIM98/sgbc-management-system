/**
 * Inactivity Provider Component
 *
 * Wraps authenticated routes to provide automatic logout on inactivity.
 * Configurable timeout (default: 1 hour = 3600000 ms)
 */

import { useEffect, ReactNode, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useInactivity } from "@/hooks/use-inactivity";
import { SessionManager } from "@/integrations/supabase/session-manager";
import { toast } from "sonner";

export interface InactivityProviderProps {
  children: ReactNode;
  inactivityTimeoutMinutes?: number; // Default: 60 minutes (1 hour)
}

const DEFAULT_INACTIVITY_MINUTES = 60;

export function InactivityProvider({
  children,
  inactivityTimeoutMinutes = DEFAULT_INACTIVITY_MINUTES,
}: InactivityProviderProps) {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const warningTimeMs = 5 * 60 * 1000; // Show warning 5 minutes before logout
  const timeoutMs = inactivityTimeoutMinutes * 60 * 1000;

  // Handle inactivity
  const handleInactivity = async () => {
    // Show warning toast
    toast.error("Session Expired", {
      description: "You have been logged out due to inactivity. Please log in again.",
      duration: 5000,
    });

    // Log out the user
    await SessionManager.logoutDueToInactivity();

    // Redirect to login
    router.navigate({ to: "/auth", replace: true });
  };

  // Use inactivity hook
  useInactivity({
    timeoutMs,
    onInactivity: handleInactivity,
    enabled: true,
  });

  // Optional: Show warning before logout (adjust timing as needed)
  useEffect(() => {
    const warningTimer = setTimeout(() => {
      setShowWarning(true);
      toast.warning("Inactivity Notice", {
        description: `You will be logged out in ${Math.floor((timeoutMs - warningTimeMs) / 60000)} minutes due to inactivity.`,
        duration: 10000,
      });
    }, timeoutMs - warningTimeMs);

    return () => clearTimeout(warningTimer);
  }, [timeoutMs, warningTimeMs]);

  return <>{children}</>;
}
