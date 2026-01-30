"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { IPost } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const GET_POSTS = `
  query GetPosts {
    posts {
      id
      title
      content
      isGood
      createdAt
      updatedAt
    }
  }
`;

const CREATE_POST = `
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
    }
  }
`;

const UPDATE_POST = `
  mutation UpdatePost($id: ID!, $input: UpdatePostInput!) {
    updatePost(id: $id, input: $input) {
      id
      title
      content
      isGood
      updatedAt
    }
  }
`;

const DELETE_POST = `
  mutation DeletePost($id: ID!) {
    deletePost(id: $id)
  }
`;

const TOGGLE_POST_GOOD = `
  mutation TogglePostGood($id: ID!) {
    togglePostGood(id: $id) {
      id
      isGood
      updatedAt
    }
  }
`;

interface IEditablePostState {
  id: string;
  title: string;
  content: string;
}

interface IGraphqlError {
  message: string;
}

interface IGraphqlResponse<TData> {
  data?: TData;
  errors?: IGraphqlError[];
}

async function graphqlRequest<TData, TVariables = Record<string, unknown>>(
  query: string,
  variables?: TVariables,
): Promise<TData> {
  const response = await fetch("/api/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed with status ${response.status}`);
  }

  const json = (await response.json()) as IGraphqlResponse<TData>;

  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors.map((error) => error.message).join(", "));
  }

  if (!json.data) {
    throw new Error("GraphQL response missing data.");
  }

  return json.data;
}

export default function HomePage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["posts"],
    queryFn: () => graphqlRequest<{ posts: IPost[] }>(GET_POSTS),
  });

  const posts = data?.posts ?? [];

  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");

  const [editingPost, setEditingPost] = useState<IEditablePostState | null>(null);
  const [updating, setUpdating] = useState(false);

  const createPostMutation = useMutation({
    mutationFn: (variables: { title: string; content: string }) =>
      graphqlRequest<
        { createPost: { id: string } },
        { input: { title: string; content: string } }
      >(CREATE_POST, {
        input: variables,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: (variables: { id: string; title: string; content: string }) =>
      graphqlRequest<
        { updatePost: IPost },
        { id: string; input: { title: string; content: string } }
      >(UPDATE_POST, {
        id: variables.id,
        input: {
          title: variables.title,
          content: variables.content,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (variables: { id: string }) =>
      graphqlRequest<{ deletePost: boolean }, { id: string }>(DELETE_POST, {
        id: variables.id,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const togglePostGoodMutation = useMutation({
    mutationFn: (variables: { id: string }) =>
      graphqlRequest<{ togglePostGood: { id: string } }, { id: string }>(
        TOGGLE_POST_GOOD,
        {
          id: variables.id,
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  async function handleCreatePost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!createTitle.trim() || !createContent.trim()) {
      toast.error("Title and content are required.");
      return;
    }

    try {
      await createPostMutation.mutateAsync({
        title: createTitle.trim(),
        content: createContent.trim(),
      });

      setCreateTitle("");
      setCreateContent("");
      toast.success("Post created.");
    } catch (mutationError) {
      console.error(mutationError);
      toast.error("Failed to create post.");
    }
  }

  async function handleToggleGood(id: string) {
    try {
      await togglePostGoodMutation.mutateAsync({ id });
    } catch (mutationError) {
      console.error(mutationError);
      toast.error("Failed to toggle good/bad.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this post? This cannot be undone.")) {
      return;
    }

    try {
      await deletePostMutation.mutateAsync({ id });

      toast.success("Post deleted.");
    } catch (mutationError) {
      console.error(mutationError);
      toast.error("Failed to delete post.");
    }
  }

  function openEditDialog(post: IPost) {
    setEditingPost({
      id: post.id,
      title: post.title,
      content: post.content,
    });
  }

  async function handleSaveEdit() {
    if (!editingPost) return;

    if (!editingPost.title.trim() || !editingPost.content.trim()) {
      toast.error("Title and content are required.");
      return;
    }

    try {
      setUpdating(true);

      await updatePostMutation.mutateAsync({
        id: editingPost.id,
        title: editingPost.title.trim(),
        content: editingPost.content.trim(),
      });

      toast.success("Post updated.");
      setEditingPost(null);
    } catch (mutationError) {
      console.error(mutationError);
      toast.error("Failed to update post.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">React Blog</h1>
            <p className="text-muted-foreground text-sm">
              Local Next.js blog with GraphQL. Create, edit, delete, and mark posts as good or bad.
            </p>
          </div>
        </header>

        <section aria-label="Create post">
          <Card>
            <CardHeader>
              <CardTitle>New post</CardTitle>
              <CardDescription>Write something and publish it to the list below.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input
                placeholder="Title"
                value={createTitle}
                onChange={(event) => setCreateTitle(event.target.value)}
              />
              <Textarea
                placeholder="Content"
                value={createContent}
                onChange={(event) => setCreateContent(event.target.value)}
                rows={4}
              />
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button
                type="submit"
                size="sm"
                onClick={(event) => {
                  // Wrap in a fake form submission for reuse of handler.
                  handleCreatePost(event as unknown as React.FormEvent<HTMLFormElement>);
                }}
              >
                Create post
              </Button>
            </CardFooter>
          </Card>
        </section>

        <section aria-label="Posts list" className="flex-1 space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading posts...</p>}
          {error && (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : "Failed to load posts."}
            </p>
          )}

          {!isLoading && !error && posts.length === 0 && (
            <p className="text-sm text-muted-foreground">No posts yet. Create your first one above.</p>
          )}

          <div className="space-y-4">
            {posts.map((post: IPost) => {
              const createdLabel = new Date(post.createdAt).toLocaleString();
              const updatedLabel = new Date(post.updatedAt).toLocaleString();

              return (
                <Card key={post.id} className="border-border/70">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle>{post.title}</CardTitle>
                      <CardDescription>
                        <span className="text-xs text-muted-foreground">
                          Created: {createdLabel}
                        </span>
                        {post.updatedAt !== post.createdAt && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            Updated: {updatedLabel}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <CardAction className="flex items-center gap-2">
                      <Badge variant={post.isGood ? "default" : "destructive"}>
                        {post.isGood ? "Good" : "Bad"}
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>
                  </CardContent>
                  <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Mark as good</span>
                      <Switch
                        size="sm"
                        checked={post.isGood}
                        onCheckedChange={() => handleToggleGood(post.id)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => openEditDialog(post)}
                        disabled={updating || updatePostMutation.isPending}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => handleDelete(post.id)}
                        disabled={deletePostMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </section>

        <Dialog
          open={editingPost !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditingPost(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit post</DialogTitle>
            </DialogHeader>
            {editingPost && (
              <div className="space-y-4 pt-2">
                <Input
                  value={editingPost.title}
                  onChange={(event) =>
                    setEditingPost((current) =>
                      current
                        ? {
                            ...current,
                            title: event.target.value,
                          }
                        : current,
                    )
                  }
                />
                <Textarea
                  rows={4}
                  value={editingPost.content}
                  onChange={(event) =>
                    setEditingPost((current) =>
                      current
                        ? {
                            ...current,
                            content: event.target.value,
                          }
                        : current,
                    )
                  }
                />
              </div>
            )}
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingPost(null)}
              >
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleSaveEdit} disabled={updating}>
                {updating ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
