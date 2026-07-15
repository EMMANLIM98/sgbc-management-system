/**
 * Public Auth Server Functions
 * Functions for unauthenticated auth-related operations
 */

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Service role Supabase client for bypassing RLS (used for public operations)
function createServiceRoleClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn("Service role key not available, falling back to public client");
    return createPublicClient();
  }

  return createClient<Database>(url, key);
}

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
 * Uses service role client to bypass RLS policies
 */
export const getAvailableOrganizations = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createServiceRoleClient();

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
