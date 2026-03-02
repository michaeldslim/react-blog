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

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

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
  - 필드: `id`, `title`, `content`, `isGood`, `likesCount`, `dislikesCount`, `imageUrl`, `createdAt`, `updatedAt`

- `src/lib/blogsRepository.ts`
  - In-memory 배열 `blogs: IBlog[]` 를 사용하는 `IBlogsRepository` 구현체 (`blogsRepository` export)
  - 메서드:
    - `getBlogs()`
    - `getBlogsPaginated(page, pageSize)`
    - `getBlogById(id)`
    - `getBlogDates()`
    - `createBlog({ title, content, imageUrl? })`
    - `updateBlog(id, { title?, content?, isGood?, imageUrl? })`
    - `deleteBlog(id)`
    - `toggleBlogGood(id)`
    - `likeBlog(id)`
    - `dislikeBlog(id)`

- `src/app/api/graphql/route.ts`
  - GraphQL Yoga 기반 API 라우트(`/api/graphql`)
  - `typeDefs` 에서 GraphQL 스키마 정의
    - `type Blog`
    - `type BlogsPage`, `type BlogDateCount`
    - `type Query { blogs(page, pageSize), blog(id), blogDates }`
    - `type Mutation { createBlog, updateBlog, deleteBlog, toggleBlogGood, likeBlog, dislikeBlog }`
  - `resolvers` 에서 실제 구현을 `activeBlogsRepository` 가 선택한 `blogsRepository` 에 위임
  - `createYoga` + `createSchema` 로 스키마와 리졸버를 묶어 Next.js Route Handler 로 노출

- `src/lib/activeBlogsRepository.ts`
  - `BLOGS_REPOSITORY` 환경 변수에 따라 `blogsRepository` 구현체를 선택
    - 기본값: `memory`
    - `supabase` 설정 시: `supabaseBlogsRepository` 사용

- `src/lib/supabaseBlogsRepository.ts`
  - Supabase(Postgres + Storage) 기반 `IBlogsRepository` 구현체
  - `updateBlog` / `deleteBlog` 에서 이미지 변경/삭제 시 Storage 객체 정리

- `src/app/api/auth/[...nextauth]/route.ts`
  - NextAuth API 라우트
  - Google 로그인 제공

- `src/components/providers.tsx`
  - `Providers` 컴포넌트 정의
  - 전역 Toast(Sonner + ShadCN)를 위해 `<Toaster />` 를 렌더링
  - TanStack Query의 `QueryClientProvider` 로 전체 앱을 감싸 전역 쿼리 클라이언트 제공
  - NextAuth의 `SessionProvider` 로 로그인 세션 컨텍스트 제공

- `src/lib/browserSupabaseClient.ts`
  - 브라우저에서 Supabase Storage 업로드를 위한 클라이언트
  - `uploadBlogImage(file)` 로 public URL 생성

- `src/components/blog-calendar.tsx`
  - 글 작성 날짜 기반 캘린더 필터 UI

- `src/app/layout.tsx`
  - Next.js 루트 레이아웃
  - `<body>` 안에서 `<Providers>{children}</Providers>` 로 전체 앱을 래핑

- `src/app/page.tsx`
  - 블로그 메인 페이지 UI
  - 주요 요소:
    - GraphQL 쿼리/뮤테이션 문자열: `GET_BLOGS`, `CREATE_BLOG`, `UPDATE_BLOG`, `DELETE_BLOG`, `TOGGLE_BLOG_GOOD`
    - `graphqlRequest<TData, TVariables>()` 헬퍼 함수로 `/api/graphql` 호출
    - TanStack Query(`useQuery`, `useMutation`, `useQueryClient`)로 blogs 데이터 로딩/캐싱 및 뮤테이션 관리
    - 로컬 상태는 작성 폼 및 수정 다이얼로그(`createTitle`, `createContent`, `editingBlog`, `updating`)에 집중
    - ShadCN 컴포넌트 사용:
      - `Card`, `CardHeader`, `CardContent`, `CardFooter` 로 레이아웃 구성
      - `Input`, `Textarea` 로 글 작성/수정 폼 구현
      - `Button` 으로 생성/수정/삭제 액션
      - 하단에 좋아요/싫어요 아이콘 버튼(YouTube 스타일)과 `likesCount` / `dislikesCount` 카운트를 보여주는 Pill UI
      - `Dialog` 로 글 수정 모달 구현

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
