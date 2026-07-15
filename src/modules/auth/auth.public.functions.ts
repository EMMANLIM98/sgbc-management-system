/**
 * Public Auth Server Functions
 * Functions for unauthenticated auth-related operations
 */

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Public Supabase client for auth operations (uses anonymous key)
function createPublicClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.VITE_SUPABASE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase configuration for public client");
  }

  return createClient<Database>(url, key);
}

/**
 * Fetch available organizations for signup dropdown
 */
export const getAvailableOrganizations = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to fetch organizations:", error);
    throw new Error("Failed to load organizations");
  }

  return {
    organizations: (data ?? []).map((org) => ({
      id: org.id,
      name: org.name,
    })),
  };
});
