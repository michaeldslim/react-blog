# React Blog Project Guide

This document is a detailed guide to the React Blog project, including its overall structure, operating flow, and installation method.

## 1. Installation Process and Setup

This project is built on Next.js (App Router). Follow the steps below to install and run the project in a local environment.

### Prerequisites
- Node.js (v18 or later recommended)
- npm, yarn, pnpm, or bun package manager

### Install and Run
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Set environment variables**
   Create a `.env.local` file in the root directory and set the following variables:
   ```env
   NEXT_PUBLIC_BLOGS_PAGE_SIZE=10
   NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   NEXTAUTH_SECRET=YOUR_NEXTAUTH_SECRET
   BLOGS_REPOSITORY=memory # or supabase (choose data store)
   ```
3. **Start development server**
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000` in your browser.
5. You can test the GraphQL API via the GraphiQL interface at `http://localhost:3000/api/graphql`.

---

## 2. Architecture and Structure

This project uses a full-stack architecture where the **frontend (Client Components)** and **backend API (GraphQL Yoga)** coexist in a single Next.js application.

- **Frontend**: Next.js App Router, React, Tailwind CSS, ShadCN UI
- **State/Data Management**: TanStack Query (React Query)
- **API Layer**: GraphQL Yoga integrated into Next.js Route Handler (`app/api/graphql/route.ts`)
- **Data Layer**: Repository pattern applied to abstract data sources (`memory` or `supabase`)

### Folder Structure
- `src/app`: Next.js App Router entry point (pages and API routes)
- `src/components`: UI components (ShadCN UI and custom components)
- `src/lib`: Business logic, data repositories, helper functions, client setup
- `src/types`: TypeScript type and interface definitions

---

## 3. Libraries and Frameworks Used

- **Framework**: Next.js (v16.1.6), React (v19.2.3)
- **Styling**: Tailwind CSS (v4), clsx, tailwind-merge
- **UI Components**: Radix UI–based ShadCN components (`@radix-ui/react-*`), Lucide React (icons)
- **API (GraphQL)**: `graphql`, `graphql-yoga`
- **Data Fetching and State Management**: `@tanstack/react-query`, `@apollo/client` (used for partial client setup)
- **Forms and Validation**: `react-hook-form`, `@hookform/resolvers`, `zod`
- **Authentication**: `next-auth` (v4.24.11)
- **Database (Optional)**: `@supabase/supabase-js` (when using Supabase)
- **Date Handling**: `date-fns`, `react-day-picker`
- **Notifications**: `sonner`

---

## 4. Blog Posting Flow (User Interaction)

The full process of creating a new blog post from the main page (`src/app/page.tsx`) is as follows:

1. **Input**: The user enters a title (`title`), content (`content`), and an optional image in the form.
2. **Image Upload (Optional)**: If an image is attached, the client browser calls the `uploadBlogImage` function (`src/lib/browserSupabaseClient.ts`) to upload directly to Supabase Storage and receive a URL.
3. **Call GraphQL Mutation**: `createBlogMutation` (TanStack Query) runs and sends the `CREATE_BLOG` GraphQL mutation to `/api/graphql` via `graphqlRequest`.
4. **API Route Processing**: The request is handled by `src/app/api/graphql/route.ts`. GraphQL Yoga parses the request and calls the `createBlog` resolver.
5. **Authorization Check**: Inside the resolver, a `next-auth` token is checked so only authenticated users can create posts.
6. **Repository Call**: `blogsRepository.createBlog(input)` is called. Depending on the environment variable (`BLOGS_REPOSITORY`), either the `memory` or `supabase` repository is selected.
7. **Data Persistence**: The selected repository (e.g., `supabaseBlogsRepository`) stores the post data in the actual database.
8. **Response and Cache Invalidation**: On success, the new blog ID is returned to the frontend, and the `onSuccess` callback calls `queryClient.invalidateQueries({ queryKey: ["blogs"] })` to refresh the on-screen post list.

---

## 5. How Features Are Connected

Each layer of the project is connected as follows:

- **UI ↔ GraphQL Client**: Communication is done in `src/app/page.tsx` using GraphQL query strings and a custom `graphqlRequest` function. TanStack Query wraps this to handle loading, error state, and caching.
- **GraphQL Client ↔ GraphQL Server**: Communication with the `/api/graphql` endpoint is done through HTTP POST requests.
- **GraphQL Server ↔ Repository**: Resolvers in `src/app/api/graphql/route.ts` do not query the DB directly; they call the `blogsRepository` interface provided by `src/lib/activeBlogsRepository.ts`.
- **Repository ↔ Database**: `activeBlogsRepository.ts` dynamically injects either the in-memory array (`blogsRepository.ts`) or Supabase (`supabaseBlogsRepository.ts`) implementation based on environment configuration, and performs actual CRUD operations.

---

## 6. Purpose and Role of Key Files

- **`src/app/page.tsx`**: Main screen component. Handles post list retrieval, create/update/delete forms, and related logic (TanStack Query based).
- **`src/app/layout.tsx`**: Root layout of the application. Applies common HTML structure, global CSS, and wraps `Providers` to enable global state and theme setup.
- **`src/app/api/graphql/route.ts`**: GraphQL Yoga server configuration. Defines schema (`typeDefs`) and resolvers (`resolvers`), and exposes them as Next.js GET/POST route handlers.
- **`src/lib/activeBlogsRepository.ts`**: Dependency injection entry file. Exports either memory or Supabase repository instance based on the `BLOGS_REPOSITORY` environment variable.
- **`src/lib/blogsRepository.ts`**: In-memory blog data store implementation (for development/testing). Reset when the server restarts.
- **`src/lib/supabaseBlogsRepository.ts`**: Production-oriented repository implementation integrated with Supabase PostgreSQL. Also includes Storage (image) deletion logic.
- **`src/types/index.ts`**: Defines core TypeScript types such as blog post (`IBlog`), pagination (`IBlogsPage`), and repository interface (`IBlogsRepository`).

---

## 7. What the Main Components Do

- **`src/components/providers.tsx`**: Initializes and provides app-wide Context Providers (TanStack Query client, Next-Auth session, theme, Sonner Toaster) to child components.
- **`src/components/markdown-content.tsx`**: Parses post text content (`content`) and renders markdown-style code blocks (` ``` `) separately from plain text.
- **`src/components/blog-calendar.tsx`**: Renders a calendar based on blog creation dates and updates URL parameters (`?date=...`) so posts can be filtered by selected date.
- **`src/components/auth-buttons.tsx`**: Provides login/logout button UI using Next-Auth.
- **`src/components/ui/*`**: Reusable base UI components auto-generated by the ShadCN UI CLI (Button, Card, Dialog, Input, Textarea, etc.).

---

## 8. Core Code Explanation

### GraphQL Request Helper Function (`src/app/page.tsx`)
```typescript
async function graphqlRequest<TData, TVariables = Record<string, unknown>>(
  query: string,
  variables?: TVariables,
): Promise<TData> {
  const response = await fetch("/api/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  // ... error handling and response return logic
}
```
*Explanation*: This is a lightweight helper function that communicates directly with the server using the built-in `fetch` API, instead of adopting a heavier GraphQL client library (e.g., Apollo) for the entire app. It is mainly called from TanStack Query `queryFn` and `mutationFn`.

### Repository Pattern (`src/types/index.ts` & `src/lib/activeBlogsRepository.ts`)
```typescript
// interface definition
export interface IBlogsRepository {
  getBlogs(): Promise<IBlog[]>;
  createBlog(input: { title: string; content: string; imageUrl?: string | null }): Promise<IBlog>;
  // ... other methods
}

// select implementation at runtime
const backend = process.env.BLOGS_REPOSITORY ?? "memory";
export const blogsRepository: IBlogsRepository =
  backend === "supabase" ? supabaseBlogsRepository : memoryBlogsRepository;
```
*Explanation*: By abstracting data access logic behind the `IBlogsRepository` interface, the project can switch between memory DB and real DB (Supabase) using only one environment variable, without changing GraphQL resolver code.

### Query with Pagination and Filtering (`src/app/page.tsx`)
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ["blogs", currentPage, POSTS_PER_PAGE],
  queryFn: () =>
    graphqlRequest<...>(GET_BLOGS, {
      page: currentPage,
      pageSize: POSTS_PER_PAGE,
    }),
});

// ...
let blogs = blogsPage?.items ?? [];
if (selectedDate) {
  blogs = blogs.filter(blog => blog.createdAt.startsWith(selectedDate));
}
```
*Explanation*: The current page is determined based on URL query parameters (`page`, `pageSize`), and data for that page is fetched through TanStack Query. If a `?date=` parameter exists, posts are additionally filtered on the client to show only those from the selected date.
