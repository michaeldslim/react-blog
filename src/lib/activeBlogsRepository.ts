import type { IBlogsRepository } from "@/types";
import { blogsRepository as memoryBlogsRepository } from "./blogsRepository";
import { supabaseBlogsRepository } from "./supabaseBlogsRepository";

const backend = process.env.BLOGS_REPOSITORY ?? "memory";

export const blogsRepository: IBlogsRepository =
  backend === "supabase" ? supabaseBlogsRepository : memoryBlogsRepository;
