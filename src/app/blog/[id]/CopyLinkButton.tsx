"use client";

import { useState } from "react";
import { ArrowLeftIcon, LinkIcon, ShareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ICopyLinkButtonProps {
  url: string;
  title: string;
}

export function CopyLinkButton({ url, title }: ICopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // user dismissed — no-op
      }
    } else {
      await handleCopy();
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => void handleCopy()}>
        <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
        {copied ? "Copied!" : "Copy link"}
      </Button>
      {typeof navigator !== "undefined" && "share" in navigator && (
        <Button type="button" variant="outline" size="sm" onClick={() => void handleShare()}>
          <ShareIcon className="h-3.5 w-3.5 mr-1.5" />
          Share
        </Button>
      )}
    </div>
  );
}

export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-2 transition-colors cursor-pointer"
    >
      <ArrowLeftIcon className="h-4 w-4" />
      Back to posts
    </button>
  );
}
