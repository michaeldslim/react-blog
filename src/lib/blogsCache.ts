import { unstable_cache } from "next/cache";

import { blogsRepository } from "@/lib/activeBlogsRepository";

export const BLOGS_CACHE_TAG = "blogs";

const parsedRevalidate = Number(process.env.BLOGS_ISR_SECONDS ?? "60");
export const BLOGS_REVALIDATE_SECONDS = Number.isFinite(parsedRevalidate) && parsedRevalidate > 0
  ? Math.floor(parsedRevalidate)
  : 60;

export const getPublicBlogsPageCached = unstable_cache(
  async (page: number, pageSize: number, query?: string | null, tag?: string | null) =>
    blogsRepository.getBlogsPaginated(page, pageSize, {
      viewerUserId: null,
      isAdmin: false,
      query: query ?? undefined,
      tag: tag ?? undefined,
    }),
  ["public-blogs-page"],
  {
    tags: [BLOGS_CACHE_TAG],
    revalidate: BLOGS_REVALIDATE_SECONDS,
  },
);

export const getPublicBlogDatesCached = unstable_cache(
  async () => blogsRepository.getBlogDates(),
  ["public-blog-dates"],
  {
    tags: [BLOGS_CACHE_TAG],
    revalidate: BLOGS_REVALIDATE_SECONDS,
  },
);

export const getPublicBlogByIdCached = unstable_cache(
  async (id: string) => {
    const blog = await blogsRepository.getBlogById(id);
    if (!blog || blog.status !== "published") {
      return null;
    }
    return blog;
  },
  ["public-blog-by-id"],
  {
    tags: [BLOGS_CACHE_TAG],
    revalidate: BLOGS_REVALIDATE_SECONDS,
  },
);

export const getPublicBlogByShortCodeCached = unstable_cache(
  async (shortCode: string) => {
    const blog = await blogsRepository.getBlogByShortCode(shortCode);
    if (!blog || blog.status !== "published") {
      return null;
    }
    return blog;
  },
  ["public-blog-by-short-code"],
  {
    tags: [BLOGS_CACHE_TAG],
    revalidate: BLOGS_REVALIDATE_SECONDS,
  },
);

export const getRecentPublishedBlogIdsCached = unstable_cache(
  async (limit: number) => {
    const blogs = await blogsRepository.getBlogs({
      viewerUserId: null,
      isAdmin: false,
    });

    return blogs
      .filter((blog) => blog.status === "published")
      .slice(0, limit)
      .map((blog) => blog.id);
  },
  ["recent-published-blog-ids"],
  {
    tags: [BLOGS_CACHE_TAG],
    revalidate: BLOGS_REVALIDATE_SECONDS,
  },
);