import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarIcon, UserIcon } from "lucide-react";

import { blogsRepository } from "@/lib/activeBlogsRepository";
import { MarkdownContent } from "@/components/markdown-content";
import { Badge } from "@/components/ui/badge";
import { CopyLinkButton, BackButton } from "./CopyLinkButton";

interface IProps {
  params: Promise<{ id: string }>;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[.*?\]\(.*?\)/g, "")
    .replace(/[*_~>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function generateMetadata({ params }: IProps): Promise<Metadata> {
  const { id } = await params;
  const blog = await blogsRepository.getBlogById(id);
  if (!blog) return { title: "Post not found" };

  const description = stripMarkdown(blog.content).slice(0, 160);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  return {
    title: blog.title,
    description,
    openGraph: {
      title: blog.title,
      description,
      type: "article",
      url: `${baseUrl}/blog/${id}`,
      ...(blog.publishedAt && { publishedTime: blog.publishedAt }),
      ...(blog.authorName && { authors: [blog.authorName] }),
      tags: blog.tags,
      ...(blog.imageUrl && { images: [{ url: blog.imageUrl }] }),
    },
    twitter: {
      card: blog.imageUrl ? "summary_large_image" : "summary",
      title: blog.title,
      description,
      ...(blog.imageUrl && { images: [blog.imageUrl] }),
    },
  };
}

export default async function BlogPostPage({ params }: IProps) {
  const { id } = await params;
  const blog = await blogsRepository.getBlogById(id);

  if (!blog || blog.status === "draft") {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const postUrl = `${baseUrl}/blog/${id}`;

  const publishedLabel = blog.publishedAt
    ? new Date(blog.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date(blog.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-8">
          <BackButton />
        </nav>

        <article className="space-y-6">
          <header className="space-y-4 border-b pb-6">
            <div className="flex flex-wrap items-center gap-2">
              {blog.status === "scheduled" && (
                <Badge variant="outline" className="text-xs capitalize">
                  {blog.status}
                </Badge>
              )}
              {blog.tags.map((tag) => (
                <Link key={tag} href={`/?tag=${encodeURIComponent(tag)}`}>
                  <Badge variant="secondary" className="text-xs hover:bg-accent cursor-pointer">
                    #{tag}
                  </Badge>
                </Link>
              ))}
            </div>

            <h1 className="text-3xl font-bold tracking-tight leading-tight">
              {blog.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {blog.authorName && (
                <span className="flex items-center gap-1.5">
                  <UserIcon className="h-3.5 w-3.5" />
                  {blog.authorName}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5" />
                {publishedLabel}
              </span>
            </div>
          </header>

          {blog.imageUrl && (
            <div className="overflow-hidden rounded-lg border bg-muted/30">
              <Image
                src={blog.imageUrl}
                alt={blog.title}
                width={800}
                height={400}
                className="w-full object-cover max-h-[400px]"
                priority
              />
            </div>
          )}

          <div className="prose-content">
            <MarkdownContent content={blog.content} />
          </div>

          <footer className="border-t pt-6">
            <CopyLinkButton url={postUrl} title={blog.title} />
          </footer>
        </article>
      </main>
    </div>
  );
}
