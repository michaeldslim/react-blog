export interface IPost {
  id: string;
  title: string;
  content: string;
  isGood: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IPostsRepository {
  getPosts(): Promise<IPost[]>;
  getPostById(id: string): Promise<IPost | undefined>;
  createPost(input: { title: string; content: string }): Promise<IPost>;
  updatePost(id: string, input: { title?: string; content?: string; isGood?: boolean }): Promise<IPost>;
  deletePost(id: string): Promise<boolean>;
  togglePostGood(id: string): Promise<IPost>;
}
