import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserSupabaseClient: SupabaseClient | null = null;

export function getBrowserSupabaseClient(): SupabaseClient {
  if (!browserSupabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error(
        "Supabase browser env vars NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY are missing.",
      );
    }

    browserSupabaseClient = createClient(url, anonKey);
  }

  return browserSupabaseClient;
}

export async function uploadBlogImage(file: File): Promise<string> {
  const supabase = getBrowserSupabaseClient();

  const extension = file.name.split(".").pop() ?? "jpg";
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const path = `blog-images/${uniqueSuffix}.${extension}`;

  const { error } = await supabase.storage.from("blog-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(`Supabase Storage upload error: ${error.message}`);
  }

  const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
  return data.publicUrl;
}
