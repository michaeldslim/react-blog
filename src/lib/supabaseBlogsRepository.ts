import type { IBlog, IBlogsRepository } from "@/types";
import { supabase } from "./supabaseClient";

type BlogsRow = {
  id: string;
  title: string;
  content: string;
  is_good: boolean;
  created_at: string;
  updated_at: string;
};

function mapRowToBlog(row: BlogsRow): IBlog {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    isGood: row.is_good,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const supabaseBlogsRepository: IBlogsRepository = {
  async getBlogs(): Promise<IBlog[]> {
    const { data, error } = await supabase
      .from("blogs")
      .select("id, title, content, is_good, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Supabase getBlogs error: ${error.message}`);
    }

    const rows = (data ?? []) as BlogsRow[];
    return rows.map(mapRowToBlog);
  },

  async getBlogById(id: string): Promise<IBlog | undefined> {
    const { data, error } = await supabase
      .from("blogs")
      .select("id, title, content, is_good, created_at, updated_at")
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

  async createBlog(input: { title: string; content: string }): Promise<IBlog> {
    const { data, error } = await supabase
      .from("blogs")
      .insert({
        title: input.title,
        content: input.content,
      })
      .select("id, title, content, is_good, created_at, updated_at")
      .single();

    if (error || !data) {
      throw new Error(`Supabase createBlog error: ${error?.message ?? "No data"}`);
    }

    return mapRowToBlog(data as BlogsRow);
  },

  async updateBlog(
    id: string,
    input: { title?: string; content?: string; isGood?: boolean },
  ): Promise<IBlog> {
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

    const { data, error } = await supabase
      .from("blogs")
      .update(updatePayload)
      .eq("id", id)
      .select("id, title, content, is_good, created_at, updated_at")
      .single();

    if (error || !data) {
      throw new Error(`Supabase updateBlog error: ${error?.message ?? "No data"}`);
    }

    return mapRowToBlog(data as BlogsRow);
  },

  async deleteBlog(id: string): Promise<boolean> {
    const { error } = await supabase.from("blogs").delete().eq("id", id);

    if (error) {
      throw new Error(`Supabase deleteBlog error: ${error.message}`);
    }

    // Supabase가 에러를 던지지 않았다면 삭제가 시도된 것으로 간주
    return true;
  },

  async toggleBlogGood(id: string): Promise<IBlog> {
    const { data: existing, error: fetchError } = await supabase
      .from("blogs")
      .select("is_good")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      throw new Error(
        `Supabase toggleBlogGood fetch error: ${fetchError?.message ?? "No data"}`,
      );
    }

    const current = existing as { is_good: boolean };
    const newIsGood = !current.is_good;

    const { data, error: updateError } = await supabase
      .from("blogs")
      .update({
        is_good: newIsGood,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, title, content, is_good, created_at, updated_at")
      .single();

    if (updateError || !data) {
      throw new Error(
        `Supabase toggleBlogGood update error: ${updateError?.message ?? "No data"}`,
      );
    }
    return mapRowToBlog(data as BlogsRow);
  },
};
