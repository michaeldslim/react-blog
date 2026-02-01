"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";

import type { IBlog } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const GET_BLOGS = `
  query GetBlogs {
    blogs {
      id
      title
      content
      isGood
      likesCount
      dislikesCount
      createdAt
      updatedAt
    }
  }
`;

const CREATE_BLOG = `
  mutation CreateBlog($input: CreateBlogInput!) {
    createBlog(input: $input) {
      id
    }
  }
`;

const UPDATE_BLOG = `
  mutation UpdateBlog($id: ID!, $input: UpdateBlogInput!) {
    updateBlog(id: $id, input: $input) {
      id
      title
      content
      isGood
      likesCount
      dislikesCount
      updatedAt
    }
  }
`;

const DELETE_BLOG = `
  mutation DeleteBlog($id: ID!) {
    deleteBlog(id: $id)
  }
`;

const TOGGLE_BLOG_GOOD = `
  mutation ToggleBlogGood($id: ID!) {
    toggleBlogGood(id: $id) {
      id
      isGood
      likesCount
      dislikesCount
      updatedAt
    }
  }
`;

interface IEditableBlogState {
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
    queryKey: ["blogs"],
    queryFn: () => graphqlRequest<{ blogs: IBlog[] }>(GET_BLOGS),
  });

  const blogs = data?.blogs ?? [];

  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");

  const [editingBlog, setEditingBlog] = useState<IEditableBlogState | null>(null);
  const [updating, setUpdating] = useState(false);

  const createBlogMutation = useMutation({
    mutationFn: (variables: { title: string; content: string }) =>
      graphqlRequest<{ createBlog: { id: string } }, { input: { title: string; content: string } }>(
        CREATE_BLOG,
        {
          input: variables,
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blogs"] });
    },
  });

  const updateBlogMutation = useMutation({
    mutationFn: (variables: { id: string; title: string; content: string }) =>
      graphqlRequest<
        { updateBlog: IBlog },
        { id: string; input: { title: string; content: string } }
      >(UPDATE_BLOG, {
        id: variables.id,
        input: {
          title: variables.title,
          content: variables.content,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blogs"] });
    },
  });

  const deleteBlogMutation = useMutation({
    mutationFn: (variables: { id: string }) =>
      graphqlRequest<{ deleteBlog: boolean }, { id: string }>(DELETE_BLOG, {
        id: variables.id,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blogs"] });
    },
  });

  const toggleBlogGoodMutation = useMutation({
    mutationFn: (variables: { id: string }) =>
      graphqlRequest<{ toggleBlogGood: { id: string } }, { id: string }>(TOGGLE_BLOG_GOOD, {
        id: variables.id,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blogs"] });
    },
  });

  async function handleCreateBlog(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!createTitle.trim() || !createContent.trim()) {
      toast.error("Title and content are required.");
      return;
    }

    try {
      await createBlogMutation.mutateAsync({
        title: createTitle.trim(),
        content: createContent.trim(),
      });

      setCreateTitle("");
      setCreateContent("");
      toast.success("Blog created.");
    } catch (mutationError) {
      console.error(mutationError);
      toast.error("Failed to create blog.");
    }
  }

  async function handleToggleGood(id: string) {
    try {
      await toggleBlogGoodMutation.mutateAsync({ id });
    } catch (mutationError) {
      console.error(mutationError);
      toast.error("Failed to toggle good/bad.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this blog? This cannot be undone.")) {
      return;
    }

    try {
      await deleteBlogMutation.mutateAsync({ id });

      toast.success("Blog deleted.");
    } catch (mutationError) {
      console.error(mutationError);
      toast.error("Failed to delete blog.");
    }
  }

  function openEditDialog(blog: IBlog) {
    setEditingBlog({
      id: blog.id,
      title: blog.title,
      content: blog.content,
    });
  }

  async function handleSaveEdit() {
    if (!editingBlog) return;

    if (!editingBlog.title.trim() || !editingBlog.content.trim()) {
      toast.error("Title and content are required.");
      return;
    }

    try {
      setUpdating(true);

      await updateBlogMutation.mutateAsync({
        id: editingBlog.id,
        title: editingBlog.title.trim(),
        content: editingBlog.content.trim(),
      });

      toast.success("Blog updated.");
      setEditingBlog(null);
    } catch (mutationError) {
      console.error(mutationError);
      toast.error("Failed to update blog.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">The Async Journal</h1>
            <p className="text-muted-foreground text-sm">
              Notes on modern web, React, and everything in between.
            </p>
          </div>
        </header>

        <section aria-label="Create blog">
          <Card>
            <CardHeader>
              <CardTitle>New blog</CardTitle>
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
                  handleCreateBlog(event as unknown as React.FormEvent<HTMLFormElement>);
                }}
              >
                Create blog
              </Button>
            </CardFooter>
          </Card>
        </section>

        <section aria-label="Blogs list" className="flex-1 space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading blogs...</p>}
          {error && (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : "Failed to load posts."}
            </p>
          )}

          {!isLoading && !error && blogs.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No blogs yet. Create your first one above.
            </p>
          )}

          <div className="space-y-4">
            {blogs.map((blog: IBlog) => {
              const createdLabel = new Date(blog.createdAt).toLocaleString();
              const updatedLabel = new Date(blog.updatedAt).toLocaleString();

              return (
                <Card key={blog.id} className="border-border/70">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle>{blog.title}</CardTitle>
                      <CardDescription>
                        <span className="text-xs text-muted-foreground">
                          Created: {createdLabel}
                        </span>
                        {blog.updatedAt !== blog.createdAt && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            Updated: {updatedLabel}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{blog.content}</p>
                  </CardContent>
                  <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center overflow-hidden rounded-full bg-muted text-xs">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={`rounded-full cursor-pointer transition-transform transition-colors duration-150 hover:scale-105 active:scale-95 ${
                            blog.isGood
                              ? "bg-yellow-400 text-black hover:bg-yellow-400/90"
                              : "text-muted-foreground hover:bg-muted/40"
                          }`}
                          onClick={() => {
                            if (!blog.isGood) {
                              void handleToggleGood(blog.id);
                            }
                          }}
                          aria-label={blog.isGood ? "Liked" : "Like"}
                        >
                          <ThumbsUpIcon className="h-3 w-3" />
                        </Button>
                        <span className="px-2 text-xs font-medium">
                          {blog.likesCount}
                        </span>
                        <div className="h-4 w-px bg-border" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={`rounded-full cursor-pointer transition-colors duration-150 ${
                            !blog.isGood
                              ? "bg-muted text-black hover:bg-muted/80"
                              : "text-muted-foreground hover:bg-muted/40"
                          }`}
                          onClick={() => {
                            if (blog.isGood) {
                              void handleToggleGood(blog.id);
                            }
                          }}
                          aria-label={!blog.isGood ? "Disliked" : "Dislike"}
                        >
                          <ThumbsDownIcon className="h-3 w-3" />
                        </Button>
                        <span className="px-2 text-xs font-medium">
                          {blog.dislikesCount}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => openEditDialog(blog)}
                        disabled={updating || updateBlogMutation.isPending}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => handleDelete(blog.id)}
                        disabled={deleteBlogMutation.isPending}
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
          open={editingBlog !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditingBlog(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit blog</DialogTitle>
            </DialogHeader>
            {editingBlog && (
              <div className="space-y-4 pt-2">
                <Input
                  value={editingBlog.title}
                  onChange={(event) =>
                    setEditingBlog((current: IEditableBlogState | null) =>
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
                  value={editingBlog.content}
                  onChange={(event) =>
                    setEditingBlog((current: IEditableBlogState | null) =>
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
                onClick={() => setEditingBlog(null)}
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
