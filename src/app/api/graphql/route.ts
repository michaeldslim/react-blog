import { createSchema, createYoga } from "graphql-yoga";
import type { NextRequest } from "next/server";
import { postsRepository } from "@/lib/activePostsRepository";

const typeDefs = /* GraphQL */ `
  type Post {
    id: ID!
    title: String!
    content: String!
    isGood: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    posts: [Post!]!
    post(id: ID!): Post
  }

  input CreatePostInput {
    title: String!
    content: String!
  }

  input UpdatePostInput {
    title: String
    content: String
    isGood: Boolean
  }

  type Mutation {
    createPost(input: CreatePostInput!): Post!
    updatePost(id: ID!, input: UpdatePostInput!): Post!
    deletePost(id: ID!): Boolean!
    togglePostGood(id: ID!): Post!
  }
`;

const resolvers = {
  Query: {
    posts: () => postsRepository.getPosts(),
    post: (_parent: unknown, args: { id: string }) => postsRepository.getPostById(args.id) ?? null,
  },
  Mutation: {
    createPost: (_parent: unknown, args: { input: { title: string; content: string } }) =>
      postsRepository.createPost(args.input),
    updatePost: (
      _parent: unknown,
      args: { id: string; input: { title?: string; content?: string; isGood?: boolean } },
    ) => postsRepository.updatePost(args.id, args.input),
    deletePost: (_parent: unknown, args: { id: string }) => postsRepository.deletePost(args.id),
    togglePostGood: (_parent: unknown, args: { id: string }) =>
      postsRepository.togglePostGood(args.id),
  },
};

const { handleRequest } = createYoga<{
  req: NextRequest;
}>({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: "/api/graphql",
});

export { handleRequest as GET, handleRequest as POST };

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
