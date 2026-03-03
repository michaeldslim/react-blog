# React Blog

 Next.js (App Router) + GraphQL Yoga 기반의 풀스택 블로그 프로젝트입니다.

 ## Features

 - **Auth**: NextAuth (Google)
 - **CRUD**: Create / Edit / Delete posts (authenticated only)
 - **Draft / Publish / Scheduled** workflow (`status`, `publishedAt`)
 - **Search**: title + content full-text search via `?q=...` (debounced)
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

## React Blog 프로젝트 정리

- **프레임워크**: Next.js (App Router) + React + TypeScript
- **스타일/UI**: Tailwind CSS + ShadCN UI
- **백엔드**: GraphQL Yoga (`/api/graphql`) + TypeScript
- **데이터 레이어**: `activeBlogsRepository` 로 In-memory / Supabase 구현체 스위칭

### 1. 이 블로그를 처음부터 다시 만들 때 필요한 명령어

```bash
# 1) 프로젝트 폴더 생성 및 이동
mkdir -p ~/Github/react-blog
cd ~/Github/react-blog

# 2) Next.js + TypeScript + Tailwind + App Router 템플릿 생성
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

# 3) ShadCN 초기화
npx shadcn@latest init

# 4) 사용한 ShadCN 컴포넌트 추가
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

# 5) GraphQL + Yoga 설치
npm install graphql graphql-yoga

# 6) Prettier 및 관련 ESLint 플러그인 설치 (선택이지만 권장)
npm install -D prettier eslint-config-prettier eslint-plugin-prettier

# 7) TanStack Query 설치 (데이터 페칭/캐싱용)
npm install @tanstack/react-query

# 8) 개발 서버 실행
npm run dev

# 9) 브라우저에서
http://localhost:3000 → 블로그 UI
http://localhost:3000/api/graphql → GraphiQL (GraphQL Yoga)
```

#### 핵심 파일들

 - `src/types/index.ts`
   - `IBlog` 인터페이스 정의
   - 필드: `id`, `title`, `content`, `imageUrl`, `authorId`, `authorName`, `status`, `publishedAt`, `tags`, `likesCount`, `dislikesCount`, `createdAt`, `updatedAt`

 - `src/lib/blogsRepository.ts`
   - In-memory 배열 `blogs: IBlog[]` 를 사용하는 `IBlogsRepository` 구현체 (`blogsRepository` export)
   - 메서드:
     - `getBlogs(options?)`
     - `getBlogsPaginated(page, pageSize, options?)`
     - `getBlogById(id)`
     - `getBlogDates()`
     - `createBlog({ title, content, imageUrl?, status?, tags? })`
     - `updateBlog(id, { title?, content?, isGood?, imageUrl?, status?, publishedAt?, tags? })`
     - `deleteBlog(id)`
     - `toggleBlogGood(id)`
     - `likeBlog(id)`
     - `dislikeBlog(id)`

 - `src/app/api/graphql/route.ts`
   - GraphQL Yoga 기반 API 라우트(`/api/graphql`)
   - `typeDefs` 에서 GraphQL 스키마 정의
     - `type Blog` (status/publishedAt/tags 포함)
     - `type BlogsPage`, `type BlogDateCount`
     - `type Query { blogs(page, pageSize, query?, tag?), blog(id), blogDates }`
     - `type Mutation { createBlog, updateBlog, deleteBlog, toggleBlogGood, likeBlog, dislikeBlog }`
   - `resolvers` 에서 실제 구현을 `activeBlogsRepository` 가 선택한 `blogsRepository` 에 위임
   - `createYoga` + `createSchema` 로 스키마와 리졸버를 묶어 Next.js Route Handler 로 노출

- `src/lib/activeBlogsRepository.ts`
  - `BLOGS_REPOSITORY` 환경 변수에 따라 `blogsRepository` 구현체를 선택
    - 기본값: `memory`
    - `supabase` 설정 시: `supabaseBlogsRepository` 사용

- `src/app/layout.tsx`
  - Next.js 루트 레이아웃
  - `<body>` 안에서 `<Providers>{children}</Providers>` 로 전체 앱을 래핑

 - `src/app/page.tsx`
   - 블로그 메인 페이지 UI
   - 주요 요소:
     - GraphQL 쿼리/뮤테이션 문자열: `GET_BLOGS`, `CREATE_BLOG`, `UPDATE_BLOG`, `DELETE_BLOG`, `TOGGLE_BLOG_GOOD`
     - `GET_BLOGS` supports `query` (search) and `tag` filtering
     - `graphqlRequest<TData, TVariables>()` 헬퍼 함수로 `/api/graphql` 호출
     - TanStack Query(`useQuery`, `useMutation`, `useQueryClient`)로 blogs 데이터 로딩/캐싱 및 뮤테이션 관리
     - URL params:
       - `?page=...&pageSize=...`
       - `?q=...` (search)
       - `?tag=...` (tag filter)
       - `?date=...` (archive)
     - ShadCN 컴포넌트 사용:
       - `Card`, `Dialog`, `Input`, `Textarea`, `Badge`, `Button`
       - 글 생성/수정 시 tags 입력 (Enter/Comma)

 - `src/app/blog/[id]/page.tsx`
   - 단일 포스트 상세 페이지
   - `generateMetadata` 로 포스트별 SEO 메타데이터 설정
   - 이미지/태그 렌더링 + 링크 공유(복사/Share)

### 2. 현재 아키텍처 요약

1. **UI 레이어 (Next.js + ShadCN)**
   - `src/app/page.tsx` 에서 ShadCN 컴포넌트로 화면 구성
   - 사용자 액션 시 GraphQL 요청을 전송

2. **GraphQL 레이어 (GraphQL Yoga)**
   - `/api/graphql` 라우트 (`src/app/api/graphql/route.ts`)
   - GraphQL 스키마(`typeDefs`)와 리졸버(`resolvers`) 정의
   - 리졸버는 `activeBlogsRepository` 가 선택한 `blogsRepository` 를 호출
   - `createBlog`, `updateBlog`, `deleteBlog` 는 로그인(NextAuth JWT 토큰) 필요

3. **데이터 레이어 (`IBlogsRepository`)**
   - `src/lib/activeBlogsRepository.ts` 가 백엔드를 선택
     - `memory`: `src/lib/blogsRepository.ts` (서버 재시작 시 데이터 초기화)
     - `supabase`: `src/lib/supabaseBlogsRepository.ts`

---

## Supabase 버전 `blogsRepository`

### 1. Supabase 프로젝트 및 테이블 설계

1. Supabase 콘솔에서 새 프로젝트 생성
2. Database → Table Editor 에서 `blogs` 테이블 생성 (예시):
   - `id`: `uuid` (primary key) 또는 `text`
   - `title`: `text`
   - `content`: `text`
   - `is_good`: `boolean` (기본값 `false`)
   - `likes_count`: `int` (기본값 `0`)
   - `dislikes_count`: `int` (기본값 `0`)
   - `image_url`: `text` (nullable)
   - `created_at`: `timestamptz` (기본값 `now()`)
   - `updated_at`: `timestamptz` (기본값 `now()`)

3. (선택) 테마 저장을 원하면 `theme_preferences` 테이블 생성 (예시):
   - `anon_id`: `uuid` 또는 `text` (primary key)
   - `theme`: `text`

3. TypeScript `IBlog` 인터페이스와 매핑할 때, 컬럼명을 스네이크 케이스→카멜 케이스로 변환할 수 있도록 주의

### 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 만들고 다음 값을 설정.

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
BLOGS_REPOSITORY=memory # 또는 supabase
NEXTAUTH_SECRET=...
NEXT_PUBLIC_BLOGS_PAGE_SIZE=10
NEXT_PUBLIC_ENABLE_THEME_SWITCHER=true
NEXT_PUBLIC_THEME_SOURCE=local # 또는 public
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

- `NEXT_PUBLIC_SUPABASE_*` 는 브라우저에서 이미지 업로드(스토리지)에 사용
- `SUPABASE_*` 는 서버에서 DB/스토리지 접근에 사용
- `SERVICE_ROLE_KEY` 는 **서버 전용**으로, 보안상 클라이언트에 노출되면 안 됨
- `BLOGS_REPOSITORY` 로 메모리/수파베이스 구현체를 선택
- `NEXT_PUBLIC_BLOGS_PAGE_SIZE` 는 메인 페이지의 기본 페이지 사이즈로 사용(필수)

### 3. Supabase 클라이언트 설치 및 초기화

```bash
npm install @supabase/supabase-js
```

예: `src/lib/supabaseClient.ts` (서버용 클라이언트):

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseServerClient = createClient(supabaseUrl, supabaseServiceRoleKey);
```

### 4. `blogsRepository`를 Supabase 기반으로 교체하는 전략

현재는 `src/lib/activeBlogsRepository.ts` 를 통해 메모리/수파베이스를 런타임에 선택.

#### 4-1. `getBlogs()`

기존:

```ts
getBlogs(): IBlog[] {
  return blogs.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
```

Supabase 버전 (개념):

- `supabaseServerClient.from("blogs").select("*").order("created_at", { ascending: false })`
- 결과를 `IBlog` 형태로 매핑 (`is_good` → `isGood`, `created_at` → `createdAt` 등)

#### 4-2. `getBlogById(id)`

- `supabaseServerClient.from("blogs").select("*").eq("id", id).single()`
- 없으면 `undefined` 반환

#### 4-3. `createBlog({ title, content })`

- `supabaseServerClient.from("blogs").insert({...}).select().single()`
- `is_good` 기본값은 `true` 로 설정
- 반환된 행을 `IBlog` 로 변환해서 리턴

#### 4-4. `updateBlog(id, input)`

- 입력된 필드(`title`, `content`, `isGood`)만 업데이트
- `updated_at` 는 `now()`로 갱신
- `supabaseServerClient.from("blogs").update({...}).eq("id", id).select().single()`

#### 4-5. `deleteBlog(id)`

- `supabaseServerClient.from("blogs").delete().eq("id", id)`
- 삭제된 행 수를 보고 `true`/`false` 반환

#### 4-6. `toggleBlogGood(id)`

1. 먼저 `getBlogById(id)` 로 현재 `isGood` 값을 읽고
2. `!isGood` 으로 뒤집은 값을 `updateBlog` 또는 직접 Supabase `update` 로 반영
3. 업데이트된 행을 `IBlog` 로 반환

### 5. 나머지 레이어는 그대로 유지

- GraphQL 스키마 (`src/app/api/graphql/route.ts`의 `typeDefs`)
- GraphQL 리졸버 함수 시그니처
- 프론트엔드 (`src/app/page.tsx`)의 GraphQL 쿼리/뮤테이션 및 UI

즉, `IBlogsRepository` 구현체만 바뀌며, UI와 GraphQL 요청 코드는 그대로 작동.
