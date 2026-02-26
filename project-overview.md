# React Blog Project Guide

이 문서는 React Blog 프로젝트의 전체적인 구조, 동작 방식, 설치 방법 등을 자세히 설명하는 가이드입니다.

## 1. 설치 과정과 방법

이 프로젝트는 Next.js (App Router) 기반으로 작성되었습니다. 아래의 단계를 따라 프로젝트를 로컬 환경에 설치하고 실행할 수 있습니다.

### 사전 요구 사항
- Node.js (v18 이상 권장)
- npm, yarn, pnpm 또는 bun 패키지 매니저

### 설치 및 실행
1. **의존성 설치**
   ```bash
   npm install
   ```
2. **환경 변수 설정**
   루트 디렉토리에 `.env.local` 파일을 생성하고 다음 환경 변수를 설정합니다.
   ```env
   NEXT_PUBLIC_BLOGS_PAGE_SIZE=10
   NEXT_PUBLIC_SUPABASE_URL=당신의_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY=당신의_SUPABASE_ANON_KEY
   NEXTAUTH_SECRET=당신의_NEXTAUTH_시크릿
   BLOGS_REPOSITORY=memory # 또는 supabase (데이터 저장소 선택)
   ```
3. **개발 서버 실행**
   ```bash
   npm run dev
   ```
4. 브라우저에서 `http://localhost:3000`으로 접속하여 확인합니다.
5. GraphQL API 테스트는 `http://localhost:3000/api/graphql`에서 GraphiQL 인터페이스를 통해 할 수 있습니다.

---

## 2. 아키텍처와 구조

이 프로젝트는 **프론트엔드(Client Components)**와 **백엔드 API(GraphQL Yoga)**가 하나의 Next.js 애플리케이션 내에 공존하는 풀스택 구조를 가집니다.

- **Frontend**: Next.js App Router, React, Tailwind CSS, ShadCN UI
- **State/Data Management**: TanStack Query (React Query)
- **API Layer**: GraphQL Yoga를 Next.js Route Handler(`app/api/graphql/route.ts`)에 통합
- **Data Layer**: Repository 패턴을 적용하여 데이터 소스(`memory` 또는 `supabase`)를 추상화

### 폴더 구조
- `src/app`: Next.js App Router 진입점 (페이지 및 API 라우트)
- `src/components`: UI 컴포넌트 (ShadCN UI, 커스텀 컴포넌트)
- `src/lib`: 비즈니스 로직, 데이터 리포지토리, 헬퍼 함수, 클라이언트 설정
- `src/types`: TypeScript 타입 및 인터페이스 정의

---

## 3. 사용된 라이브러리와 프레임워크

- **프레임워크**: Next.js (v16.1.6), React (v19.2.3)
- **스타일링**: Tailwind CSS (v4), clsx, tailwind-merge
- **UI 컴포넌트**: Radix UI 기반의 ShadCN 컴포넌트 (`@radix-ui/react-*`), Lucide React (아이콘)
- **API (GraphQL)**: `graphql`, `graphql-yoga`
- **데이터 페칭 및 상태 관리**: `@tanstack/react-query`, `@apollo/client` (일부 클라이언트 설정용)
- **폼 및 검증**: `react-hook-form`, `@hookform/resolvers`, `zod`
- **인증**: `next-auth` (v4.24.11)
- **데이터베이스 (옵션)**: `@supabase/supabase-js` (Supabase 사용 시)
- **날짜 처리**: `date-fns`, `react-day-picker`
- **알림**: `sonner`

---

## 4. 사용자가 블로그 포스트를 하는 과정 (동작 흐름)

사용자가 메인 페이지(`src/app/page.tsx`)에서 새 블로그 포스트를 작성하는 전체 과정은 다음과 같습니다.

1. **입력**: 사용자가 제목(`title`), 내용(`content`), 그리고 이미지(선택 사항)를 폼에 입력합니다.
2. **이미지 업로드 (선택)**: 이미지가 첨부된 경우, 클라이언트 브라우저에서 `uploadBlogImage` 함수(`src/lib/browserSupabaseClient.ts`)를 호출하여 Supabase Storage에 직접 이미지를 업로드하고 URL을 받아옵니다.
3. **GraphQL Mutation 호출**: `createBlogMutation` (TanStack Query)이 실행되어 `graphqlRequest` 함수를 통해 `/api/graphql` 엔드포인트로 `CREATE_BLOG` GraphQL 뮤테이션을 전송합니다.
4. **API 라우트 처리**: `src/app/api/graphql/route.ts`에서 요청을 받습니다. GraphQL Yoga가 요청을 파싱하고, `createBlog` 리졸버를 호출합니다.
5. **권한 확인**: 리졸버 내에서 `next-auth`의 토큰을 확인하여 인증된 사용자만 글을 작성할 수 있도록 합니다.
6. **Repository 호출**: `blogsRepository.createBlog(input)`을 호출합니다. 현재 환경 변수(`BLOGS_REPOSITORY`)에 따라 `memory` 또는 `supabase` 리포지토리가 선택됩니다.
7. **데이터 저장**: 선택된 리포지토리(예: `supabaseBlogsRepository`)가 실제 데이터베이스에 포스트 데이터를 저장합니다.
8. **응답 및 캐시 무효화**: 저장이 성공하면 새 블로그 ID가 프론트엔드로 반환되고, `onSuccess` 콜백에서 TanStack Query의 `queryClient.invalidateQueries({ queryKey: ["blogs"] })`를 호출하여 화면의 포스트 목록을 최신 상태로 갱신합니다.

---

## 5. 기능들의 연결 방식

프로젝트의 각 레이어는 다음과 같이 연결되어 있습니다.

- **UI ↔ GraphQL Client**: `src/app/page.tsx`에서 정의된 GraphQL 쿼리 문자열과 커스텀 `graphqlRequest` 함수를 사용하여 통신합니다. TanStack Query를 래퍼로 사용하여 로딩, 에러 상태 및 캐싱을 관리합니다.
- **GraphQL Client ↔ GraphQL Server**: HTTP POST 요청을 통해 `/api/graphql` 엔드포인트와 통신합니다.
- **GraphQL Server ↔ Repository**: `src/app/api/graphql/route.ts`의 리졸버들은 직접 DB에 쿼리하지 않고, `src/lib/activeBlogsRepository.ts`에서 제공하는 `blogsRepository` 인터페이스를 호출합니다.
- **Repository ↔ Database**: `activeBlogsRepository.ts`는 환경 설정에 따라 메모리 배열(`blogsRepository.ts`) 또는 Supabase(`supabaseBlogsRepository.ts`) 구현체를 동적으로 주입하여 실제 데이터 CRUD를 수행합니다.

---

## 6. 주요 파일들의 쓰임새와 역할

- **`src/app/page.tsx`**: 메인 화면 컴포넌트. 포스트 목록 조회, 생성, 수정, 삭제 폼 및 로직(TanStack Query 기반)을 담당합니다.
- **`src/app/layout.tsx`**: 애플리케이션의 루트 레이아웃. 공통 HTML 구조, 글로벌 CSS, 그리고 `Providers` 컴포넌트를 감싸 전역 상태 및 테마를 적용합니다.
- **`src/app/api/graphql/route.ts`**: GraphQL Yoga 서버 설정 파일. 스키마(`typeDefs`)와 리졸버(`resolvers`)를 정의하고, Next.js의 GET/POST 라우트 핸들러로 노출합니다.
- **`src/lib/activeBlogsRepository.ts`**: 의존성 주입 역할을 하는 파일. `BLOGS_REPOSITORY` 환경 변수에 따라 메모리 또는 Supabase 리포지토리 인스턴스를 내보냅니다.
- **`src/lib/blogsRepository.ts`**: (개발/테스트용) 메모리 기반의 블로그 데이터 저장소 구현체입니다. 서버 재시작 시 초기화됩니다.
- **`src/lib/supabaseBlogsRepository.ts`**: (운영용) Supabase PostgreSQL 데이터베이스와 연동하는 블로그 데이터 저장소 구현체입니다. Storage(이미지) 삭제 로직도 포함되어 있습니다.
- **`src/types/index.ts`**: 블로그 포스트(`IBlog`), 페이지네이션(`IBlogsPage`), 리포지토리 인터페이스(`IBlogsRepository`) 등 핵심 TypeScript 타입을 정의합니다.

---

## 7. 주요 컴포넌트들이 하는 일

- **`src/components/providers.tsx`**: 앱 전체에 필요한 Context Providers(TanStack Query 클라이언트, Next-Auth 세션, 테마, Sonner Toaster)를 초기화하고 하위 컴포넌트에 공급합니다.
- **`src/components/markdown-content.tsx`**: 포스트의 텍스트 콘텐츠(`content`)를 파싱하여, 마크다운 형식의 코드 블록(` ``` `)과 일반 텍스트를 구분하여 렌더링하는 컴포넌트입니다.
- **`src/components/blog-calendar.tsx`**: 블로그 작성 날짜 데이터를 기반으로 달력을 렌더링하고, 특정 날짜 선택 시 해당 날짜의 포스트만 필터링되도록 URL 파라미터(`?date=...`)를 업데이트하는 UI 컴포넌트입니다.
- **`src/components/auth-buttons.tsx`**: Next-Auth를 이용한 로그인/로그아웃 버튼 UI를 제공합니다.
- **`src/components/ui/*`**: ShadCN UI CLI로 자동 생성된 재사용 가능한 기본 UI 컴포넌트들(Button, Card, Dialog, Input, Textarea 등)입니다.

---

## 8. 핵심 코드 설명

### GraphQL 요청 헬퍼 함수 (`src/app/page.tsx`)
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
  // ... 에러 처리 및 응답 반환 로직
}
```
*설명*: 별도의 무거운 GraphQL 클라이언트 라이브러리(Apollo 등)를 전체적으로 사용하지 않고, 내장 `fetch` API를 사용하여 직접 서버와 통신하는 경량화된 헬퍼 함수입니다. TanStack Query의 `queryFn` 및 `mutationFn`에서 주로 호출됩니다.

### 리포지토리 패턴 (`src/types/index.ts` & `src/lib/activeBlogsRepository.ts`)
```typescript
// 인터페이스 정의
export interface IBlogsRepository {
  getBlogs(): Promise<IBlog[]>;
  createBlog(input: { title: string; content: string; imageUrl?: string | null }): Promise<IBlog>;
  // ... 기타 메서드
}

// 런타임에 구현체 선택
const backend = process.env.BLOGS_REPOSITORY ?? "memory";
export const blogsRepository: IBlogsRepository =
  backend === "supabase" ? supabaseBlogsRepository : memoryBlogsRepository;
```
*설명*: 데이터 접근 로직을 인터페이스(`IBlogsRepository`)로 추상화하여, GraphQL 리졸버 코드를 수정하지 않고도 환경 변수 하나만으로 메모리 DB와 실제 DB(Supabase)를 쉽게 전환할 수 있게 설계되었습니다.

### 페이지네이션 및 필터링 적용 쿼리 (`src/app/page.tsx`)
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
*설명*: URL 쿼리 파라미터(`page`, `pageSize`)에 따라 현재 페이지를 계산하고, TanStack Query를 통해 해당 페이지의 데이터를 가져옵니다. 또한 `?date=` 파라미터가 있을 경우 클라이언트 단에서 해당 날짜의 포스트만 필터링하여 보여줍니다.
