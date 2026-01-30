import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Supabase env vars SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are missing.");
}

export const supabase = createClient(url, serviceRoleKey);
