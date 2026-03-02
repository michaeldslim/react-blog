import type { IBlog, IBlogViewerOptions, IBlogsPage, IBlogsRepository } from "@/types";

const SEED_DATE = new Date().toISOString();

let blogs: IBlog[] = [
  {
    id: "1",
    title: "Welcome to your React Blog",
    content: "This is your first post. You can create, edit, delete, and toggle good/bad.",
    isGood: true,
    likesCount: 12,
    dislikesCount: 0,
    imageUrl: null,
    authorId: null,
    authorName: null,
    status: "published",
    publishedAt: SEED_DATE,
    tags: ["react", "intro"],
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
  {
    id: "2",
    title: "Second Post",
    content: "Use this project to experiment with GraphQL and Firebase later on.",
    isGood: false,
    likesCount: 0,
    dislikesCount: 0,
    imageUrl: null,
    authorId: null,
    authorName: null,
    status: "published",
    publishedAt: SEED_DATE,
    tags: ["graphql"],
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  },
];

function matchesTag(blog: IBlog, tag?: string): boolean {
  if (!tag?.trim()) return true;
  return blog.tags.includes(tag.trim().toLowerCase());
}

function matchesQuery(blog: IBlog, query?: string): boolean {
  if (!query?.trim()) return true;
  const q = query.trim().toLowerCase();
  return blog.title.toLowerCase().includes(q) || blog.content.toLowerCase().includes(q);
}

function isVisible(blog: IBlog, options?: IBlogViewerOptions): boolean {
  if (options?.isAdmin) return true;
  if (blog.status === "published") return true;
  if (options?.viewerUserId && blog.authorId === options.viewerUserId) return true;
  return false;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export const blogsRepository: IBlogsRepository = {
  async getBlogs(options?: IBlogViewerOptions): Promise<IBlog[]> {
    return blogs
      .filter((b) => isVisible(b, options) && matchesQuery(b, options?.query) && matchesTag(b, options?.tag))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  async getBlogsPaginated(page: number, pageSize: number, options?: IBlogViewerOptions): Promise<IBlogsPage> {
    const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
    const safePageSize = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 1;

    const sorted = blogs
      .filter((b) => isVisible(b, options) && matchesQuery(b, options?.query) && matchesTag(b, options?.tag))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const totalCount = sorted.length;
    const start = (safePage - 1) * safePageSize;
    const end = start + safePageSize;
    const items = sorted.slice(start, end);

    return {
      items,
      totalCount,
    };
  },

  async getBlogById(id: string): Promise<IBlog | undefined> {
    return blogs.find((blog) => blog.id === id);
  },

  async getBlogDates(): Promise<{ date: string; count: number }[]> {
    const dateCounts = new Map<string, number>();
    
    blogs.filter((b) => b.status === "published").forEach((blog) => {
      const date = blog.createdAt.split('T')[0];
      dateCounts.set(date, (dateCounts.get(date) || 0) + 1);
    });

    return Array.from(dateCounts.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  },

  async createBlog(input: { title: string; content: string; imageUrl?: string | null; authorId?: string | null; authorName?: string | null; status?: import("@/types").BlogStatus; tags?: string[] }): Promise<IBlog> {
    const now = new Date().toISOString();
    const status = input.status ?? "published";
    const newBlog: IBlog = {
      id: generateId(),
      title: input.title,
      content: input.content,
      isGood: false,
      likesCount: 0,
      dislikesCount: 0,
      imageUrl: input.imageUrl ?? null,
      authorId: input.authorId ?? null,
      authorName: input.authorName ?? null,
      status,
      publishedAt: status === "published" ? now : null,
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };

    blogs = [newBlog, ...blogs];
    return newBlog;
  },

  async updateBlog(
    id: string,
    input: { title?: string; content?: string; isGood?: boolean; imageUrl?: string | null; status?: import("@/types").BlogStatus; publishedAt?: string | null; tags?: string[] },
  ): Promise<IBlog> {
    const existing = blogs.find((blog) => blog.id === id);
    if (!existing) {
      throw new Error("Blog not found");
    }

    const now = new Date().toISOString();
    const newStatus = input.status ?? existing.status;
    const publishedAt =
      input.publishedAt !== undefined
        ? input.publishedAt
        : newStatus === "published" && !existing.publishedAt
          ? now
          : existing.publishedAt;

    const updated: IBlog = {
      ...existing,
      ...(input.title !== undefined && { title: input.title }),
      ...(input.content !== undefined && { content: input.content }),
      ...(input.isGood !== undefined && { isGood: input.isGood }),
      ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
      ...(input.tags !== undefined && { tags: input.tags }),
      status: newStatus,
      publishedAt,
      updatedAt: now,
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

    let likesCount = existing.likesCount ?? 0;
    let dislikesCount = existing.dislikesCount ?? 0;

    if (!existing.isGood) {
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

    const updated: IBlog = {
      ...existing,
      isGood: !existing.isGood,
      likesCount,
      dislikesCount,
      updatedAt: new Date().toISOString(),
    };

    blogs = blogs.map((blog) => (blog.id === id ? updated : blog));
    return updated;
  },

  async likeBlog(id: string): Promise<IBlog> {
    const existing = blogs.find((blog) => blog.id === id);
    if (!existing) {
      throw new Error("Blog not found");
    }

    if (existing.isGood) {
      return existing;
    }

    const updated: IBlog = {
      ...existing,
      isGood: true,
      likesCount: (existing.likesCount ?? 0) + 1,
      dislikesCount: existing.isGood ? (existing.dislikesCount ?? 0) : Math.max((existing.dislikesCount ?? 0) - 1, 0),
      updatedAt: new Date().toISOString(),
    };

    blogs = blogs.map((blog) => (blog.id === id ? updated : blog));
    return updated;
  },

  async dislikeBlog(id: string): Promise<IBlog> {
    const existing = blogs.find((blog) => blog.id === id);
    if (!existing) {
      throw new Error("Blog not found");
    }

    if (!existing.isGood) {
      return existing;
    }

    const updated: IBlog = {
      ...existing,
      isGood: false,
      dislikesCount: (existing.dislikesCount ?? 0) + 1,
      likesCount: existing.isGood ? Math.max((existing.likesCount ?? 0) - 1, 0) : (existing.likesCount ?? 0),
      updatedAt: new Date().toISOString(),
    };

    blogs = blogs.map((blog) => (blog.id === id ? updated : blog));
    return updated;
  },
};
