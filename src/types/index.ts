export interface IBlog {
  id: string;
  title: string;
  content: string;
  isGood: boolean;
  likesCount: number;
  dislikesCount: number;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IBlogsPage {
  items: IBlog[];
  totalCount: number;
}

export interface IBlogsRepository {
  getBlogs(): Promise<IBlog[]>;
  getBlogsPaginated(page: number, pageSize: number): Promise<IBlogsPage>;
  getBlogById(id: string): Promise<IBlog | undefined>;
  createBlog(input: { title: string; content: string; imageUrl?: string | null }): Promise<IBlog>;
  updateBlog(
    id: string,
    input: { title?: string; content?: string; isGood?: boolean; imageUrl?: string | null },
  ): Promise<IBlog>;
  deleteBlog(id: string): Promise<boolean>;
  toggleBlogGood(id: string): Promise<IBlog>;
  likeBlog(id: string): Promise<IBlog>;
  dislikeBlog(id: string): Promise<IBlog>;
}

export type ThemeName = "dark-teal" | "dark-green" | "light-neutral";
