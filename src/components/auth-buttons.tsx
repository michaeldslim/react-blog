"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AuthButtons() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return null;
  }

  if (!session) {
    return (
      <Button size="sm" variant="secondary" onClick={() => void signIn("google")}>
        Sign in
      </Button>
    );
  }

  const isAdmin = session.user?.isAdmin ?? false;

  return (
    <div className="flex items-center gap-2">
      {session.user?.image && (
        <Image
          src={session.user.image}
          alt={session.user.name ?? "User avatar"}
          width={28}
          height={28}
          className="rounded-full"
        />
      )}
      <span className="hidden text-sm font-medium sm:inline">
        {session.user?.name}
      </span>
      {isAdmin && (
        <Badge variant="secondary" className="text-xs">
          Admin
        </Badge>
      )}
      <Button size="sm" variant="secondary" onClick={() => void signOut()}>
        Sign out
      </Button>
    </div>
  );
}
