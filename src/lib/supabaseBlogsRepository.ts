import type { IBlog, IBlogViewerOptions, IBlogsPage, IBlogsRepository } from "@/types";
import { randomBytes } from "crypto";
import { getSupabaseClient } from "./supabaseClient";

const BLOG_SELECT =
  "id, short_code, title, content, is_good, likes_count, dislikes_count, image_url, author_id, author_name, status, published_at, tags, created_at, updated_at";

type BlogsRow = {
  id: string;
  short_code: string | null;
  title: string;
  content: string;
  is_good: boolean;
  likes_count: number | null;
  dislikes_count: number | null;
  image_url: string | null;
  author_id: string | null;
  author_name: string | null;
  status: string | null;
  published_at: string | null;
  tags: string[] | null;
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
    shortCode: row.short_code ?? row.id,
    title: row.title,
    content: row.content,
    isGood: row.is_good,
    likesCount: row.likes_count ?? 0,
    dislikesCount: row.dislikes_count ?? 0,
    imageUrl: row.image_url ?? null,
    authorId: row.author_id ?? null,
    authorName: row.author_name ?? null,
    status: (row.status as IBlog["status"]) ?? "published",
    publishedAt: row.published_at ?? null,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const supabaseBlogsRepository: IBlogsRepository = {
  async getBlogs(options?: IBlogViewerOptions): Promise<IBlog[]> {
    const supabase = getSupabaseClient();
    let query = supabase.from("blogs").select(BLOG_SELECT).order("created_at", { ascending: false });

    if (!options?.isAdmin) {
      const viewerId = options?.viewerUserId;
      if (viewerId) {
        query = query.or(`status.eq.published,author_id.eq.${viewerId}`);
      } else {
        query = query.eq("status", "published");
      }
    }

    if (options?.query?.trim()) {
      query = query.or(`title.ilike.%${options.query.trim()}%,content.ilike.%${options.query.trim()}%`);
    }

    if (options?.tag?.trim()) {
      query = query.contains("tags", [options.tag.trim().toLowerCase()]);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Supabase getBlogs error: ${error.message}`);
    return ((data ?? []) as BlogsRow[]).map(mapRowToBlog);
  },

  async getBlogsPaginated(page: number, pageSize: number, options?: IBlogViewerOptions): Promise<IBlogsPage> {
    const supabase = getSupabaseClient();
    const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
    const safePageSize = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 1;
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;

    let query = supabase
      .from("blogs")
      .select(BLOG_SELECT, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!options?.isAdmin) {
      const viewerId = options?.viewerUserId;
      if (viewerId) {
        query = query.or(`status.eq.published,author_id.eq.${viewerId}`);
      } else {
        query = query.eq("status", "published");
      }
    }

    if (options?.query?.trim()) {
      query = query.or(`title.ilike.%${options.query.trim()}%,content.ilike.%${options.query.trim()}%`);
    }

    if (options?.tag?.trim()) {
      query = query.contains("tags", [options.tag.trim().toLowerCase()]);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(`Supabase getBlogsPaginated error: ${error.message}`);
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
      .select(BLOG_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`Supabase getBlogById error: ${error.message}`);
    if (!data) return undefined;
    return mapRowToBlog(data as BlogsRow);
  },

  async getBlogByShortCode(shortCode: string): Promise<IBlog | undefined> {
    const supabase = getSupabaseClient();
    const normalized = shortCode.trim();
    const { data, error } = await supabase
      .from("blogs")
      .select(BLOG_SELECT)
      .eq("short_code", normalized)
      .maybeSingle();
    if (error) throw new Error(`Supabase getBlogByShortCode error: ${error.message}`);
    if (!data) return undefined;
    return mapRowToBlog(data as BlogsRow);
  },

  async getBlogDates(): Promise<{ date: string; count: number }[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("blogs")
      .select("created_at")
      .eq("status", "published");

    if (error) {
      throw new Error(`Supabase getBlogDates error: ${error.message}`);
    }

    const dateCounts = new Map<string, number>();
    
    (data || []).forEach((row) => {
      if (row.created_at) {
        const date = row.created_at.split('T')[0];
        dateCounts.set(date, (dateCounts.get(date) || 0) + 1);
      }
    });

    return Array.from(dateCounts.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  },

  async createBlog(input: { title: string; content: string; imageUrl?: string | null; authorId?: string | null; authorName?: string | null; status?: IBlog["status"]; tags?: string[] }): Promise<IBlog> {
    const supabase = getSupabaseClient();
    const status = input.status ?? "published";
    const now = new Date().toISOString();

    const generateShortCode = () => randomBytes(6).toString("base64url");

    for (let attempt = 0; attempt < 5; attempt++) {
      const shortCode = generateShortCode();
      const { data, error } = await supabase
        .from("blogs")
        .insert({
          short_code: shortCode,
          title: input.title,
          content: input.content,
          is_good: false,
          likes_count: 0,
          dislikes_count: 0,
          image_url: input.imageUrl ?? null,
          author_id: input.authorId ?? null,
          author_name: input.authorName ?? null,
          status,
          published_at: status === "published" ? now : null,
          tags: input.tags ?? [],
        })
        .select(BLOG_SELECT)
        .single();

      if (!error && data) {
        return mapRowToBlog(data as BlogsRow);
      }

      const errorCode = (error as { code?: unknown } | null)?.code;
      const isUniqueViolation = typeof errorCode === "string" && errorCode === "23505";
      if (!isUniqueViolation) {
        throw new Error(`Supabase createBlog error: ${error?.message ?? "No data"}`);
      }
    }

    throw new Error("Supabase createBlog error: failed to generate unique short code");
  },

  async updateBlog(
    id: string,
    input: { title?: string; content?: string; isGood?: boolean; imageUrl?: string | null; status?: IBlog["status"]; publishedAt?: string | null; tags?: string[] },
  ): Promise<IBlog> {
    const supabase = getSupabaseClient();
    const { data: existing, error: fetchError } = await supabase
      .from("blogs")
      .select("image_url, status, published_at")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw new Error(`Supabase updateBlog fetch error: ${fetchError.message}`);

    const existingRow = existing as { image_url: string | null; status: string | null; published_at: string | null } | null;
    const previousImageUrl = existingRow?.image_url ?? null;
    const existingStatus = existingRow?.status ?? "published";
    const existingPublishedAt = existingRow?.published_at ?? null;

    const now = new Date().toISOString();
    const newStatus = input.status ?? existingStatus;
    const publishedAt =
      input.publishedAt !== undefined
        ? input.publishedAt
        : newStatus === "published" && !existingPublishedAt
          ? now
          : existingPublishedAt;

    const updatePayload: Record<string, unknown> = { updated_at: now };
    if (input.title !== undefined) updatePayload.title = input.title;
    if (input.content !== undefined) updatePayload.content = input.content;
    if (input.isGood !== undefined) updatePayload.is_good = input.isGood;
    if (input.imageUrl !== undefined) updatePayload.image_url = input.imageUrl;
    if (input.status !== undefined) updatePayload.status = newStatus;
    updatePayload.published_at = publishedAt;
    if (input.tags !== undefined) updatePayload.tags = input.tags;

    const { data, error } = await supabase
      .from("blogs")
      .update(updatePayload)
      .eq("id", id)
      .select(BLOG_SELECT)
      .single();

    if (error || !data) throw new Error(`Supabase updateBlog error: ${error?.message ?? "No data"}`);

    if (previousImageUrl) {
      const wantsRemoval = input.imageUrl === null;
      const wantsReplacement =
        input.imageUrl !== undefined && input.imageUrl !== null && input.imageUrl !== previousImageUrl;

      if (wantsRemoval || wantsReplacement) {
        const objectPath = extractStoragePathFromPublicUrl(previousImageUrl);
        if (objectPath) {
          const { error: storageError } = await supabase.storage.from("blog-images").remove([objectPath]);
          if (storageError) throw new Error(`Supabase updateBlog storage error: ${storageError.message}`);
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
      .select(BLOG_SELECT)
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
      const { data, error } = await supabase.from("blogs").select(BLOG_SELECT).eq("id", id).single();
      if (error || !data) throw new Error(`Supabase likeBlog read error: ${error?.message ?? "No data"}`);
      return mapRowToBlog(data as BlogsRow);
    }

    const likesCount = (current.likes_count ?? 0) + 1;
    const dislikesCount = current.is_good
      ? (current.dislikes_count ?? 0)
      : Math.max((current.dislikes_count ?? 0) - 1, 0);

    const { data, error: updateError } = await supabase
      .from("blogs")
      .update({ is_good: true, likes_count: likesCount, dislikes_count: dislikesCount, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(BLOG_SELECT)
      .single();

    if (updateError || !data) throw new Error(`Supabase likeBlog update error: ${updateError?.message ?? "No data"}`);
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
      const { data, error } = await supabase.from("blogs").select(BLOG_SELECT).eq("id", id).single();
      if (error || !data) throw new Error(`Supabase dislikeBlog read error: ${error?.message ?? "No data"}`);
      return mapRowToBlog(data as BlogsRow);
    }

    const dislikesCount = (current.dislikes_count ?? 0) + 1;
    const likesCount = current.is_good
      ? Math.max((current.likes_count ?? 0) - 1, 0)
      : (current.likes_count ?? 0);

    const { data, error: updateError } = await supabase
      .from("blogs")
      .update({ is_good: false, likes_count: likesCount, dislikes_count: dislikesCount, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(BLOG_SELECT)
      .single();

    if (updateError || !data) throw new Error(`Supabase dislikeBlog update error: ${updateError?.message ?? "No data"}`);
    return mapRowToBlog(data as BlogsRow);
  },
};
