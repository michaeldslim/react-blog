export interface IBlog {
  id: string;
  title: string;
  content: string;
  isGood: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IBlogsRepository {
  getBlogs(): Promise<IBlog[]>;
  getBlogById(id: string): Promise<IBlog | undefined>;
  createBlog(input: { title: string; content: string }): Promise<IBlog>;
  updateBlog(id: string, input: { title?: string; content?: string; isGood?: boolean }): Promise<IBlog>;
  deleteBlog(id: string): Promise<boolean>;
  toggleBlogGood(id: string): Promise<IBlog>;
}
