"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";

interface IProvidersProps {
  children: ReactNode;
}

const queryClient = new QueryClient();

export function Providers({ children }: IProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors closeButton />
    </QueryClientProvider>
  );
}
