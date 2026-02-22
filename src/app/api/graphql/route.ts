import { createSchema, createYoga } from "graphql-yoga";
import type { NextRequest } from "next/server";
import { blogsRepository } from "@/lib/activeBlogsRepository";
import { getToken } from "next-auth/jwt";

const typeDefs = /* GraphQL */ `
  type Blog {
    id: ID!
    title: String!
    content: String!
    isGood: Boolean!
    likesCount: Int!
    dislikesCount: Int!
    imageUrl: String
    createdAt: String!
    updatedAt: String!
  }

  type BlogsPage {
    items: [Blog!]!
    totalCount: Int!
  }

  type Query {
    blogs(page: Int!, pageSize: Int!): BlogsPage!
    blog(id: ID!): Blog
  }

  input CreateBlogInput {
    title: String!
    content: String!
    imageUrl: String
  }

  input UpdateBlogInput {
    title: String
    content: String
    isGood: Boolean
    imageUrl: String
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
  token: Awaited<ReturnType<typeof getToken>> | null;
}

const resolvers = {
  Query: {
    blogs: (_parent: unknown, args: { page: number; pageSize: number }) =>
      blogsRepository.getBlogsPaginated(args.page, args.pageSize),
    blog: (_parent: unknown, args: { id: string }) => blogsRepository.getBlogById(args.id) ?? null,
  },
  Mutation: {
    createBlog: (
      _parent: unknown,
      args: { input: { title: string; content: string; imageUrl?: string | null } },
      context: IGraphqlContext,
    ) => {
      if (!context.token) {
        throw new Error("Unauthorized");
      }
      return blogsRepository.createBlog(args.input);
    },
    updateBlog: (
      _parent: unknown,
      args: {
        id: string;
        input: { title?: string; content?: string; isGood?: boolean; imageUrl?: string | null };
      },
      context: IGraphqlContext,
    ) => {
      if (!context.token) {
        throw new Error("Unauthorized");
      }
      return blogsRepository.updateBlog(args.id, args.input);
    },
    deleteBlog: (_parent: unknown, args: { id: string }, context: IGraphqlContext) => {
      if (!context.token) {
        throw new Error("Unauthorized");
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
  token?: Awaited<ReturnType<typeof getToken>> | null;
}>({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: "/api/graphql",
  context: async ({ req }) => {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    return { req, token };
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
