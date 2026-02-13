# TanStack Query (React Query) 사용 가이드 / Guide

## 1. 개요 / Overview

### 1.1 TanStack Query란? / What is TanStack Query?

**KO**  
TanStack Query(구 React Query)는 **서버 상태(Server State)** 를 다루기 위한 라이브러리입니다. 다음과 같은 기능을 제공합니다.

- **데이터 패칭(Fetching) 관리**: 로딩/에러/성공 상태 자동 관리
- **캐싱(Caching)**: 동일한 쿼리 키에 대해 결과를 캐시에 보관
- **자동 리패치(Refetch)**: 무효화(invalidate) 또는 리마운트 시 자동으로 데이터 재요청
- **뮤테이션(Mutation)**: 생성/수정/삭제 등 서버 데이터 변경 로직 관리

**EN**  
TanStack Query (formerly React Query) is a library for managing **server state**.
It provides:

- **Data fetching management**: loading / error / success states handled for you
- **Caching**: store results in a cache based on a query key
- **Automatic refetching**: refetch data on invalidation or remount
- **Mutations**: manage create / update / delete server operations

이 프로젝트에서는 **GraphQL API**(`/api/graphql`)와 함께 사용하여 블로그 글 목록을 읽고, 생성/수정/삭제/토글을 처리합니다.  
In this project, it works together with the **GraphQL API** (`/api/graphql`) to read the blog list and handle create/update/delete/toggle operations.

---

## 2. 전역 설정: QueryClient & Provider / Global Setup

### 2.1 `QueryClient` 생성 / Creating the `QueryClient`

- 파일: `src/components/providers.tsx`
- 역할: 애플리케이션 전체에서 사용할 **단일 QueryClient 인스턴스**를 생성하고, `QueryClientProvider`로 감싸는 역할을 합니다.

**핵심 코드 구조 (의사 코드 / pseudo-code)**

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 전역 토스트 UI */}
    </QueryClientProvider>
  );
}
```

**KO 요약**

- `QueryClient`는 **캐시와 네트워크 상태**를 관리하는 핵심 객체입니다.
- 이 프로젝트에서는 `queryClient`를 **모듈 레벨에서 1번만 생성**하여 전역에서 재사용합니다.

**EN Summary**

- `QueryClient` is the core object that manages **cache & network state**.
- In this project, `queryClient` is created **once at module level** and reused globally.

### 2.2 Next.js Root Layout에서 Provider 사용 / Using Provider in Root Layout

- 파일: `src/app/layout.tsx`
- 역할: Next.js `RootLayout`에서 `Providers` 컴포넌트로 전체 앱을 감싸 TanStack Query를 어디서나 사용할 수 있게 합니다.

**핵심 코드 구조 (의사 코드 / pseudo-code)**

```tsx
import { Providers } from "@/components/providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**KO**  
이렇게 하면 **모든 클라이언트 컴포넌트**에서 `useQuery`, `useMutation` 등을 사용할 수 있습니다.

**EN**  
With this setup, **any client component** can use `useQuery`, `useMutation`, and other TanStack Query hooks.

---

## 3. 블로그 목록 조회: `useQuery` 사용 / Fetching Blogs with `useQuery`

- 파일: `src/app/page.tsx`
- 목적: GraphQL `GetBlogs` 쿼리를 사용해 블로그 목록을 가져오고, 캐시합니다.

### 3.1 GraphQL 요청 헬퍼 / GraphQL Request Helper

`graphqlRequest` 함수는 GraphQL API에 POST 요청을 보내고, 타입까지 고려하여 응답을 파싱하는 **공통 유틸 함수**입니다.

```ts
interface IGraphqlError {
  message: string;
}

interface IGraphqlResponse<TData> {
  data?: TData;
  errors?: IGraphqlError[];
}

async function graphqlRequest<TData, TVariables = Record<string, unknown>>(
  query: string,
  variables?: TVariables,
): Promise<TData> {
  const response = await fetch("/api/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed with status ${response.status}`);
  }

  const json = (await response.json()) as IGraphqlResponse<TData>;

  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors.map((error) => error.message).join(", "));
  }

  if (!json.data) {
    throw new Error("GraphQL response missing data.");
  }

  return json.data;
}
```

**KO 포인트**

- `TData`, `TVariables` 제네릭을 사용해 **타입 안전한 GraphQL 호출**을 제공합니다.
- 에러가 있을 경우 `Error`를 던져, `useQuery` / `useMutation`의 `error` 상태로 전달됩니다.

**EN Points**

- Uses generics `TData`, `TVariables` for **type-safe GraphQL calls**.
- Throws `Error` when the response is not OK or contains GraphQL errors, which is then surfaced in `useQuery` / `useMutation` as `error`.

### 3.2 `useQuery`로 블로그 목록 불러오기 / Loading Blog List with `useQuery`

```tsx
import { useQuery } from "@tanstack/react-query";
import type { IBlog } from "@/types";

const GET_BLOGS = /* GraphQL query string */;

export default function HomePage() {
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["blogs"],
    queryFn: () => graphqlRequest<{ blogs: IBlog[] }>(GET_BLOGS),
  });

  const blogs = data?.blogs ?? [];

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;

  return (
    <div>
      {blogs.map((blog) => (
        <div key={blog.id}>{blog.title}</div>
      ))}
    </div>
  );
}
```

**KO 설명**

- `queryKey: ["blogs"]`
  - 이 쿼리의 **고유 식별자**입니다.
  - 나중에 `invalidateQueries({ queryKey: ["blogs"] })`로 다시 불러오기(refetch) 할 수 있습니다.
- `queryFn`
  - 실제 데이터 패칭 함수입니다.
  - 여기서는 `graphqlRequest<{ blogs: IBlog[] }>(GET_BLOGS)`로 타입을 명시합니다.
- 반환값
  - `data`: `{ blogs: IBlog[] } | undefined`
  - `isLoading`: 로딩 여부
  - `error`: `Error | null`

**EN Explanation**

- `queryKey: ["blogs"]`
  - A **unique identifier** for this query.
  - Later, you can call `invalidateQueries({ queryKey: ["blogs"] })` to force a refetch.
- `queryFn`
  - The actual data fetching function.
  - Here we call `graphqlRequest<{ blogs: IBlog[] }>(GET_BLOGS)` with explicit typing.
- Returned values
  - `data`: `{ blogs: IBlog[] } | undefined`
  - `isLoading`: loading state
  - `error`: `Error | null`

---

## 4. 뮤테이션: 생성/수정/삭제/토글 / Mutations: Create/Update/Delete/Toggle

이 프로젝트에서는 4개의 주요 뮤테이션을 사용합니다.

- **CreateBlog**: 새 블로그 생성
- **UpdateBlog**: 기존 블로그 수정
- **DeleteBlog**: 블로그 삭제
- **ToggleBlogGood**: `isGood` 토글 (좋아요/싫어요 상태 및 `likesCount` / `dislikesCount` 카운트 업데이트)

모두 공통적으로 **성공 시 `invalidateQueries({ queryKey: ["blogs"] })`**를 호출하여 목록을 최신 상태로 유지합니다.

### 4.1 공통 패턴 / Common Pattern

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";

const queryClient = useQueryClient();

const someMutation = useMutation({
  mutationFn: (variables: SomeVariablesType) =>
    graphqlRequest<SomeResultType, SomeVariablesForGraphql>(SOME_MUTATION, variables),
  onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: ["blogs"] });
  },
});
```

**KO 설명**

- `useQueryClient()`로 전역 `QueryClient` 인스턴스를 가져옵니다.
- `mutationFn`에서 `graphqlRequest`를 호출해 실제 서버 요청을 수행합니다.
- `onSuccess`에서 **해당 뮤테이션과 관련 있는 쿼리 키**(`"blogs"`)를 무효화하여, 캐시된 목록을 자동으로 재요청(refetch)합니다.

**EN Explanation**

- Use `useQueryClient()` to get the global `QueryClient` instance.
- `mutationFn` calls `graphqlRequest` to perform the actual server request.
- In `onSuccess`, invalidate the related query key (`"blogs"`) so that the cached list is refetched.

### 4.2 예시 1: 블로그 생성 / Example 1: Create Blog

```tsx
const createBlogMutation = useMutation({
  mutationFn: (variables: { title: string; content: string }) =>
    graphqlRequest<{ createBlog: { id: string } }, { input: { title: string; content: string } }>(
      CREATE_BLOG,
      {
        input: variables,
      },
    ),
  onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: ["blogs"] });
  },
});

// 사용 예시 / usage
function handleCreate() {
  createBlogMutation.mutate({ title: "Hello", content: "World" });
}
```

### 4.3 예시 2: 블로그 수정 / Example 2: Update Blog

```tsx
const updateBlogMutation = useMutation({
  mutationFn: (variables: { id: string; title: string; content: string }) =>
    graphqlRequest<
      { updateBlog: IBlog },
      { id: string; input: { title: string; content: string } }
    >(UPDATE_BLOG, {
      id: variables.id,
      input: { title: variables.title, content: variables.content },
    }),
  onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: ["blogs"] });
  },
});
```

### 4.4 예시 3: 블로그 삭제 / Example 3: Delete Blog

```tsx
const deleteBlogMutation = useMutation({
  mutationFn: (variables: { id: string }) =>
    graphqlRequest<{ deleteBlog: boolean }, { id: string }>(DELETE_BLOG, {
      id: variables.id,
    }),
  onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: ["blogs"] });
  },
});
```

### 4.5 예시 4: `isGood` 토글 / Example 4: Toggle `isGood`

```tsx
const toggleBlogGoodMutation = useMutation({
  mutationFn: (variables: { id: string }) =>
    graphqlRequest<{ toggleBlogGood: { id: string } }, { id: string }>(TOGGLE_BLOG_GOOD, {
      id: variables.id,
    }),
  onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: ["blogs"] });
  },
});
```

**KO 공통 포인트**

- 모든 뮤테이션에서 `onSuccess` 시 **같은 쿼리 키(`"blogs"`)의 캐시를 무효화**합니다.
- 이렇게 하면 별도 수동 상태 관리 없이 **UI가 항상 서버 상태와 동기화**됩니다.

**EN Common Points**

- All mutations call `invalidateQueries({ queryKey: ["blogs"] })` on success.
- This ensures the UI stays **in sync with the server state** without manual state management.

---

## 5. 캐시 및 리패치 전략 / Cache & Refetch Strategy

**KO**

- 이 프로젝트는 **간단하고 직관적인 전략**을 사용합니다.
  - 블로그 관련 뮤테이션이 성공하면 항상 `"blogs"` 쿼리를 무효화합니다.
  - 그 결과, 리스트 화면은 최신 상태가 보장됩니다.
- 더 고급 전략으로는 다음도 고려할 수 있습니다.
  - **낙관적 업데이트(Optimistic Update)**: 캐시를 먼저 업데이트 후 실패 시 롤백
  - **부분 캐시 업데이트**: `invalidate` 대신 `setQueryData`로 필요한 항목만 수정

**EN**

- The project uses a **simple and intuitive strategy**:
  - After any blog-related mutation succeeds, invalidate the `"blogs"` query.
  - As a result, the list screen is always up to date.
- More advanced strategies (not implemented yet but possible):
  - **Optimistic updates**: update the cache first and roll back on failure
  - **Partial cache updates**: use `setQueryData` instead of `invalidate` when only a small part changes

---

## 6. 이 프로젝트에서 TanStack Query를 확장하는 팁 / Tips to Extend TanStack Query in This Project

### 6.1 새로운 쿼리 추가 / Adding a New Query

**패턴 (Pattern)**

1. GraphQL 쿼리 문자열 정의 (예: `GET_BLOG_BY_ID`).
2. 필요하다면 타입을 `src/types/index.ts`에 정의 (`I` prefix 규칙 준수).
3. `useQuery`에서 `queryKey` 및 `queryFn` 설정.

```tsx
const GET_BLOG_BY_ID = /* GraphQL query */;

function useBlog(id: string) {
  return useQuery({
    queryKey: ["blog", id],
    queryFn: () =>
      graphqlRequest<{ blog: IBlog }>(GET_BLOG_BY_ID, { id }),
    enabled: !!id, // id가 있을 때만 패칭 / only fetch when id exists
  });
}
```

### 6.2 새로운 뮤테이션 추가 / Adding a New Mutation

**패턴 (Pattern)**

1. GraphQL 뮤테이션 문자열 정의.
2. `useMutation`에서 `mutationFn` 구현.
3. 필요 시 관련 `queryKey`를 `invalidateQueries`로 무효화.

```tsx
function useSomeBlogMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: SomeVariables) =>
      graphqlRequest<SomeResult, SomeGraphqlVariables>(SOME_MUTATION, variables),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blogs"] });
    },
  });
}
```

---

## 7. 정리 / Summary

**KO**

- `src/components/providers.tsx` 에서 `QueryClient`와 `QueryClientProvider`를 설정하여 전역에서 TanStack Query를 사용할 수 있게 했습니다.
- `src/app/page.tsx`에서는
  - `useQuery`를 사용해 `"blogs"` 쿼리 키로 블로그 목록을 패칭하고
  - `useMutation` 네 개를 사용해 생성/수정/삭제/토글 뮤테이션을 처리합니다.
  - 모든 뮤테이션은 성공 시 `invalidateQueries({ queryKey: ["blogs"] })`를 호출하여 목록을 최신 상태로 유지합니다.

**EN**

- `src/components/providers.tsx` sets up `QueryClient` and `QueryClientProvider` so TanStack Query is available globally.
- In `src/app/page.tsx`:
  - `useQuery` fetches the blog list with the `"blogs"` query key.
  - Four `useMutation` hooks handle create/update/delete/toggle operations.
  - All mutations call `invalidateQueries({ queryKey: ["blogs"] })` on success, keeping the list up to date.

이 문서를 바탕으로 프로젝트 내 TanStack Query 사용 패턴을 참고하여,
새로운 기능을 추가할 때도 **일관된 쿼리 키 네이밍**과 **타입 안전한 GraphQL 호출** 패턴을 유지하는 것을 추천합니다.  
Based on this document, you can follow the existing TanStack Query patterns when adding new features,
keeping **consistent query key naming** and **type-safe GraphQL calls** throughout the project.
