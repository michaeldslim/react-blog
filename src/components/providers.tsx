"use client";

import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

interface IProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: IProvidersProps) {
  return (
    <>
      {children}
      <Toaster richColors closeButton />
    </>
  );
}
