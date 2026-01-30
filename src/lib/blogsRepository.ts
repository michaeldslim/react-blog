import type { IBlog, IBlogsRepository } from "@/types";

let blogs: IBlog[] = [
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

export const blogsRepository: IBlogsRepository = {
  async getBlogs(): Promise<IBlog[]> {
    return blogs.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  async getBlogById(id: string): Promise<IBlog | undefined> {
    return blogs.find((blog) => blog.id === id);
  },

  async createBlog(input: { title: string; content: string }): Promise<IBlog> {
    const now = new Date().toISOString();
    const newBlog: IBlog = {
      id: generateId(),
      title: input.title,
      content: input.content,
      isGood: true,
      createdAt: now,
      updatedAt: now,
    };

    blogs = [newBlog, ...blogs];
    return newBlog;
  },

  async updateBlog(id: string, input: { title?: string; content?: string; isGood?: boolean }): Promise<IBlog> {
    const existing = blogs.find((blog) => blog.id === id);
    if (!existing) {
      throw new Error("Blog not found");
    }

    const updated: IBlog = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    };

    blogs = blogs.map((blog) => (blog.id === id ? updated : blog));
    return updated;
  },

  async deleteBlog(id: string): Promise<boolean> {
    const before = blogs.length;
    blogs = blogs.filter((blog) => blog.id !== id);
    return blogs.length < before;
  },

  async toggleBlogGood(id: string): Promise<IBlog> {
    const existing = blogs.find((blog) => blog.id === id);
    if (!existing) {
      throw new Error("Blog not found");
    }

    const updated: IBlog = {
      ...existing,
      isGood: !existing.isGood,
      updatedAt: new Date().toISOString(),
    };

    blogs = blogs.map((blog) => (blog.id === id ? updated : blog));
    return updated;
  },
};
