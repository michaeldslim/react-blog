import { createSchema, createYoga } from "graphql-yoga";
import type { NextRequest } from "next/server";
import { blogsRepository } from "@/lib/activeBlogsRepository";

const typeDefs = /* GraphQL */ `
  type Blog {
    id: ID!
    title: String!
    content: String!
    isGood: Boolean!
    likesCount: Int!
    dislikesCount: Int!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    blogs: [Blog!]!
    blog(id: ID!): Blog
  }

  input CreateBlogInput {
    title: String!
    content: String!
  }

  input UpdateBlogInput {
    title: String
    content: String
    isGood: Boolean
  }

  type Mutation {
    createBlog(input: CreateBlogInput!): Blog!
    updateBlog(id: ID!, input: UpdateBlogInput!): Blog!
    deleteBlog(id: ID!): Boolean!
    toggleBlogGood(id: ID!): Blog!
  }
`;

const resolvers = {
  Query: {
    blogs: () => blogsRepository.getBlogs(),
    blog: (_parent: unknown, args: { id: string }) => blogsRepository.getBlogById(args.id) ?? null,
  },
  Mutation: {
    createBlog: (_parent: unknown, args: { input: { title: string; content: string } }) =>
      blogsRepository.createBlog(args.input),
    updateBlog: (
      _parent: unknown,
      args: { id: string; input: { title?: string; content?: string; isGood?: boolean } },
    ) => blogsRepository.updateBlog(args.id, args.input),
    deleteBlog: (_parent: unknown, args: { id: string }) => blogsRepository.deleteBlog(args.id),
    toggleBlogGood: (_parent: unknown, args: { id: string }) =>
      blogsRepository.toggleBlogGood(args.id),
  },
};

const { handleRequest } = createYoga<{
  req: NextRequest;
}>({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: "/api/graphql",
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
