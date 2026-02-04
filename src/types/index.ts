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

export interface IBlogsRepository {
  getBlogs(): Promise<IBlog[]>;
  getBlogById(id: string): Promise<IBlog | undefined>;
  createBlog(input: { title: string; content: string; imageUrl?: string | null }): Promise<IBlog>;
  updateBlog(
    id: string,
    input: { title?: string; content?: string; isGood?: boolean; imageUrl?: string | null },
  ): Promise<IBlog>;
  deleteBlog(id: string): Promise<boolean>;
  toggleBlogGood(id: string): Promise<IBlog>;
}
