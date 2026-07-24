/**
 * Supabase Client Utility
 * 
 * Centralized Supabase client for all repositories
 * Provides type-safe database access with error handling
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY"
  );
}

/**
 * Supabase client singleton
 */
export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Query builder helper - adds pagination
 */
export function addPagination(query: any, offset: number = 0, limit: number = 20) {
  if (limit > 100) limit = 100; // Safety limit
  return query.range(offset, offset + limit - 1);
}

/**
 * Query builder helper - adds sorting
 */
export function addSorting(
  query: any,
  orderBy: string = "created_at",
  order: "asc" | "desc" = "asc"
) {
  return query.order(orderBy, { ascending: order === "asc" });
}

/**
 * Error handler for Supabase queries
 */
export function handleSupabaseError(error: any, context: string) {
  console.error(`[Supabase Error - ${context}]`, error);
  throw new Error(
    `Database operation failed: ${error?.message || "Unknown error"}`
  );
}

/**
 * Type-safe query wrapper
 */
export async function executeQuery<T>(
  query: Promise<{ data: T | null; error: any }>,
  context: string
): Promise<T> {
  const { data, error } = await query;
  if (error) {
    handleSupabaseError(error, context);
  }
  return data as T;
}

/**
 * Type-safe query wrapper for arrays
 */
export async function executeQueryArray<T>(
  query: Promise<{ data: T[] | null; error: any }>,
  context: string
): Promise<T[]> {
  const { data, error } = await query;
  if (error) {
    handleSupabaseError(error, context);
  }
  return (data || []) as T[];
}

/**
 * Type-safe count query
 */
export async function executeCountQuery(
  query: Promise<{ count: number | null; error: any }>,
  context: string
): Promise<number> {
  const { count, error } = await query;
  if (error) {
    handleSupabaseError(error, context);
  }
  return count || 0;
}

/**
 * Build filter conditions
 */
export function buildFilters(filters: Record<string, any>) {
  const conditions: string[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;

    if (typeof value === "boolean") {
      conditions.push(`${key}.eq.${value}`);
    } else if (typeof value === "string") {
      conditions.push(`${key}.eq.${encodeURIComponent(value)}`);
    } else if (typeof value === "number") {
      conditions.push(`${key}.eq.${value}`);
    }
  }

  return conditions;
}
