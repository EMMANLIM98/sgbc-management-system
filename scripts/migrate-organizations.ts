import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase configuration");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function runMigration() {
  try {
    console.log("Checking organizations table schema...");

    // Helper to create slug from name
    const createSlug = (name: string) => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    };

    // Try to insert with slug
    const testData = [
      { name: "SGBC - Antipolo", slug: createSlug("SGBC - Antipolo") },
      { name: "SGBC - Baras", slug: createSlug("SGBC - Baras") },
      { name: "SGBC - Boracay", slug: createSlug("SGBC - Boracay") },
      { name: "SGBC - Cainta", slug: createSlug("SGBC - Cainta") },
      { name: "SGBC - Morong", slug: createSlug("SGBC - Morong") },
      { name: "SGBC - Taytay", slug: createSlug("SGBC - Taytay") },
    ];

    const { data, error: insertError } = await supabase
      .from("organizations")
      .insert(testData)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }

    console.log(`✓ Inserted ${data?.length ?? 0} organizations`);

    // Verify
    const { data: orgs, error: fetchError } = await supabase
      .from("organizations")
      .select("*")
      .order("name");

    if (fetchError) throw fetchError;

    console.log("\n✓ Organizations in database:");
    orgs?.forEach((org: any) => {
      console.log(`  - ${org.name} (ID: ${org.id})`);
    });

    console.log("\n✓ Migration completed successfully!");
  } catch (error: any) {
    console.error("Migration failed:", error.message || error);
    process.exit(1);
  }
}

runMigration();
