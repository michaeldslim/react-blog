import type { IBlog, IBlogsPage, IBlogsRepository } from "@/types";
import { getSupabaseClient } from "./supabaseClient";

type BlogsRow = {
  id: string;
  title: string;
  content: string;
  is_good: boolean;
  likes_count: number | null;
  dislikes_count: number | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

function extractStoragePathFromPublicUrl(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const marker = "/object/public/";
    const index = url.pathname.indexOf(marker);
    if (index === -1) {
      return null;
    }

    const after = url.pathname.slice(index + marker.length); // e.g. "blog-images/uuid.jpg" or "blog-images/blog-images/uuid.jpg"
    const segments = after.split("/");
    if (segments.length <= 1) {
      return null;
    }

    // Remove bucket name (first segment) to get the object path inside the bucket.
    segments.shift();
    return segments.join("/");
  } catch {
    return null;
  }
}

function mapRowToBlog(row: BlogsRow): IBlog {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    isGood: row.is_good,
    likesCount: row.likes_count ?? 0,
    dislikesCount: row.dislikes_count ?? 0,
    imageUrl: row.image_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const supabaseBlogsRepository: IBlogsRepository = {
  async getBlogs(): Promise<IBlog[]> {
		const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("blogs")
      .select("id, title, content, is_good, likes_count, dislikes_count, image_url, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Supabase getBlogs error: ${error.message}`);
    }

    const rows = (data ?? []) as BlogsRow[];
    return rows.map(mapRowToBlog);
  },

  async getBlogsPaginated(page: number, pageSize: number): Promise<IBlogsPage> {
		const supabase = getSupabaseClient();

    const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
    const safePageSize = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 1;

    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;

    const { data, error, count } = await supabase
      .from("blogs")
      .select(
        "id, title, content, is_good, likes_count, dislikes_count, image_url, created_at, updated_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Supabase getBlogsPaginated error: ${error.message}`);
    }

    const rows = (data ?? []) as BlogsRow[];

    return {
      items: rows.map(mapRowToBlog),
      totalCount: count ?? rows.length,
    };
  },

  async getBlogById(id: string): Promise<IBlog | undefined> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("blogs")
      .select("id, title, content, is_good, likes_count, dislikes_count, image_url, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase getBlogById error: ${error.message}`);
    }

    if (!data) {
      return undefined;
    }

    return mapRowToBlog(data as BlogsRow);
  },

  async createBlog(input: { title: string; content: string; imageUrl?: string | null }): Promise<IBlog> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("blogs")
      .insert({
        title: input.title,
        content: input.content,
        is_good: false,
        likes_count: 0,
        dislikes_count: 0,
        image_url: input.imageUrl ?? null,
      })
      .select("id, title, content, is_good, likes_count, dislikes_count, image_url, created_at, updated_at")
      .single();

    if (error || !data) {
      throw new Error(`Supabase createBlog error: ${error?.message ?? "No data"}`);
    }

    return mapRowToBlog(data as BlogsRow);
  },

  async updateBlog(
    id: string,
    input: { title?: string; content?: string; isGood?: boolean; imageUrl?: string | null },
  ): Promise<IBlog> {
    const supabase = getSupabaseClient();
    // Fetch existing image_url so we can clean up storage if it changes.
    const { data: existing, error: fetchError } = await supabase
      .from("blogs")
      .select("image_url")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Supabase updateBlog fetch error: ${fetchError.message}`);
    }

    const previousImageUrl = (existing as { image_url: string | null } | null)?.image_url ?? null;
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) {
      updatePayload.title = input.title;
    }
    if (input.content !== undefined) {
      updatePayload.content = input.content;
    }
    if (input.isGood !== undefined) {
      updatePayload.is_good = input.isGood;
    }
    if (input.imageUrl !== undefined) {
      updatePayload.image_url = input.imageUrl;
    }

    const { data, error } = await supabase
      .from("blogs")
      .update(updatePayload)
      .eq("id", id)
      .select("id, title, content, is_good, likes_count, dislikes_count, image_url, created_at, updated_at")
      .single();

    if (error || !data) {
      throw new Error(`Supabase updateBlog error: ${error?.message ?? "No data"}`);
    }

    // If the imageUrl was removed or changed, delete the previous image object from storage.
    if (previousImageUrl) {
      const wantsRemoval = input.imageUrl === null;
      const wantsReplacement =
        input.imageUrl !== undefined && input.imageUrl !== null && input.imageUrl !== previousImageUrl;

      if (wantsRemoval || wantsReplacement) {
        const objectPath = extractStoragePathFromPublicUrl(previousImageUrl);
        if (objectPath) {
          const { error: storageError } = await supabase
            .storage
            .from("blog-images")
            .remove([objectPath]);

          if (storageError) {
            throw new Error(`Supabase updateBlog storage error: ${storageError.message}`);
          }
        }
      }
    }

    return mapRowToBlog(data as BlogsRow);
  },

  async deleteBlog(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    // First fetch the blog to get image_url (if any)
    const { data: existing, error: fetchError } = await supabase
      .from("blogs")
      .select("image_url")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Supabase deleteBlog fetch error: ${fetchError.message}`);
    }

    const imageUrl = (existing as { image_url: string | null } | null)?.image_url ?? null;

    const { error: deleteError } = await supabase.from("blogs").delete().eq("id", id);

    if (deleteError) {
      throw new Error(`Supabase deleteBlog error: ${deleteError.message}`);
    }

    if (imageUrl) {
      const objectPath = extractStoragePathFromPublicUrl(imageUrl);
      if (objectPath) {
        const { error: storageError } = await supabase
          .storage
          .from("blog-images")
          .remove([objectPath]);

        if (storageError) {
          // Surface as an error so callers know cleanup failed.
          throw new Error(`Supabase deleteBlog storage error: ${storageError.message}`);
        }
      }
    }

    return true;
  },

  async toggleBlogGood(id: string): Promise<IBlog> {
    const supabase = getSupabaseClient();
    const { data: existing, error: fetchError } = await supabase
      .from("blogs")
      .select("is_good, likes_count, dislikes_count")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      throw new Error(`Supabase toggleBlogGood fetch error: ${fetchError?.message ?? "No data"}`);
    }

    const current = existing as {
      is_good: boolean;
      likes_count: number | null;
      dislikes_count: number | null;
    };
    const newIsGood = !current.is_good;

    let likesCount = current.likes_count ?? 0;
    let dislikesCount = current.dislikes_count ?? 0;

    if (!current.is_good) {
      // bad -> good
      likesCount += 1;
      if (dislikesCount > 0) {
        dislikesCount -= 1;
      }
    } else {
      // good -> bad
      dislikesCount += 1;
      if (likesCount > 0) {
        likesCount -= 1;
      }
    }

    const { data, error: updateError } = await supabase
      .from("blogs")
      .update({
        is_good: newIsGood,
        likes_count: likesCount,
        dislikes_count: dislikesCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        "id, title, content, is_good, likes_count, dislikes_count, image_url, created_at, updated_at",
      )
      .single();

    if (updateError || !data) {
      throw new Error(`Supabase toggleBlogGood update error: ${updateError?.message ?? "No data"}`);
    }
    return mapRowToBlog(data as BlogsRow);
  },

  async likeBlog(id: string): Promise<IBlog> {
    const supabase = getSupabaseClient();
    const { data: existing, error: fetchError } = await supabase
      .from("blogs")
      .select("is_good, likes_count, dislikes_count")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      throw new Error(`Supabase likeBlog fetch error: ${fetchError?.message ?? "No data"}`);
    }

    const current = existing as {
      is_good: boolean;
      likes_count: number | null;
      dislikes_count: number | null;
    };

    if (current.is_good) {
      const { data, error } = await supabase
        .from("blogs")
        .select(
          "id, title, content, is_good, likes_count, dislikes_count, image_url, created_at, updated_at",
        )
        .eq("id", id)
        .single();

      if (error || !data) {
        throw new Error(`Supabase likeBlog read error: ${error?.message ?? "No data"}`);
      }

      return mapRowToBlog(data as BlogsRow);
    }

    const likesCount = (current.likes_count ?? 0) + 1;
    const dislikesCount = current.is_good
      ? (current.dislikes_count ?? 0)
      : Math.max((current.dislikes_count ?? 0) - 1, 0);

    const { data, error: updateError } = await supabase
      .from("blogs")
      .update({
        is_good: true,
        likes_count: likesCount,
        dislikes_count: dislikesCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        "id, title, content, is_good, likes_count, dislikes_count, image_url, created_at, updated_at",
      )
      .single();

    if (updateError || !data) {
      throw new Error(`Supabase likeBlog update error: ${updateError?.message ?? "No data"}`);
    }

    return mapRowToBlog(data as BlogsRow);
  },

  async dislikeBlog(id: string): Promise<IBlog> {
    const supabase = getSupabaseClient();
    const { data: existing, error: fetchError } = await supabase
      .from("blogs")
      .select("is_good, likes_count, dislikes_count")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      throw new Error(`Supabase dislikeBlog fetch error: ${fetchError?.message ?? "No data"}`);
    }

    const current = existing as {
      is_good: boolean;
      likes_count: number | null;
      dislikes_count: number | null;
    };

    if (!current.is_good) {
      const { data, error } = await supabase
        .from("blogs")
        .select(
          "id, title, content, is_good, likes_count, dislikes_count, image_url, created_at, updated_at",
        )
        .eq("id", id)
        .single();

      if (error || !data) {
        throw new Error(`Supabase dislikeBlog read error: ${error?.message ?? "No data"}`);
      }

      return mapRowToBlog(data as BlogsRow);
    }

    const dislikesCount = (current.dislikes_count ?? 0) + 1;
    const likesCount = current.is_good
      ? Math.max((current.likes_count ?? 0) - 1, 0)
      : (current.likes_count ?? 0);

    const { data, error: updateError } = await supabase
      .from("blogs")
      .update({
        is_good: false,
        likes_count: likesCount,
        dislikes_count: dislikesCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        "id, title, content, is_good, likes_count, dislikes_count, image_url, created_at, updated_at",
      )
      .single();

    if (updateError || !data) {
      throw new Error(`Supabase dislikeBlog update error: ${updateError?.message ?? "No data"}`);
    }

    return mapRowToBlog(data as BlogsRow);
  },
};
