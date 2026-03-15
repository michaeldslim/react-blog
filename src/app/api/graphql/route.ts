import { createSchema, createYoga } from "graphql-yoga";
import type { NextRequest } from "next/server";
import { blogsRepository } from "@/lib/activeBlogsRepository";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";

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
    blogs: (_parent: unknown, args: { page: number; pageSize: number; query?: string | null; tag?: string | null }, context: IGraphqlContext) =>
      blogsRepository.getBlogsPaginated(args.page, args.pageSize, {
        viewerUserId: context.token?.sub ?? null,
        isAdmin: context.token?.isAdmin ?? false,
        query: args.query ?? undefined,
        tag: args.tag ?? undefined,
      }),
    blog: (_parent: unknown, args: { id: string }) => blogsRepository.getBlogById(args.id) ?? null,
    blogDates: () => blogsRepository.getBlogDates(),
  },
  Mutation: {
    createBlog: (
      _parent: unknown,
      args: { input: { title: string; content: string; imageUrl?: string | null; status?: string | null; tags?: string[] | null } },
      context: IGraphqlContext,
    ) => {
      if (!context.token) {
        throw new Error("Unauthorized: sign in to create a post");
      }
      return blogsRepository.createBlog({
        ...args.input,
        authorId: context.token.sub ?? null,
        authorName: (context.token.name as string | undefined) ?? null,
        status: (args.input.status as import("@/types").BlogStatus | undefined) ?? "published",
        tags: (args.input.tags?.filter(Boolean) as string[]) ?? [],
      });
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
      return blogsRepository.updateBlog(args.id, {
        ...args.input,
        status: (args.input.status as import("@/types").BlogStatus | undefined),
        tags: args.input.tags ? (args.input.tags.filter(Boolean) as string[]) : undefined,
      });
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
      return blogsRepository.deleteBlog(args.id);
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
