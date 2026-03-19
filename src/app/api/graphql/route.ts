import { createSchema, createYoga } from "graphql-yoga";
import type { NextRequest } from "next/server";
import { blogsRepository } from "@/lib/activeBlogsRepository";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  BLOGS_CACHE_TAG,
  getPublicBlogByIdCached,
  getPublicBlogDatesCached,
  getPublicBlogsPageCached,
} from "@/lib/blogsCache";

const typeDefs = /* GraphQL */ `
  type Blog {
    id: ID!
    shortCode: String!
    title: String!
    content: String!
    isGood: Boolean!
    likesCount: Int!
    dislikesCount: Int!
    imageUrl: String
    authorId: String
    authorName: String
    status: String!
    publishedAt: String
    tags: [String!]!
    createdAt: String!
    updatedAt: String!
  }

  type BlogsPage {
    items: [Blog!]!
    totalCount: Int!
  }

  type BlogDateCount {
    date: String!
    count: Int!
  }

  type Query {
    blogs(page: Int!, pageSize: Int!, query: String, tag: String): BlogsPage!
    blog(id: ID!): Blog
    blogDates: [BlogDateCount!]!
  }

  input CreateBlogInput {
    title: String!
    content: String!
    imageUrl: String
    status: String
    tags: [String]
  }

  input UpdateBlogInput {
    title: String
    content: String
    isGood: Boolean
    imageUrl: String
    status: String
    tags: [String]
  }

  type Mutation {
    createBlog(input: CreateBlogInput!): Blog!
    updateBlog(id: ID!, input: UpdateBlogInput!): Blog!
    deleteBlog(id: ID!): Boolean!
    toggleBlogGood(id: ID!): Blog!
    likeBlog(id: ID!): Blog!
    dislikeBlog(id: ID!): Blog!
  }
`;

interface IGraphqlContext {
  req: NextRequest;
  token: JWT | null;
}

const resolvers = {
  Query: {
    blogs: (
      _parent: unknown,
      args: { page: number; pageSize: number; query?: string | null; tag?: string | null },
      context: IGraphqlContext,
    ) => {
      const isAnonymousPublicViewer = !context.token?.sub && !context.token?.isAdmin;
      if (isAnonymousPublicViewer) {
        return getPublicBlogsPageCached(args.page, args.pageSize, args.query ?? null, args.tag ?? null);
      }

      return blogsRepository.getBlogsPaginated(args.page, args.pageSize, {
        viewerUserId: context.token?.sub ?? null,
        isAdmin: context.token?.isAdmin ?? false,
        query: args.query ?? undefined,
        tag: args.tag ?? undefined,
      });
    },
    blog: async (_parent: unknown, args: { id: string }, context: IGraphqlContext) => {
      const isAnonymousPublicViewer = !context.token?.sub && !context.token?.isAdmin;
      if (isAnonymousPublicViewer) {
        return getPublicBlogByIdCached(args.id);
      }
      return blogsRepository.getBlogById(args.id) ?? null;
    },
    blogDates: (_parent: unknown, _args: unknown, context: IGraphqlContext) => {
      const isAnonymousPublicViewer = !context.token?.sub && !context.token?.isAdmin;
      if (isAnonymousPublicViewer) {
        return getPublicBlogDatesCached();
      }
      return blogsRepository.getBlogDates();
    },
  },
  Mutation: {
    createBlog: async (
      _parent: unknown,
      args: { input: { title: string; content: string; imageUrl?: string | null; status?: string | null; tags?: string[] | null } },
      context: IGraphqlContext,
    ) => {
      if (!context.token) {
        throw new Error("Unauthorized: sign in to create a post");
      }
      const created = await blogsRepository.createBlog({
        ...args.input,
        authorId: context.token.sub ?? null,
        authorName: (context.token.name as string | undefined) ?? null,
        status: (args.input.status as import("@/types").BlogStatus | undefined) ?? "published",
        tags: (args.input.tags?.filter(Boolean) as string[]) ?? [],
      });

      revalidateTag(BLOGS_CACHE_TAG);
      revalidatePath("/");
      revalidatePath(`/blog/${created.id}`);

      return created;
    },
    updateBlog: async (
      _parent: unknown,
      args: {
        id: string;
        input: { title?: string; content?: string; isGood?: boolean; imageUrl?: string | null; status?: string | null; tags?: string[] | null };
      },
      context: IGraphqlContext,
    ) => {
      if (!context.token) {
        throw new Error("Unauthorized: sign in to edit a post");
      }
      const blog = await blogsRepository.getBlogById(args.id);
      if (!blog) throw new Error("Blog not found");
      if (!context.token.isAdmin && blog.authorId !== context.token.sub) {
        throw new Error("Forbidden: you can only edit your own posts");
      }
      const updated = await blogsRepository.updateBlog(args.id, {
        ...args.input,
        status: (args.input.status as import("@/types").BlogStatus | undefined),
        tags: args.input.tags ? (args.input.tags.filter(Boolean) as string[]) : undefined,
      });

      revalidateTag(BLOGS_CACHE_TAG);
      revalidatePath("/");
      revalidatePath(`/blog/${args.id}`);

      return updated;
    },
    deleteBlog: async (_parent: unknown, args: { id: string }, context: IGraphqlContext) => {
      if (!context.token) {
        throw new Error("Unauthorized: sign in to delete a post");
      }
      const blog = await blogsRepository.getBlogById(args.id);
      if (!blog) throw new Error("Blog not found");
      if (!context.token.isAdmin && blog.authorId !== context.token.sub) {
        throw new Error("Forbidden: you can only delete your own posts");
      }
      const deleted = await blogsRepository.deleteBlog(args.id);

      revalidateTag(BLOGS_CACHE_TAG);
      revalidatePath("/");
      revalidatePath(`/blog/${args.id}`);

      return deleted;
    },
    toggleBlogGood: (_parent: unknown, args: { id: string }) =>
      blogsRepository.toggleBlogGood(args.id),
    likeBlog: (_parent: unknown, args: { id: string }) => blogsRepository.likeBlog(args.id),
    dislikeBlog: (_parent: unknown, args: { id: string }) => blogsRepository.dislikeBlog(args.id),
  },
};

const { handleRequest } = createYoga<{
  req: NextRequest;
  token?: JWT | null;
}>({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: "/api/graphql",
  context: async ({ req }) => {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    return { req, token: (token as JWT | null) };
  },
});

export function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> },
) {
  void context;
  return handleRequest(request, { req: request });
}

export function POST(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> },
) {
  void context;
  return handleRequest(request, { req: request });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
