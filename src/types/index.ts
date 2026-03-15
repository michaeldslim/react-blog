export type BlogStatus = "draft" | "published" | "scheduled";

export interface IBlogViewerOptions {
  viewerUserId?: string | null;
  isAdmin?: boolean;
  query?: string;
  tag?: string;
}

export interface IBlog {
  id: string;
  shortCode: string;
  title: string;
  content: string;
  isGood: boolean;
  likesCount: number;
  dislikesCount: number;
  imageUrl: string | null;
  authorId: string | null;
  authorName: string | null;
  status: BlogStatus;
  publishedAt: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface IBlogsPage {
  items: IBlog[];
  totalCount: number;
}

export interface IBlogsRepository {
  getBlogs(options?: IBlogViewerOptions): Promise<IBlog[]>;
  getBlogsPaginated(page: number, pageSize: number, options?: IBlogViewerOptions): Promise<IBlogsPage>;
  getBlogById(id: string): Promise<IBlog | undefined>;
  getBlogByShortCode(shortCode: string): Promise<IBlog | undefined>;
  getBlogDates(): Promise<{ date: string; count: number }[]>;
  createBlog(input: { title: string; content: string; imageUrl?: string | null; authorId?: string | null; authorName?: string | null; status?: BlogStatus; tags?: string[] }): Promise<IBlog>;
  updateBlog(
    id: string,
    input: { title?: string; content?: string; isGood?: boolean; imageUrl?: string | null; status?: BlogStatus; publishedAt?: string | null; tags?: string[] },
  ): Promise<IBlog>;
  deleteBlog(id: string): Promise<boolean>;
  toggleBlogGood(id: string): Promise<IBlog>;
  likeBlog(id: string): Promise<IBlog>;
  dislikeBlog(id: string): Promise<IBlog>;
}

export type ThemeName = "dark-teal" | "dark-green" | "light-neutral";
