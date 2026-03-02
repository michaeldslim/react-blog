"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";

import { MarkdownContent } from "@/components/markdown-content";
import type { IBlog, ThemeName, BlogStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
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

import { BlogCalendar } from "@/components/blog-calendar";

const GET_BLOGS = `
  query GetBlogs($page: Int!, $pageSize: Int!, $query: String, $tag: String) {
    blogs(page: $page, pageSize: $pageSize, query: $query, tag: $tag) {
      items {
        id
        title
        content
        isGood
        likesCount
        dislikesCount
        imageUrl
        authorId
        authorName
        status
        publishedAt
        tags
        createdAt
        updatedAt
      }
      totalCount
    }
    blogDates {
      date
      count
    }
  }
`;

const CREATE_BLOG = `
  mutation CreateBlog($input: CreateBlogInput!) {
    createBlog(input: $input) {
      id
      status
      tags
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
      status
      publishedAt
      tags
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
  status: BlogStatus;
  tags: string[];
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(query.trim())})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.trim().toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
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
  const isAdmin = Boolean(session?.user?.isAdmin);
  const currentUserId = session?.user?.id ?? null;

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

  const selectedDate = searchParams.get("date");
  const searchQuery = searchParams.get("q") ?? "";
  const tagFilter = searchParams.get("tag") ?? "";

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [createTags, setCreateTags] = useState<string[]>([]);
  const [createTagInput, setCreateTagInput] = useState("");
  const [editTagInput, setEditTagInput] = useState("");
  const [currentPage, setCurrentPage] = useState(initialPage);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) {
        params.set("q", trimmed);
        params.set("page", "1");
        setCurrentPage(1);
      } else {
        params.delete("q");
      }
      router.push(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

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
    queryKey: ["blogs", currentPage, POSTS_PER_PAGE, searchQuery, tagFilter],
    queryFn: () =>
      graphqlRequest<
        { blogs: { items: IBlog[]; totalCount: number }; blogDates: { date: string; count: number }[] },
        { page: number; pageSize: number; query?: string | null; tag?: string | null }
      >(GET_BLOGS, {
        page: currentPage,
        pageSize: POSTS_PER_PAGE,
        query: searchQuery || null,
        tag: tagFilter || null,
      }),
  });

  const blogsPage = data?.blogs;
  let blogs = blogsPage?.items ?? [];
  
  // Filter blogs by selected date if one is provided
  if (selectedDate) {
    blogs = blogs.filter(blog => blog.createdAt.startsWith(selectedDate));
  }
  
  const totalCount = selectedDate ? blogs.length : (blogsPage?.totalCount ?? 0);
  const blogDates = data?.blogDates ?? [];

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
    mutationFn: (variables: { title: string; content: string; imageUrl?: string | null; status: BlogStatus; tags: string[] }) =>
      graphqlRequest<
        { createBlog: { id: string; status: string; tags: string[] } },
        { input: { title: string; content: string; imageUrl?: string | null; status: BlogStatus; tags: string[] } }
      >(CREATE_BLOG, {
        input: variables,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blogs"] });
    },
  });

  const updateBlogMutation = useMutation({
    mutationFn: (variables: { id: string; title: string; content: string; imageUrl?: string | null; status?: BlogStatus; tags?: string[] }) =>
      graphqlRequest<
        { updateBlog: IBlog },
        { id: string; input: { title: string; content: string; imageUrl?: string | null; status?: BlogStatus; tags?: string[] } }
      >(UPDATE_BLOG, {
        id: variables.id,
        input: {
          title: variables.title,
          content: variables.content,
          ...(variables.imageUrl !== undefined ? { imageUrl: variables.imageUrl } : {}),
          ...(variables.status !== undefined ? { status: variables.status } : {}),
          ...(variables.tags !== undefined ? { tags: variables.tags } : {}),
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

  async function handleCreateBlog(status: BlogStatus) {
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
        toast.error("Image upload failed", {
          description:
            uploadError instanceof Error
              ? uploadError.message
              : "Please try a smaller or different image.",
        });
        return;
      }
    }

    try {
      await createBlogMutation.mutateAsync({
        title: createTitle.trim(),
        content: createContent.trim(),
        imageUrl,
        status,
        tags: createTags,
      });

      setCreateTitle("");
      setCreateContent("");
      setCreateImageFile(null);
      setCreateImagePreviewUrl(null);
      setCreateTags([]);
      setCreateTagInput("");
      if (createFileInputRef.current) {
        createFileInputRef.current.value = "";
      }
      toast.success(status === "draft" ? "Saved as draft." : "Blog published.");
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
      status: blog.status,
      tags: blog.tags ?? [],
    };
    setEditTagInput("");
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
      editingBlog.status !== editingInitialBlog.status ||
      JSON.stringify(editingBlog.tags) !== JSON.stringify(editingInitialBlog.tags) ||
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
        try {
          nextImageUrl = await uploadBlogImage(editImageFile);
        } catch (uploadError) {
          console.error(uploadError);
          toast.error("Image upload failed", {
            description:
              uploadError instanceof Error
                ? uploadError.message
                : "Please try a smaller or different image.",
          });
          setUpdating(false);
          return;
        }
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
        status: editingBlog.status,
        tags: editingBlog.tags,
      });

      toast.success(
        editingBlog.status === "draft" ? "Saved as draft." : "Blog updated.",
      );
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
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
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

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-8 min-w-0">
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
                  <p className="text-xs text-muted-foreground">
                    Images are auto-resized to 800px and compressed before upload.
                  </p>
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
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-1">
                      {createTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1 pr-1 text-xs">
                          {tag}
                          <button
                            type="button"
                            className="ml-0.5 rounded hover:bg-muted"
                            onClick={() => setCreateTags((t) => t.filter((x) => x !== tag))}
                            aria-label={`Remove tag ${tag}`}
                          >
                            ✕
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <Input
                      placeholder="Add tags (Enter or comma)"
                      value={createTagInput}
                      onChange={(e) => setCreateTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          const val = createTagInput.trim().toLowerCase().replace(/,/g, "").replace(/^#/, "");
                          if (val && !createTags.includes(val)) {
                            setCreateTags((t) => [...t, val]);
                          }
                          setCreateTagInput("");
                        }
                      }}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!createTitle.trim() || !createContent.trim() || createBlogMutation.isPending}
                    onClick={() => void handleCreateBlog("draft")}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="bg-blue-500 text-white hover:bg-blue-500/90"
                    disabled={!createTitle.trim() || !createContent.trim() || createBlogMutation.isPending}
                    onClick={() => void handleCreateBlog("published")}
                  >
                    Publish
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
                {selectedDate 
                  ? `No blogs found for ${selectedDate}.` 
                  : "No blogs yet. Create your first one above."}
              </p>
            )}

            {selectedDate && (
              <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md border">
                <p className="text-sm font-medium">
                  Showing posts for: {selectedDate}
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete("date");
                    router.push(`${pathname}?${params.toString()}`);
                  }}
                >
                  Clear filter
                </Button>
              </div>
            )}

            {tagFilter && (
              <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md border">
                <p className="text-sm font-medium">
                  Filtered by tag: <Badge variant="secondary" className="ml-1">{tagFilter}</Badge>
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete("tag");
                    router.push(`${pathname}?${params.toString()}`);
                  }}
                >
                  Clear filter
                </Button>
              </div>
            )}

          <div className="space-y-4">
            {blogs.map((blog: IBlog) => {
              const createdLabel = new Date(blog.createdAt).toLocaleString();
              const updatedLabel = new Date(blog.updatedAt).toLocaleString();

              return (
                <Card key={blog.id} className="border-border/70">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle>
                          <Link
                            href={`/blog/${blog.id}`}
                            className="hover:underline underline-offset-2"
                          >
                            {highlightText(blog.title, searchQuery)}
                          </Link>
                        </CardTitle>
                        {(isAdmin || (currentUserId && blog.authorId === currentUserId)) && blog.status !== "published" && (
                          <Badge variant={blog.status === "draft" ? "secondary" : "outline"} className="text-xs capitalize">
                            {blog.status}
                          </Badge>
                        )}
                      </div>
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
                    {searchQuery ? (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
                        {highlightText(blog.content, searchQuery)}
                      </p>
                    ) : (
                      <MarkdownContent content={blog.content} />
                    )}
                    {blog.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {blog.tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              const params = new URLSearchParams(searchParams.toString());
                              params.set("tag", tag);
                              params.set("page", "1");
                              router.push(`${pathname}?${params.toString()}`);
                            }}
                          >
                            <Badge
                              variant={tagFilter === tag ? "default" : "outline"}
                              className="cursor-pointer text-xs hover:bg-accent"
                            >
                              #{tag}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    )}
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
                      {(isAdmin || (currentUserId && blog.authorId === currentUserId)) && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => openEditDialog(blog)}
                          disabled={updating || updateBlogMutation.isPending}
                        >
                          Edit
                        </Button>
                      )}
                      {(isAdmin || (currentUserId && blog.authorId === currentUserId)) && (
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
        </div>

        <aside className="w-full lg:w-80 shrink-0">
          <div className="sticky top-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Archive</CardTitle>
                <CardDescription>Browse posts by date</CardDescription>
              </CardHeader>
              <CardContent>
                <BlogCalendar postDates={blogDates} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Search</CardTitle>
                <CardDescription>Find posts by title or content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Input
                    type="search"
                    placeholder="Type to search..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  {searchInput && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                      onClick={() => setSearchInput("")}
                    >
                      ✕
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {blogs.length} result{blogs.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>

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
                <div className="space-y-1.5">
                  <div className="flex flex-wrap gap-1">
                    {editingBlog.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1 pr-1 text-xs">
                        {tag}
                        <button
                          type="button"
                          className="ml-0.5 rounded hover:bg-muted"
                          onClick={() =>
                            setEditingBlog((c) =>
                              c ? { ...c, tags: c.tags.filter((x) => x !== tag) } : c,
                            )
                          }
                          aria-label={`Remove tag ${tag}`}
                        >
                          ✕
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <Input
                    placeholder="Add tags (Enter or comma)"
                    value={editTagInput}
                    onChange={(e) => setEditTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        const val = editTagInput.trim().toLowerCase().replace(/,/g, "").replace(/^#/, "");
                        if (val && editingBlog && !editingBlog.tags.includes(val)) {
                          setEditingBlog((c) => (c ? { ...c, tags: [...c.tags, val] } : c));
                        }
                        setEditTagInput("");
                      }
                    }}
                  />
                </div>
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
                  <p className="text-xs text-muted-foreground">
                    Images are auto-resized to 800px and compressed before upload.
                  </p>
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
              {editingBlog && editingBlog.status !== "published" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-green-500 text-green-600 hover:bg-green-50"
                  disabled={updating}
                  onClick={() =>
                    setEditingBlog((c) => (c ? { ...c, status: "published" } : c))
                  }
                >
                  Publish
                </Button>
              )}
              {editingBlog && editingBlog.status === "published" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={updating}
                  onClick={() =>
                    setEditingBlog((c) => (c ? { ...c, status: "draft" } : c))
                  }
                >
                  Back to Draft
                </Button>
              )}
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
