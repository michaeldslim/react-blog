This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## React Blog Project Notes (English)

- **Framework**: Next.js (App Router) + React + TypeScript
- **Styling/UI**: Tailwind CSS + ShadCN UI
- **Backend**: GraphQL Yoga (`/api/graphql`) + TypeScript
- **Data Layer**: In-memory `postsRepository` (designed to be replaced by Supabase later)

### 1. Commands to recreate this blog from scratch

```bash
# 1) Create and move into the project folder
mkdir -p ~/Github/react-blog
cd ~/Github/react-blog

# 2) Create Next.js + TypeScript + Tailwind + App Router template
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

# 3) Initialize ShadCN
npx shadcn@latest init

# 4) Add ShadCN components used in this project
npx shadcn@latest add \
  button \
  input \
  textarea \
  card \
  badge \
  dialog \
  sonner \
  switch \
  form \
  label

# 5) Install GraphQL + Yoga
npm install graphql graphql-yoga

# 6) Install Prettier and related ESLint plugins (optional but recommended)
npm install -D prettier eslint-config-prettier eslint-plugin-prettier

# 7) Install TanStack Query (for data fetching/caching)
npm install @tanstack/react-query

# 8) Run the development server
npm run dev

# 9) In the browser
http://localhost:3000 → Blog UI
http://localhost:3000/api/graphql → GraphiQL (GraphQL Yoga)
```

#### Key files

- `src/types/index.ts`
  - Defines the `IPost` interface
  - Fields: `id`, `title`, `content`, `isGood`, `createdAt`, `updatedAt`

- `src/lib/postsRepository.ts`
  - Repository layer backed by an in-memory `posts: IPost[]` array
  - Methods:
    - `getPosts()`
    - `getPostById(id)`
    - `createPost({ title, content })`
    - `updatePost(id, { title?, content?, isGood? })`
    - `deletePost(id)`
    - `togglePostGood(id)`

- `src/app/api/graphql/route.ts`
  - GraphQL Yoga-based API route (`/api/graphql`)
  - `typeDefs` defines the GraphQL schema:
    - `type Post`
    - `type Query { posts, post }`
    - `type Mutation { createPost, updatePost, deletePost, togglePostGood }`
  - `resolvers` delegate the actual work to `postsRepository`
  - Uses `createYoga` + `createSchema` to expose the schema/resolvers as a Next.js Route Handler

- `src/components/providers.tsx`
  - Defines the `Providers` component
  - Renders `<Toaster />` for global toast notifications (Sonner + ShadCN)
  - Wraps the entire app with TanStack Query `QueryClientProvider` to provide a global query client

- `src/app/layout.tsx`
  - Next.js root layout
  - Wraps the entire app in `<Providers>{children}</Providers>` inside `<body>`

- `src/app/page.tsx`
  - Main blog UI page
  - Key pieces:
    - GraphQL query/mutation strings: `GET_POSTS`, `CREATE_POST`, `UPDATE_POST`, `DELETE_POST`, `TOGGLE_POST_GOOD`
    - `graphqlRequest<TData, TVariables>()` helper to call `/api/graphql`
    - TanStack Query (`useQuery`, `useMutation`, `useQueryClient`) to load/cache posts and handle mutations
    - Local state focused on the create form and edit dialog (`createTitle`, `createContent`, `editingPost`, `updating`)
    - Uses ShadCN components:
      - `Card`, `CardHeader`, `CardContent`, `CardFooter` for layout
      - `Input`, `Textarea` for create/edit forms
      - `Button` for create/edit/delete actions
      - `Badge` to show Good/Bad state
      - `Switch` to toggle `isGood`
      - `Dialog` for the edit modal

### 2. Current architecture overview

1. **UI layer (Next.js + ShadCN)**
   - `src/app/page.tsx` uses ShadCN components to render the UI
   - Sends GraphQL requests in response to user actions

2. **GraphQL layer (GraphQL Yoga)**
   - `/api/graphql` route (`src/app/api/graphql/route.ts`)
   - Defines GraphQL schema (`typeDefs`) and resolvers (`resolvers`)
   - All resolvers call into `postsRepository`

3. **Data layer (currently In-memory)**
   - `src/lib/postsRepository.ts`
   - `posts` array exists only in server memory
   - Data resets when the server restarts
   - Encapsulated in methods so it can be swapped to Supabase (Postgres) later

---

## Supabase-based `postsRepository` design (plan)

### 1. Supabase project and table design

1. Create a new project in the Supabase console
2. In Database → Table Editor, create a `posts` table (example):

   - `id`: `uuid` (primary key) or `text`
   - `title`: `text`
   - `content`: `text`
   - `is_good`: `boolean` (default `true`)
   - `created_at`: `timestamptz` (default `now()`)
   - `updated_at`: `timestamptz` (default `now()`)

3. When mapping to the TypeScript `IPost` interface, be careful to convert snake_case column names to camelCase (`is_good` → `isGood`, `created_at` → `createdAt`, etc.)

### 2. Environment variables

Create a `.env.local` file in the project root and set the following values:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

- `ANON_KEY` can be used on both client and server (public)
- `SERVICE_ROLE_KEY` is **server-only** and must not be exposed to the client
  - `postsRepository` runs only on the server, so using the service role key there is acceptable for local development (be more strict in production).

### 3. Install and initialize Supabase client

```bash
npm install @supabase/supabase-js
```

Example `src/lib/supabaseClient.ts` (server-side client):

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseServerClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});
```

### 4. Strategy to switch `postsRepository` to Supabase

Currently `src/lib/postsRepository.ts` is an in-memory implementation. Keep the structure the same and replace the internals with Supabase queries.

#### 4-1. `getPosts()`

Existing:

```ts
getPosts(): IPost[] {
  return posts.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
```

Supabase version (conceptually):

- `supabaseServerClient.from("posts").select("*").order("created_at", { ascending: false })`
- Map the result to `IPost` (`is_good` → `isGood`, `created_at` → `createdAt`, etc.)

#### 4-2. `getPostById(id)`

- `supabaseServerClient.from("posts").select("*").eq("id", id).single()`
- Return `undefined` if not found

#### 4-3. `createPost({ title, content })`

- `supabaseServerClient.from("posts").insert({...}).select().single()`
- Set `is_good` default to `true`
- Convert the returned row into `IPost`

#### 4-4. `updatePost(id, input)`

- Update only the provided fields (`title`, `content`, `isGood`)
- Update `updated_at` to `now()`
- `supabaseServerClient.from("posts").update({...}).eq("id", id).select().single()`

#### 4-5. `deletePost(id)`

- `supabaseServerClient.from("posts").delete().eq("id", id)`
- Use the affected row count to return `true`/`false`

#### 4-6. `togglePostGood(id)`

1. Call `getPostById(id)` to read the current `isGood` value
2. Flip it with `!isGood` and call `updatePost` or update via Supabase directly
3. Return the updated row as `IPost`

### 5. Other layers stay the same

- GraphQL schema (`typeDefs` in `src/app/api/graphql/route.ts`)
- GraphQL resolver signatures
- Frontend GraphQL queries/mutations and UI in `src/app/page.tsx`

In other words, only the internal implementation of `postsRepository` needs to change to Supabase—UI and GraphQL calls remain unchanged.
