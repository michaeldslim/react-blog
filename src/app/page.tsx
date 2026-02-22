"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";

import { MarkdownContent } from "@/components/markdown-content";
import type { IBlog, ThemeName } from "@/types";
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
import { uploadBlogImage } from "@/lib/browserSupabaseClient";
import { useTheme } from "@/components/theme-provider";
import { AuthButtons } from "@/components/auth-buttons";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const GET_BLOGS = `
  query GetBlogs($page: Int!, $pageSize: Int!) {
    blogs(page: $page, pageSize: $pageSize) {
      items {
        id
        title
        content
        isGood
        likesCount
        dislikesCount
        imageUrl
        createdAt
        updatedAt
      }
      totalCount
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

const LIKE_BLOG = `
  mutation LikeBlog($id: ID!) {
    likeBlog(id: $id) {
      id
      isGood
      likesCount
      dislikesCount
      updatedAt
    }
  }
`;

const DISLIKE_BLOG = `
  mutation DislikeBlog($id: ID!) {
    dislikeBlog(id: $id) {
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
  imageUrl: string | null;
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

  const { data: session } = useSession();
  const isAuthenticated = Boolean(session);

  const {
    theme,
    options: themeOptionsContext,
    handleThemeChange,
    source: themeSource,
    enableSwitcher,
  } = useTheme();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialPageFromUrl = Number(searchParams.get("page"));
  const initialPage =
    Number.isFinite(initialPageFromUrl) && initialPageFromUrl > 0
      ? Math.floor(initialPageFromUrl)
      : 1;

  const envPageSize = Number(process.env.NEXT_PUBLIC_BLOGS_PAGE_SIZE);
  if (!Number.isFinite(envPageSize) || envPageSize <= 0) {
    throw new Error("NEXT_PUBLIC_BLOGS_PAGE_SIZE must be a positive number");
  }
  const DEFAULT_POSTS_PER_PAGE = Math.floor(envPageSize);

  const initialPageSizeFromUrl = Number(searchParams.get("pageSize"));
  const POSTS_PER_PAGE =
    Number.isFinite(initialPageSizeFromUrl) && initialPageSizeFromUrl > 0
      ? Math.floor(initialPageSizeFromUrl)
      : DEFAULT_POSTS_PER_PAGE;

  const [currentPage, setCurrentPage] = useState(initialPage);

  const updatePage = useCallback(
    (nextPage: number) => {
      const safeNextPage = Math.max(1, Math.floor(nextPage));
      setCurrentPage(safeNextPage);

      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(safeNextPage));
      params.set("pageSize", String(POSTS_PER_PAGE));
      router.push(`${pathname}?${params.toString()}`);
    },
    [POSTS_PER_PAGE, pathname, router, searchParams],
  );

  const handlePageSizeChange = useCallback(
    (nextPageSize: number) => {
      const safePageSize = Math.max(1, Math.floor(nextPageSize));
      setCurrentPage(1);

      const params = new URLSearchParams(searchParams.toString());
      params.set("page", "1");
      params.set("pageSize", String(safePageSize));
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["blogs", currentPage, POSTS_PER_PAGE],
    queryFn: () =>
      graphqlRequest<
        { blogs: { items: IBlog[]; totalCount: number } },
        { page: number; pageSize: number }
      >(GET_BLOGS, {
        page: currentPage,
        pageSize: POSTS_PER_PAGE,
      }),
  });

  const blogsPage = data?.blogs;
  const blogs = blogsPage?.items ?? [];
  const totalCount = blogsPage?.totalCount ?? 0;

  const totalPages = totalCount > 0 ? Math.max(1, Math.ceil(totalCount / POSTS_PER_PAGE)) : 1;

  useEffect(() => {
    if (totalCount > 0 && currentPage > totalPages) {
      updatePage(totalPages);
    }
  }, [currentPage, totalCount, totalPages, updatePage]);

  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [createImagePreviewUrl, setCreateImagePreviewUrl] = useState<string | null>(null);
  const createFileInputRef = useRef<HTMLInputElement | null>(null);

  const [editingBlog, setEditingBlog] = useState<IEditableBlogState | null>(null);
  const [editingInitialBlog, setEditingInitialBlog] = useState<IEditableBlogState | null>(null);
  const [updating, setUpdating] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  const createBlogMutation = useMutation({
    mutationFn: (variables: { title: string; content: string; imageUrl?: string | null }) =>
      graphqlRequest<
        { createBlog: { id: string } },
        { input: { title: string; content: string; imageUrl?: string | null } }
      >(CREATE_BLOG, {
        input: variables,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blogs"] });
    },
  });

  const updateBlogMutation = useMutation({
    mutationFn: (variables: { id: string; title: string; content: string; imageUrl?: string | null }) =>
      graphqlRequest<
        { updateBlog: IBlog },
        { id: string; input: { title: string; content: string; imageUrl?: string | null } }
      >(UPDATE_BLOG, {
        id: variables.id,
        input: {
          title: variables.title,
          content: variables.content,
          ...(variables.imageUrl !== undefined ? { imageUrl: variables.imageUrl } : {}),
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
      graphqlRequest<{ toggleBlogGood: Pick<IBlog, "id" | "isGood" | "likesCount" | "dislikesCount" | "updatedAt"> }, { id: string }>(
        TOGGLE_BLOG_GOOD,
        {
        id: variables.id,
        },
      ),
    onSuccess: (data) => {
      const updated = data.toggleBlogGood;
      queryClient.setQueryData(["blogs"], (current: { blogs: IBlog[] } | undefined) => {
        if (!current) return current;
        return {
          blogs: current.blogs.map((blog) =>
            blog.id === updated.id
              ? {
                  ...blog,
                  isGood: updated.isGood,
                  likesCount: updated.likesCount,
                  dislikesCount: updated.dislikesCount,
                  updatedAt: updated.updatedAt,
                }
              : blog,
          ),
        };
      });

      void queryClient.invalidateQueries({ queryKey: ["blogs"] });
    },
  });

  const likeBlogMutation = useMutation({
    mutationFn: (variables: { id: string }) =>
      graphqlRequest<
        {
          likeBlog: Pick<IBlog, "id" | "isGood" | "likesCount" | "dislikesCount" | "updatedAt">;
        },
        { id: string }
      >(LIKE_BLOG, {
        id: variables.id,
      }),
    onSuccess: (data) => {
      const updated = data.likeBlog;
      queryClient.setQueryData(["blogs"], (current: { blogs: IBlog[] } | undefined) => {
        if (!current) return current;
        return {
          blogs: current.blogs.map((blog) =>
            blog.id === updated.id
              ? {
                  ...blog,
                  isGood: updated.isGood,
                  likesCount: updated.likesCount,
                  dislikesCount: updated.dislikesCount,
                  updatedAt: updated.updatedAt,
                }
              : blog,
          ),
        };
      });

      void queryClient.invalidateQueries({ queryKey: ["blogs"] });
    },
  });

  const dislikeBlogMutation = useMutation({
    mutationFn: (variables: { id: string }) =>
      graphqlRequest<
        {
          dislikeBlog: Pick<IBlog, "id" | "isGood" | "likesCount" | "dislikesCount" | "updatedAt">;
        },
        { id: string }
      >(DISLIKE_BLOG, {
        id: variables.id,
      }),
    onSuccess: (data) => {
      const updated = data.dislikeBlog;
      queryClient.setQueryData(["blogs"], (current: { blogs: IBlog[] } | undefined) => {
        if (!current) return current;
        return {
          blogs: current.blogs.map((blog) =>
            blog.id === updated.id
              ? {
                  ...blog,
                  isGood: updated.isGood,
                  likesCount: updated.likesCount,
                  dislikesCount: updated.dislikesCount,
                  updatedAt: updated.updatedAt,
                }
              : blog,
          ),
        };
      });

      void queryClient.invalidateQueries({ queryKey: ["blogs"] });
    },
  });

  async function handleCreateBlog(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!createTitle.trim() || !createContent.trim()) {
      toast.error("Title and content are required.");
      return;
    }

    let imageUrl: string | null = null;
    if (createImageFile) {
      try {
        imageUrl = await uploadBlogImage(createImageFile);
      } catch (uploadError) {
        console.error(uploadError);
        toast.error("Failed to upload image.");
        return;
      }
    }

    try {
      await createBlogMutation.mutateAsync({
        title: createTitle.trim(),
        content: createContent.trim(),
        imageUrl,
      });

      setCreateTitle("");
      setCreateContent("");
      setCreateImageFile(null);
      setCreateImagePreviewUrl(null);
      if (createFileInputRef.current) {
        createFileInputRef.current.value = "";
      }
      toast.success("Blog created.");
    } catch (mutationError) {
      console.error(mutationError);
      toast.error("Failed to create blog.");
    }
  }

  async function handleLike(id: string) {
    try {
      await likeBlogMutation.mutateAsync({ id });
    } catch (mutationError) {
      console.error(mutationError);
      toast.error("Failed to like.");
    }
  }

  async function handleDislike(id: string) {
    try {
      await dislikeBlogMutation.mutateAsync({ id });
    } catch (mutationError) {
      console.error(mutationError);
      toast.error("Failed to dislike.");
    }
  }

  async function handleDelete(id: string) {
    toast.warning("Delete this blog?", {
      description: "This action cannot be undone.",
      duration: 6000,
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await deleteBlogMutation.mutateAsync({ id });
            toast.success("Blog deleted.");
          } catch (mutationError) {
            console.error(mutationError);
            toast.error("Failed to delete blog.");
          }
        },
      },
    });
  }

  function openEditDialog(blog: IBlog) {
    const nextState: IEditableBlogState = {
      id: blog.id,
      title: blog.title,
      content: blog.content,
      imageUrl: blog.imageUrl ?? null,
    };
    setEditingBlog(nextState);
    setEditingInitialBlog(nextState);
    setEditImageFile(null);
  }

  function clearEditDialogState() {
    setEditingBlog(null);
    setEditingInitialBlog(null);
    setEditImageFile(null);
  }

  function requestCloseEditDialog() {
    if (!editingBlog || !editingInitialBlog) {
      clearEditDialogState();
      return;
    }

    const hasChanges =
      editingBlog.title !== editingInitialBlog.title ||
      editingBlog.content !== editingInitialBlog.content ||
      editingBlog.imageUrl !== editingInitialBlog.imageUrl ||
      editImageFile !== null;

    if (hasChanges) {
      toast.warning("You have unsaved changes", {
        description: "Use Save changes to keep editing, or Cancel to discard.",
        duration: 5000,
      });
      return;
    }

    clearEditDialogState();
  }

  async function handleSaveEdit() {
    if (!editingBlog) return;

    if (!editingBlog.title.trim() || !editingBlog.content.trim()) {
      toast.error("Title and content are required.");
      return;
    }

    try {
      setUpdating(true);
      let nextImageUrl: string | null | undefined;

      if (editImageFile) {
        nextImageUrl = await uploadBlogImage(editImageFile);
      } else if (editingBlog.imageUrl === null) {
        // Explicit removal of existing image
        nextImageUrl = null;
      } else {
        // No change to image
        nextImageUrl = undefined;
      }

      await updateBlogMutation.mutateAsync({
        id: editingBlog.id,
        title: editingBlog.title.trim(),
        content: editingBlog.content.trim(),
        imageUrl: nextImageUrl,
      });

      toast.success("Blog updated.");
      clearEditDialogState();
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
        <header className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">The Async Journal</h1>
            <p className="text-muted-foreground text-sm">
              Notes on modern web, React, and everything in between.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {enableSwitcher && (
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="text-muted-foreground">Theme ({themeSource})</span>
                <select
                  className="rounded-md border bg-background px-2 py-1 text-xs sm:text-sm"
                  value={theme}
                  onChange={(event) => handleThemeChange(event.target.value as ThemeName)}
                >
                  {themeOptionsContext.map((option) => (
                    <option key={option.name} value={option.name}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <AuthButtons />
          </div>
        </header>

      {isAuthenticated && (
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
                placeholder="Content (use ``` for code blocks)"
                value={createContent}
                onChange={(event) => setCreateContent(event.target.value)}
                rows={4}
              />
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  ref={createFileInputRef}
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (!file) {
                      setCreateImageFile(null);
                      setCreateImagePreviewUrl(null);
                      return;
                    }
                    setCreateImageFile(file);
                    const previewUrl = URL.createObjectURL(file);
                    setCreateImagePreviewUrl(previewUrl);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="font-medium"
                  disabled={!createTitle.trim() || !createContent.trim()}
                  onClick={() => {
                    if (!createTitle.trim() || !createContent.trim()) {
                      return;
                    }
                    createFileInputRef.current?.click();
                  }}
                >
                  Choose file
                </Button>
                <span className="text-xs text-muted-foreground">
                  {createImageFile ? createImageFile.name : "No file chosen"}
                </span>
              </div>
              {createImagePreviewUrl && (
                <div className="mt-1">
                  <button
                    type="button"
                    className="group inline-flex overflow-hidden rounded-md border bg-muted/40"
                    onClick={() => setSelectedImageUrl(createImagePreviewUrl)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={createImagePreviewUrl}
                      alt="Selected image preview"
                      className="h-24 w-24 object-cover transition-transform group-hover:scale-105"
                    />
                  </button>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button
                type="submit"
                variant="default"
                size="sm"
                className="bg-blue-500 text-white hover:bg-blue-500/90"
                disabled={!createTitle.trim() || !createContent.trim() || createBlogMutation.isPending}
                onClick={(event) => {
                  // Wrap in a fake form submission for reuse of handler.
                  handleCreateBlog(event as unknown as React.SyntheticEvent<HTMLFormElement>);
                }}
              >
                Create blog
              </Button>
            </CardFooter>
          </Card>
        </section>
      )}

      <section aria-label="Blogs list" className="flex-1 space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading blogs...</p>}
        {error && (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load posts."}
          </p>
        )}

          {!isLoading && !error && totalCount === 0 && (
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
                  <CardContent className="space-y-3">
                    {blog.imageUrl && (
                      <button
                        type="button"
                        className="group inline-flex overflow-hidden rounded-md border bg-muted/40"
                        onClick={() => setSelectedImageUrl(blog.imageUrl ?? null)}
                      >
                        <Image
                          src={blog.imageUrl}
                          alt="Blog image"
                          width={320}
                          height={160}
                          unoptimized
                          className="h-40 w-full max-w-xs object-cover transition-transform group-hover:scale-105"
                        />
                      </button>
                    )}
                    <MarkdownContent content={blog.content} />
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
                          disabled={toggleBlogGoodMutation.isPending || likeBlogMutation.isPending || dislikeBlogMutation.isPending}
                          onClick={() => {
                            if (blog.isGood) {
                              toast.message("Already liked", {
                                duration: 2000,
                              });
                              return;
                            }

                            void handleLike(blog.id);
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
                          disabled={toggleBlogGoodMutation.isPending || likeBlogMutation.isPending || dislikeBlogMutation.isPending}
                          onClick={() => {
                            if (!blog.isGood) {
                              toast.message("Already disliked", {
                                duration: 2000,
                              });
                              return;
                            }

                            void handleDislike(blog.id);
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
                      {isAuthenticated && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => openEditDialog(blog)}
                          disabled={updating || updateBlogMutation.isPending}
                        >
                          Edit
                        </Button>
                      )}
                      {isAuthenticated && (
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={() => handleDelete(blog.id)}
                          disabled={deleteBlogMutation.isPending}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
          {totalCount > 0 && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <p className="text-xs text-muted-foreground">
                  Showing
                  {" "}
                  {(currentPage - 1) * POSTS_PER_PAGE + 1}
                  {"-"}
                  {Math.min(currentPage * POSTS_PER_PAGE, totalCount)}
                  {" "}
                  of
                  {" "}
                  {totalCount}
                  {" "}
                  posts
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>Per page:</span>
                  <select
                    className="rounded-md border bg-background px-1.5 py-0.5 text-xs"
                    value={POSTS_PER_PAGE}
                    onChange={(event) => handlePageSizeChange(Number(event.target.value))}
                 >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => updatePage(currentPage - 1)}
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_value, index) => {
                  const page = index + 1;
                  const isCurrent = page === currentPage;
                  return (
                    <Button
                      key={page}
                      type="button"
                      variant={isCurrent ? "default" : "outline"}
                      size="sm"
                      className={isCurrent ? "pointer-events-none" : ""}
                      onClick={() => updatePage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages || totalCount === 0}
                  onClick={() => updatePage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </section>

        <Dialog
          open={selectedImageUrl !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedImageUrl(null);
            }
          }}
        >
          <DialogContent
            className="max-w-3xl"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
            }}
          >
            <DialogHeader className="sr-only">
              <DialogTitle>Blog image preview</DialogTitle>
            </DialogHeader>
            {selectedImageUrl && (
              <Image
                src={selectedImageUrl}
                alt="Blog image"
                width={1200}
                height={800}
                unoptimized
                className="max-h-[80vh] w-full rounded-md object-contain"
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={editingBlog !== null}
          onOpenChange={(open) => {
            if (!open) {
              requestCloseEditDialog();
            }
          }}
        >
          <DialogContent
            onOpenAutoFocus={(event) => {
              event.preventDefault();
            }}
          >
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
                  onMouseDown={(event) => {
                    const input = event.currentTarget;
                    if (document.activeElement !== input) {
                      event.preventDefault();
                      input.focus();
                      const length = input.value.length;
                      input.setSelectionRange(length, length);
                    }
                  }}
                />
                <Textarea
                  placeholder="Content (use ``` for code blocks)"
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
                <div className="space-y-2">
                  {(editingBlog.imageUrl || editImageFile) && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="group inline-flex overflow-hidden rounded-md border bg-muted/40"
                        onClick={() => {
                          const url = editImageFile
                            ? URL.createObjectURL(editImageFile)
                            : editingBlog.imageUrl;
                          if (url) {
                            setSelectedImageUrl(url);
                          }
                        }}
                      >
                        {editImageFile ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={URL.createObjectURL(editImageFile)}
                            alt="Edited image preview"
                            className="h-24 w-24 object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          editingBlog.imageUrl && (
                            <Image
                              src={editingBlog.imageUrl}
                              alt="Current blog image"
                              width={96}
                              height={96}
                              unoptimized
                              className="h-24 w-24 object-cover transition-transform group-hover:scale-105"
                            />
                          )
                        )}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      ref={editFileInputRef}
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        if (!file) {
                          setEditImageFile(null);
                          return;
                        }
                        setEditImageFile(file);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      className="font-medium"
                      onClick={() => {
                        editFileInputRef.current?.click();
                      }}
                    >
                      Choose file
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {editImageFile ? editImageFile.name : "choose file or replace file"}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearEditDialogState}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="bg-blue-500 text-white hover:bg-blue-500/90"
                onClick={handleSaveEdit}
                disabled={updating}
              >
                {updating ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
