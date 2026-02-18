"use client";

import { signIn, signOut, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function AuthButtons() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return null;
  }

  if (!session) {
    return (
      <Button size="sm" variant="secondary" onClick={() => void signIn("google")}
      >
        Sign in
      </Button>
    );
  }

  return (
    <Button size="sm" variant="secondary" onClick={() => void signOut()}>
      Sign out
    </Button>
  );
}
