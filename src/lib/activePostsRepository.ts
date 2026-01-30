import type { IPostsRepository } from "@/types";
import { postsRepository as memoryPostsRepository } from "./postsRepository";
import { supabasePostsRepository } from "./supabasePostsRepository";

const backend = process.env.POSTS_REPOSITORY ?? "memory";

export const postsRepository: IPostsRepository =
  backend === "supabase" ? supabasePostsRepository : memoryPostsRepository;
