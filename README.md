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

## React Blog 프로젝트 정리

- **프레임워크**: Next.js (App Router) + React + TypeScript
- **스타일/UI**: Tailwind CSS + ShadCN UI
- **백엔드**: GraphQL Yoga (`/api/graphql`) + TypeScript
- **데이터 레이어**: In-memory `postsRepository` (나중에 Supabase로 교체 예정)

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

# 7) 개발 서버 실행
npm run dev

# 8) 브라우저에서
http://localhost:3000 → 블로그 UI
http://localhost:3000/api/graphql → GraphiQL (GraphQL Yoga)
```

#### 핵심 파일들

- `src/types/index.ts`
  - `IPost` 인터페이스 정의
  - 필드: `id`, `title`, `content`, `isGood`, `createdAt`, `updatedAt`

- `src/lib/postsRepository.ts`
  - In-memory 배열 `posts: IPost[]` 를 사용하는 저장소 레이어
  - 메서드:
    - `getPosts()`
    - `getPostById(id)`
    - `createPost({ title, content })`
    - `updatePost(id, { title?, content?, isGood? })`
    - `deletePost(id)`
    - `togglePostGood(id)`

- `src/app/api/graphql/route.ts`
  - GraphQL Yoga 기반 API 라우트(`/api/graphql`)
  - `typeDefs` 에서 GraphQL 스키마 정의
    - `type Post`
    - `type Query { posts, post }`
    - `type Mutation { createPost, updatePost, deletePost, togglePostGood }`
  - `resolvers` 에서 실제 구현을 `postsRepository` 에 위임
  - `createYoga` + `createSchema` 로 스키마와 리졸버를 묶어 Next.js Route Handler 로 노출

- `src/components/providers.tsx`
  - `Providers` 컴포넌트 정의
  - 전역 Toast(Sonner + ShadCN)를 위해 `<Toaster />` 를 렌더링

- `src/app/layout.tsx`
  - Next.js 루트 레이아웃
  - `<body>` 안에서 `<Providers>{children}</Providers>` 로 전체 앱을 래핑

- `src/app/page.tsx`
  - 블로그 메인 페이지 UI
  - 주요 요소:
    - GraphQL 쿼리/뮤테이션 문자열: `GET_POSTS`, `CREATE_POST`, `UPDATE_POST`, `DELETE_POST`, `TOGGLE_POST_GOOD`
    - `graphqlRequest<TData, TVariables>()` 헬퍼 함수로 `/api/graphql` 호출
    - 상태 관리: `posts`, `loading`, `error`, `createTitle`, `createContent`, `creating`, `editingPost`, `updating`, `deleting`
    - ShadCN 컴포넌트 사용:
      - `Card`, `CardHeader`, `CardContent`, `CardFooter` 로 레이아웃 구성
      - `Input`, `Textarea` 로 글 작성/수정 폼 구현
      - `Button` 으로 생성/수정/삭제 액션
      - `Badge` 로 Good/Bad 상태 표시
      - `Switch` 로 `isGood` 토글
      - `Dialog` 로 글 수정 모달 구현

### 2. 현재 아키텍처 요약

1. **UI 레이어 (Next.js + ShadCN)**
   - `src/app/page.tsx` 에서 ShadCN 컴포넌트로 화면 구성
   - 사용자 액션 시 GraphQL 요청을 전송

2. **GraphQL 레이어 (GraphQL Yoga)**
   - `/api/graphql` 라우트 (`src/app/api/graphql/route.ts`)
   - GraphQL 스키마(`typeDefs`)와 리졸버(`resolvers`) 정의
   - 모든 리졸버는 `postsRepository` 를 호출

3. **데이터 레이어 (현재는 In-memory)**
   - `src/lib/postsRepository.ts`
   - 서버 메모리에만 존재하는 `posts` 배열
   - 서버 재시작 시 데이터 초기화
   - 나중에 Supabase(Postgres)로 교체하기 쉽게 메서드 단위로 캡슐화

---

## Supabase 버전 `postsRepository` 설계 (계획)

### 1. Supabase 프로젝트 및 테이블 설계

1. Supabase 콘솔에서 새 프로젝트 생성
2. Database → Table Editor 에서 `posts` 테이블 생성 (예시):

   - `id`: `uuid` (primary key) 또는 `text`
   - `title`: `text`
   - `content`: `text`
   - `is_good`: `boolean` (기본값 `true`)
   - `created_at`: `timestamptz` (기본값 `now()`)
   - `updated_at`: `timestamptz` (기본값 `now()`)

3. TypeScript `IPost` 인터페이스와 매핑할 때, 컬럼명을 스네이크 케이스→카멜 케이스로 변환할 수 있도록 주의

### 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 만들고 다음 값을 설정.

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

- `ANON_KEY` 는 클라이언트/서버에서 모두 사용 가능 (퍼블릭)
- `SERVICE_ROLE_KEY` 는 **서버 전용**으로, 보안상 클라이언트에 노출되면 안 됨
  - `postsRepository` 는 서버에서만 실행되므로, 필요하다면 SERVICE ROLE 키를 사용할 수 있음.

### 3. Supabase 클라이언트 설치 및 초기화

```bash
npm install @supabase/supabase-js
```

예: `src/lib/supabaseClient.ts` (서버용 클라이언트) 설계 예시:

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseServerClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});
```

### 4. `postsRepository`를 Supabase 기반으로 교체하는 전략

현재 `src/lib/postsRepository.ts` 는 In-memory 구현. 구조는 그대로 유지하되, 내부 구현을 Supabase 쿼리로 바꿈.

#### 4-1. `getPosts()`

기존:

```ts
getPosts(): IPost[] {
  return posts.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
```

Supabase 버전 (개념):

- `supabaseServerClient.from("posts").select("*").order("created_at", { ascending: false })`
- 결과를 `IPost` 형태로 매핑 (`is_good` → `isGood`, `created_at` → `createdAt` 등)

#### 4-2. `getPostById(id)`

- `supabaseServerClient.from("posts").select("*").eq("id", id).single()`
- 없으면 `undefined` 반환

#### 4-3. `createPost({ title, content })`

- `supabaseServerClient.from("posts").insert({...}).select().single()`
- `is_good` 기본값은 `true` 로 설정
- 반환된 행을 `IPost` 로 변환해서 리턴

#### 4-4. `updatePost(id, input)`

- 입력된 필드(`title`, `content`, `isGood`)만 업데이트
- `updated_at` 는 `now()`로 갱신
- `supabaseServerClient.from("posts").update({...}).eq("id", id).select().single()`

#### 4-5. `deletePost(id)`

- `supabaseServerClient.from("posts").delete().eq("id", id)`
- 삭제된 행 수를 보고 `true`/`false` 반환

#### 4-6. `togglePostGood(id)`

1. 먼저 `getPostById(id)` 로 현재 `isGood` 값을 읽고
2. `!isGood` 으로 뒤집은 값을 `updatePost` 또는 직접 Supabase `update` 로 반영
3. 업데이트된 행을 `IPost` 로 반환

### 5. 나머지 레이어는 그대로 유지

- GraphQL 스키마 (`src/app/api/graphql/route.ts`의 `typeDefs`)
- GraphQL 리졸버 함수 시그니처
- 프론트엔드 (`src/app/page.tsx`)의 GraphQL 쿼리/뮤테이션 및 UI

즉, `postsRepository` 내부 구현만 Supabase로 바꾸면, UI와 GraphQL 요청 코드는 그대로 작동.
