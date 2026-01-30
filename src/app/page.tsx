"use client";

import { useEffect, useState } from "react";
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
  const [posts, setPosts] = useState<IPost[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingPost, setEditingPost] = useState<IEditablePostState | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void loadPosts();
  }, []);

  async function loadPosts() {
    try {
      setLoading(true);
      setError(null);

      const data = await graphqlRequest<{ posts: IPost[] }>(GET_POSTS);
      setPosts(data.posts);
    } catch (requestError) {
      console.error(requestError);
      setError("Failed to load posts.");
      toast.error("Failed to load posts.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!createTitle.trim() || !createContent.trim()) {
      toast.error("Title and content are required.");
      return;
    }

    try {
      setCreating(true);

      await graphqlRequest<
        { createPost: { id: string } },
        { input: { title: string; content: string } }
      >(CREATE_POST, {
        input: {
          title: createTitle.trim(),
          content: createContent.trim(),
        },
      });

      setCreateTitle("");
      setCreateContent("");
      toast.success("Post created.");
      await loadPosts();
    } catch (mutationError) {
      console.error(mutationError);
      toast.error("Failed to create post.");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleGood(id: string) {
    try {
      await graphqlRequest<{ togglePostGood: { id: string } }, { id: string }>(TOGGLE_POST_GOOD, {
        id,
      });

      await loadPosts();
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
      setDeleting(true);

      await graphqlRequest<{ deletePost: boolean }, { id: string }>(DELETE_POST, {
        id,
      });

      toast.success("Post deleted.");
      await loadPosts();
    } catch (mutationError) {
      console.error(mutationError);
      toast.error("Failed to delete post.");
    } finally {
      setDeleting(false);
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

      await graphqlRequest<
        { updatePost: IPost },
        { id: string; input: { title: string; content: string } }
      >(UPDATE_POST, {
        id: editingPost.id,
        input: {
          title: editingPost.title.trim(),
          content: editingPost.content.trim(),
        },
      });

      toast.success("Post updated.");
      setEditingPost(null);
      await loadPosts();
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
                disabled={creating}
              />
              <Textarea
                placeholder="Content"
                value={createContent}
                onChange={(event) => setCreateContent(event.target.value)}
                rows={4}
                disabled={creating}
              />
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={creating}
                onClick={(event) => {
                  // Wrap in a fake form submission for reuse of handler.
                  handleCreatePost(event as unknown as React.FormEvent<HTMLFormElement>);
                }}
              >
                {creating ? "Creating..." : "Create post"}
              </Button>
            </CardFooter>
          </Card>
        </section>

        <section aria-label="Posts list" className="flex-1 space-y-4">
          {loading && <p className="text-sm text-muted-foreground">Loading posts...</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {!loading && !error && posts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No posts yet. Create your first one above.
            </p>
          )}

          <div className="space-y-4">
            {posts.map((post) => {
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
                        disabled={updating}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => handleDelete(post.id)}
                        disabled={deleting}
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
