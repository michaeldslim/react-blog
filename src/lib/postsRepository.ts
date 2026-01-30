import type { IPost, IPostsRepository } from "@/types";

let posts: IPost[] = [
  {
    id: "1",
    title: "Welcome to your React Blog",
    content: "This is your first post. You can create, edit, delete, and toggle good/bad.",
    isGood: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Second Post",
    content: "Use this project to experiment with GraphQL and Firebase later on.",
    isGood: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export const postsRepository: IPostsRepository = {
  async getPosts(): Promise<IPost[]> {
    return posts.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  async getPostById(id: string): Promise<IPost | undefined> {
    return posts.find((post) => post.id === id);
  },

  async createPost(input: { title: string; content: string }): Promise<IPost> {
    const now = new Date().toISOString();
    const newPost: IPost = {
      id: generateId(),
      title: input.title,
      content: input.content,
      isGood: true,
      createdAt: now,
      updatedAt: now,
    };

    posts = [newPost, ...posts];
    return newPost;
  },

  async updatePost(id: string, input: { title?: string; content?: string; isGood?: boolean }): Promise<IPost> {
    const existing = posts.find((post) => post.id === id);
    if (!existing) {
      throw new Error("Post not found");
    }

    const updated: IPost = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    };

    posts = posts.map((post) => (post.id === id ? updated : post));
    return updated;
  },

  async deletePost(id: string): Promise<boolean> {
    const before = posts.length;
    posts = posts.filter((post) => post.id !== id);
    return posts.length < before;
  },

  async togglePostGood(id: string): Promise<IPost> {
    const existing = posts.find((post) => post.id === id);
    if (!existing) {
      throw new Error("Post not found");
    }

    const updated: IPost = {
      ...existing,
      isGood: !existing.isGood,
      updatedAt: new Date().toISOString(),
    };

    posts = posts.map((post) => (post.id === id ? updated : post));
    return updated;
  },
};
