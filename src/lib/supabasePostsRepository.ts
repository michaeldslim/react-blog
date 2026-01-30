import type { IPost, IPostsRepository } from "@/types";

export const supabasePostsRepository: IPostsRepository = {
  async getPosts(): Promise<IPost[]> {
    throw new Error("Supabase posts repository getPosts is not implemented yet.");
  },

  async getPostById(id: string): Promise<IPost | undefined> {
    throw new Error(
      `Supabase posts repository getPostById is not implemented yet. id: ${id}`,
    );
  },

  async createPost(input: { title: string; content: string }): Promise<IPost> {
    throw new Error(
      `Supabase posts repository createPost is not implemented yet. title: ${input.title}`,
    );
  },

  async updatePost(
    id: string,
    input: { title?: string; content?: string; isGood?: boolean },
  ): Promise<IPost> {
    throw new Error(
      `Supabase posts repository updatePost is not implemented yet. id: ${id}`,
    );
  },

  async deletePost(id: string): Promise<boolean> {
    throw new Error(
      `Supabase posts repository deletePost is not implemented yet. id: ${id}`,
    );
  },

  async togglePostGood(id: string): Promise<IPost> {
    throw new Error(
      `Supabase posts repository togglePostGood is not implemented yet. id: ${id}`,
    );
  },
};
