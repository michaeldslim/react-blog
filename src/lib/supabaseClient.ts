import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
	if (!supabase) {
		const url = process.env.SUPABASE_URL;
		const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

		if (!url || !serviceRoleKey) {
			throw new Error(
				"Supabase env vars SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are missing.",
			);
		}

		supabase = createClient(url, serviceRoleKey);
	}

	return supabase;
}
