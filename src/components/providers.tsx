"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

interface IProvidersProps {
  children: ReactNode;
}

const queryClient = new QueryClient();

export function Providers({ children }: IProvidersProps) {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {children}
          <Toaster richColors />
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
