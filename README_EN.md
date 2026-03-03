# React Blog

A full-stack blog built with Next.js (App Router) + GraphQL Yoga.

## Features

 - **Auth**: NextAuth (Google)
 - **CRUD**: Create / Edit / Delete posts (authenticated only)
 - **Draft / Publish / Scheduled** workflow (`status`, `publishedAt`)
 - **Search**: title + content search via `?q=...` (debounced)
 - **Tags**: `tags: string[]` + `?tag=...` filtering + clickable tag pills
 - **Archive**: calendar filter via `?date=...`
 - **Dedicated post pages**: `/blog/[id]` with shareable URLs, copy-link/share buttons, and per-post SEO metadata
 - **Storage**: optional Supabase Storage image uploads (and cleanup on update/delete)

## Routes

 - **Home feed**: `/` (list, create/edit UI, search/tags/archive)
 - **Post detail**: `/blog/[id]`
 - **GraphQL**: `/api/graphql` (GraphiQL available in dev)

## Getting Started

 ```bash
 npm install
 npm run dev
 ```

 Open:

 - `http://localhost:3000`
 - `http://localhost:3000/api/graphql`

## Environment Variables

 Create `.env.local` in the project root.

 ```env
 # app
 NEXT_PUBLIC_BASE_URL=http://localhost:3000
 NEXT_PUBLIC_BLOGS_PAGE_SIZE=5

 # choose repository backend
 BLOGS_REPOSITORY=memory # or supabase

 # NextAuth
 NEXTAUTH_SECRET=...
 NEXTAUTH_URL=http://localhost:3000
 GOOGLE_CLIENT_ID=...
 GOOGLE_CLIENT_SECRET=...

 # Supabase (optional; required when BLOGS_REPOSITORY=supabase OR when enabling image uploads)
 NEXT_PUBLIC_SUPABASE_URL=...
 NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 SUPABASE_URL=...
 SUPABASE_SERVICE_ROLE_KEY=...
 ```

 Notes:

 - **`NEXT_PUBLIC_BASE_URL`** should be your Railway domain in production (e.g. `https://your-app.up.railway.app`).
 - If using Supabase images, `next.config.ts` must allow `*.supabase.co` remote images (already configured).

---

## React Blog Project Notes (English)

- **Framework**: Next.js (App Router) + React + TypeScript
- **Styling/UI**: Tailwind CSS + ShadCN UI
- **Backend**: GraphQL Yoga (`/api/graphql`) + TypeScript
- **Data Layer**: `activeBlogsRepository` switches between in-memory and Supabase implementations

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
   - Defines the `IBlog` interface
   - Fields: `id`, `title`, `content`, `imageUrl`, `authorId`, `authorName`, `status`, `publishedAt`, `tags`, `likesCount`, `dislikesCount`, `createdAt`, `updatedAt`

 - `src/lib/blogsRepository.ts`
   - Repository layer backed by an in-memory `blogs: IBlog[]` array (exported as `blogsRepository`)
   - Methods:
     - `getBlogs(options?)`
     - `getBlogsPaginated(page, pageSize, options?)`
     - `getBlogById(id)`
     - `getBlogDates()`
     - `createBlog({ title, content, imageUrl?, status?, tags? })`
     - `updateBlog(id, { title?, content?, isGood?, imageUrl?, status?, publishedAt?, tags? })`
     - `deleteBlog(id)`
     - `toggleBlogGood(id)`

 - `src/app/api/graphql/route.ts`
   - GraphQL Yoga-based API route (`/api/graphql`)
   - `typeDefs` defines the GraphQL schema:
     - `type Blog` (includes status/publishedAt/tags)
     - `type Query { blogs(page, pageSize, query?, tag?), blog(id), blogDates }`
     - `type Mutation { createBlog, updateBlog, deleteBlog, toggleBlogGood, likeBlog, dislikeBlog }`
  - `resolvers` delegate the actual work to `blogsRepository`
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
     - GraphQL query/mutation strings: `GET_BLOGS`, `CREATE_BLOG`, `UPDATE_BLOG`, `DELETE_BLOG`, `TOGGLE_BLOG_GOOD`
     - `GET_BLOGS` supports `query` (search) and `tag` filtering
     - URL params: `page`, `pageSize`, `q`, `tag`, `date`
     - TanStack Query (`useQuery`, `useMutation`, `useQueryClient`) to load/cache blogs and handle mutations
     - Uses ShadCN components:
       - `Card`, `CardHeader`, `CardContent`, `CardFooter` for layout
       - `Input`, `Textarea` for create/edit forms
       - `Button` for create/edit/delete actions
       - A YouTube-style pill UI at the bottom of each card showing like/dislike icon buttons and `likesCount` / `dislikesCount`
       - `Dialog` for the edit modal

 - `src/app/blog/[id]/page.tsx`
   - Dedicated post page
   - Uses `generateMetadata` for per-post SEO
   - Renders image/tags and provides copy-link/share actions

### 2. Current architecture overview

1. **UI layer (Next.js + ShadCN)**
   - `src/app/page.tsx` uses ShadCN components to render the UI
   - Sends GraphQL requests in response to user actions

2. **GraphQL layer (GraphQL Yoga)**
   - `/api/graphql` route (`src/app/api/graphql/route.ts`)
   - Defines GraphQL schema (`typeDefs`) and resolvers (`resolvers`)
   - All resolvers call into `blogsRepository`

3. **Data layer (currently In-memory)**
   - `src/lib/blogsRepository.ts`
   - `blogs` array exists only in server memory (typed as `IBlog[]`, exported as `blogsRepository`)
   - Data resets when the server restarts
   - Encapsulated in methods so it can be swapped to Supabase (Postgres) later

---

## Supabase-based `blogsRepository` design (plan)

### 1. Supabase project and table design

1. Create a new project in the Supabase console
2. In Database → Table Editor, create a `blogs` table (example):
   - `id`: `uuid` (primary key) or `text`
   - `title`: `text`
   - `content`: `text`
   - `is_good`: `boolean` (default `true`)
   - `created_at`: `timestamptz` (default `now()`)
   - `updated_at`: `timestamptz` (default `now()`)

3. When mapping to the TypeScript `IBlog` interface, be careful to convert snake_case column names to camelCase (`is_good` → `isGood`, `created_at` → `createdAt`, etc.)

### 2. Environment variables

Create a `.env.local` file in the project root and set (or adjust) the following values as needed.

#### 2.1 Authentication (Google / NextAuth)

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
  - Used by `next-auth` Google provider in `src/lib/authOptions.ts`.
- `NEXTAUTH_SECRET`
  - Used by NextAuth / GraphQL context (`src/app/api/graphql/route.ts`) to verify sessions.
- `NEXTAUTH_URL`
  - Base URL for your app, used by NextAuth for callback URLs. For local development this is typically `http://localhost:3000`. In production, set this to your deployed URL.

#### 2.2 Supabase (server-side)

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

- Used by `src/lib/supabaseClient.ts`, `src/lib/themeServer.ts`, and `/api/theme`.
- `SUPABASE_SERVICE_ROLE_KEY` is **server-only** and must not be exposed to the client.
  - It is used only in server code (e.g. theme preferences, blog repository when `BLOGS_REPOSITORY=supabase`).

#### 2.3 Supabase (browser-side)

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

- Used by `src/lib/browserSupabaseClient.ts` for uploading blog images.
- `NEXT_PUBLIC_` prefix means these values are exposed to the browser (safe for public anon key and URL).

#### 2.4 Blog backend selection

```env
BLOGS_REPOSITORY=memory   # or "supabase"
```

- Used by `src/lib/activeBlogsRepository.ts`.
- Controls whether GraphQL resolvers use the in-memory repository or the Supabase-backed one.

#### 2.5 Theme configuration

```env
NEXT_PUBLIC_THEME_SOURCE=local        # or "public"
NEXT_PUBLIC_ENABLE_THEME_SWITCHER=true
```

- Used by `src/lib/themeConfig.ts` and `src/components/theme-provider.tsx`.
- `NEXT_PUBLIC_THEME_SOURCE`
  - `local`: themes come from local config only.
  - `public`: can be extended to use public/shared theme options.
- `NEXT_PUBLIC_ENABLE_THEME_SWITCHER`
  - When set to `true`, enables the theme switcher UI and persists choices via `/api/theme`.

#### 2.6 Pagination (blogs per page)

```env
NEXT_PUBLIC_BLOGS_PAGE_SIZE=5
```

- Used by `src/app/page.tsx`.
- Controls the **default** number of blog posts per page for server-side pagination.
- Users can still override per request via the `?pageSize=` query parameter in the URL.

#### 2.7 Example `.env.local` for local development

Below is an example of how your `.env.local` might look in local development. **Do not commit real secrets to Git.**

```env
# server-side Supabase repo
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# client-side uploads
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

BLOGS_REPOSITORY=supabase
NEXT_PUBLIC_ENABLE_THEME_SWITCHER=true
NEXT_PUBLIC_BLOGS_PAGE_SIZE=5

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

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

### 4. Strategy to switch `blogsRepository` to Supabase

Currently `src/lib/blogsRepository.ts` is an in-memory implementation. Keep the structure the same and replace the internals with Supabase queries.

#### 4-1. `getBlogs()`

Existing:

```ts
getBlogs(): IBlog[] {
  return blogs.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
```

Supabase version (conceptually):

- `supabaseServerClient.from("blogs").select("*").order("created_at", { ascending: false })`
- Map the result to `IBlog` (`is_good` → `isGood`, `created_at` → `createdAt`, etc.)

#### 4-2. `getBlogById(id)`

- `supabaseServerClient.from("blogs").select("*").eq("id", id).single()`
- Return `undefined` if not found

#### 4-3. `createBlog({ title, content })`

- `supabaseServerClient.from("blogs").insert({...}).select().single()`
- Set `is_good` default to `true`
- Convert the returned row into `IBlog`

#### 4-4. `updateBlog(id, input)`

- Update only the provided fields (`title`, `content`, `isGood`)
- Update `updated_at` to `now()`
- `supabaseServerClient.from("blogs").update({...}).eq("id", id).select().single()`

#### 4-5. `deleteBlog(id)`

- `supabaseServerClient.from("blogs").delete().eq("id", id)`
- Use the affected row count to return `true`/`false`

#### 4-6. `toggleBlogGood(id)`

1. Call `getBlogById(id)` to read the current `isGood` value
2. Flip it with `!isGood` and call `updateBlog` or update via Supabase directly
3. Return the updated row as `IBlog`

### 5. Other layers stay the same

- GraphQL schema (`typeDefs` in `src/app/api/graphql/route.ts`)
- GraphQL resolver signatures
- Frontend GraphQL queries/mutations and UI in `src/app/page.tsx`

In other words, only the internal implementation of `postsRepository` needs to change to Supabase—UI and GraphQL calls remain unchanged.
