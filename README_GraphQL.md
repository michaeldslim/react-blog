# React Blog GraphQL Manual / 리액트 블로그 GraphQL 매뉴얼

---

## 1. GraphQL in this project – Big Picture / 전체 흐름

- **KO**: 이 프로젝트는 **Next.js + graphql-yoga**를 사용해서 `/api/graphql` 경로에 GraphQL 서버를 만들고, 프론트엔드에서는 `fetch("/api/graphql")`를 통해 직접 GraphQL 쿼리/뮤테이션을 호출합니다. 추가로, `ApolloClient` 설정 파일도 있습니다.
- **EN**: This project uses **Next.js + graphql-yoga** to expose a GraphQL server at `/api/graphql`. On the frontend, it calls this endpoint using `fetch("/api/graphql")` with raw query strings. There is also an `ApolloClient` setup file.

**Main parts / 핵심 파일들**

1. **GraphQL API route (server)**
   - `src/app/api/graphql/route.ts`
   - GraphQL 스키마(`typeDefs`)와 리졸버(`resolvers`)를 정의하고, `createYoga`로 `/api/graphql` 엔드포인트를 만듭니다.
2. **Data repository (data source)**
   - `src/lib/blogsRepository.ts` + `src/lib/activeBlogsRepository.ts`
   - 실제 블로그 데이터를 in-memory로 관리하고, GraphQL 리졸버에서 이 저장소를 사용합니다.
3. **GraphQL client usage (frontend)**
   - `src/app/page.tsx`
   - GraphQL 쿼리/뮤테이션 문자열을 정의하고, `graphqlRequest` 함수로 `/api/graphql`에 요청을 보냅니다.
   - `@tanstack/react-query`를 사용해 쿼리/뮤테이션을 관리합니다.
4. **Apollo Client setup (optional)**
   - `src/lib/apolloClient.ts`
   - `/api/graphql`에 연결된 `ApolloClient` 인스턴스를 정의하지만, 현재 `page.tsx`에서 직접 사용하지는 않습니다.

---

## 2. GraphQL Server – `src/app/api/graphql/route.ts`

```ts
import { createSchema, createYoga } from "graphql-yoga";
import type { NextRequest } from "next/server";
import { blogsRepository } from "@/lib/activeBlogsRepository";

const typeDefs = /* GraphQL */ `
  ...
`;

const resolvers = { ... };

const { handleRequest } = createYoga<{
  req: NextRequest;
}>({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: "/api/graphql",
});

export { handleRequest as GET, handleRequest as POST };

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
```

### 2.1 Imports / 임포트

1. `import { createSchema, createYoga } from "graphql-yoga";`
   - **KO**: `graphql-yoga` 라이브러리에서 **스키마 생성 함수**와 **서버 핸들러 생성 함수**를 가져옵니다.
   - **EN**: Imports the **schema builder** and **server handler factory** from `graphql-yoga`.

2. `import type { NextRequest } from "next/server";`
   - **KO**: Next.js의 `NextRequest` 타입을 가져와서, `createYoga`에 요청 타입으로 사용합니다. (타입만 필요하기 때문에 `import type` 사용)
   - **EN**: Imports the `NextRequest` type from Next.js to type the request object passed into `createYoga`.

3. `import { blogsRepository } from "@/lib/activeBlogsRepository";`
   - **KO**: 실제 데이터 접근을 담당하는 `blogsRepository`를 가져옵니다. GraphQL 리졸버 내부에서 이 저장소를 사용합니다.
   - **EN**: Imports `blogsRepository`, which is the data access layer used inside the GraphQL resolvers.

### 2.2 `typeDefs` – GraphQL Schema Definition / 스키마 정의

```ts
const typeDefs = /* GraphQL */ `
  type Blog {
    id: ID!
    title: String!
    content: String!
    isGood: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    blogs: [Blog!]!
    blog(id: ID!): Blog
  }

  input CreateBlogInput {
    title: String!
    content: String!
  }

  input UpdateBlogInput {
    title: String
    content: String
    isGood: Boolean
  }

  type Mutation {
    createBlog(input: CreateBlogInput!): Blog!
    updateBlog(id: ID!, input: UpdateBlogInput!): Blog!
    deleteBlog(id: ID!): Boolean!
    toggleBlogGood(id: ID!): Blog!
  }
`;
```

- `/* GraphQL */` 주석
  - **KO**: 이 주석은 IDE나 툴링이 백틱 문자열을 **GraphQL 문법으로 하이라이팅**하도록 도와줍니다.
  - **EN**: This comment hints IDE/tooling to treat the template literal as **GraphQL syntax** for highlighting and validation.

#### 2.2.1 `type Blog`

각 필드는 GraphQL 타입과 `!`(non-null)를 가집니다.

- `type Blog {`
  - **KO**: 블로그 엔티티를 나타내는 **객체 타입**입니다.
  - **EN**: Defines the **object type** for a blog.

- `id: ID!`
  - **KO**: 고유 식별자. `ID` 스칼라 타입이며 `!`로 null 이 될 수 없음을 의미합니다.
  - **EN**: Unique identifier of type `ID`; `!` means it cannot be null.

- `title: String!`, `content: String!`
  - **KO**: 제목과 내용. 모두 필수(`!`)입니다.
  - **EN**: Title and content, both required fields.

- `isGood: Boolean!`
  - **KO**: 이 글이 "좋은" 글인지 여부를 나타내는 불리언 값입니다.
  - **EN**: Boolean flag indicating whether the post is considered “good”.

- `createdAt: String!`, `updatedAt: String!`
  - **KO**: 생성/수정 시각을 문자열(ISO 날짜 문자열)로 저장합니다.
  - **EN**: Creation and update timestamps stored as strings (ISO date strings).

#### 2.2.2 `type Query`

```graphql
type Query {
  blogs: [Blog!]!
  blog(id: ID!): Blog
}
```

- `blogs: [Blog!]!`
  - **KO**: `Blog` 타입의 배열을 반환하는 쿼리입니다.
    - `Blog!` : 배열 안의 각 요소는 null 이 될 수 없습니다.
    - `[Blog!]!` : 배열 자체도 null 이 아니어야 합니다.
  - **EN**: Returns a non-null list of non-null `Blog` objects.

- `blog(id: ID!): Blog`
  - **KO**: 단일 블로그를 ID로 조회하는 쿼리입니다. ID는 필수이고(`ID!`), 결과는 없을 수도 있으므로 `Blog` (nullable)입니다.
  - **EN**: Fetches a single blog by ID. ID argument is required; return type is `Blog` which may be null if not found.

#### 2.2.3 `input` types – `CreateBlogInput`, `UpdateBlogInput`

```graphql
input CreateBlogInput {
  title: String!
  content: String!
}

input UpdateBlogInput {
  title: String
  content: String
  isGood: Boolean
}
```

- **KO**: `input` 타입은 **뮤테이션에 전달하는 복잡한 인자 객체**를 정의하는 데 사용됩니다.
- **EN**: `input` types describe complex argument objects used by mutations.

- **KO (조금 더 자세히)**:  
  - `input`은 일반 `type`과 비슷하게 보이지만 **"입력 전용 타입"** 입니다.  
  - 스키마에서 `input CreateBlogInput` 처럼 정의해 두면, 뮤테이션 시그니처에서 `input: CreateBlogInput!` 처럼 **인자(argument)의 타입으로만 사용할 수 있습니다.**  
  - GraphQL 스펙에서 `input` 객체 타입은 **인자/변수 위치에서 사용되도록 설계되었고**, 일반적으로 필드의 반환 타입(응답)으로는 사용하지 않습니다.  
  - 이 프로젝트에서는:
    - `CreateBlogInput` → 새 블로그를 만들 때 필요한 필수 입력(제목, 내용)을 하나의 객체로 모아 표현.  
    - `UpdateBlogInput` → 업데이트 시 일부 필드만 선택적으로 보낼 수 있도록, 모든 필드를 optional로 둔 입력 객체.  
  - 이런 식으로 `input` 타입을 쓰면, 인자가 많아졌을 때도 구조가 깔끔해지고, 프론트엔드/백엔드가 **공유하는 입력 스펙**을 명확하게 유지할 수 있습니다.

- **EN (in more detail)**:  
  - An `input` looks similar to a regular `type`, but it defines an **input-only object type**.  
  - Once you define `input CreateBlogInput` in the schema, you can use it in a mutation signature like `input: CreateBlogInput!` — **as the type of an argument only**.  
  - Per the GraphQL spec, input object types are intended for **arguments (and variables)**, not as field return types. They are mostly used for mutations and sometimes for complex query filters.  
  - In this project:
    - `CreateBlogInput` groups the required fields for creating a blog (title, content) into a single argument object.  
    - `UpdateBlogInput` allows partial updates by making every field optional so the client can send only the fields it wants to change.  
  - Using `input` types keeps argument lists small and self-describing, and provides a clear, shared contract between frontend and backend for what shape of data is expected.

`CreateBlogInput`

- `title: String!`, `content: String!`
  - **KO**: 새 글을 만들 때 제목과 내용은 필수입니다.
  - **EN**: Both title and content are required when creating a blog.

`UpdateBlogInput`

- `title: String`, `content: String`, `isGood: Boolean`
  - **KO**: 업데이트 시에는 각각의 필드가 선택 사항입니다. 어떤 필드만 보낼 수도 있습니다.
  - **EN**: All fields are optional, so a mutation can update only a subset of fields.

#### 2.2.4 `type Mutation`

```graphql
type Mutation {
  createBlog(input: CreateBlogInput!): Blog!
  updateBlog(id: ID!, input: UpdateBlogInput!): Blog!
  deleteBlog(id: ID!): Boolean!
  toggleBlogGood(id: ID!): Blog!
}
```

각 필드는 **동작(함수)**처럼 동작합니다.

- `createBlog(input: CreateBlogInput!): Blog!`
  - **KO**: `CreateBlogInput`을 받아 새 블로그를 생성하고, 생성된 `Blog`를 반환합니다.
  - **EN**: Creates a new blog and returns the created `Blog`.

- `updateBlog(id: ID!, input: UpdateBlogInput!): Blog!`
  - **KO**: 특정 ID의 블로그를 찾아 일부 필드를 수정하고, 수정된 `Blog`를 반환합니다.
  - **EN**: Updates a blog with the given ID using the provided fields and returns the updated `Blog`.

- `deleteBlog(id: ID!): Boolean!`
  - **KO**: ID에 해당하는 블로그를 삭제하고, 성공 여부를 불리언으로 반환합니다.
  - **EN**: Deletes the blog with the given ID and returns a boolean indicating success.

- `toggleBlogGood(id: ID!): Blog!`
  - **KO**: `isGood` 값을 반전시킨 후, 업데이트된 `Blog`를 반환합니다.
  - **EN**: Toggles the `isGood` field and returns the updated `Blog`.

### 2.2.5 Root type names – `Query`, `Mutation` / 루트 타입 이름 규칙

- **KO**: GraphQL 스펙에서는 루트 쿼리 타입/뮤테이션 타입의 기본 이름을 각각 `Query`, `Mutation`으로 정해 두고 있습니다. 이 프로젝트의 `typeDefs`는 별도의 `schema { ... }` 블록 없이 **이 기본 규칙에 의존**하고 있습니다.
  - 따라서 지금처럼 `type Query { ... }`, `type Mutation { ... }`를 정의하는 경우, GraphQL 엔진은 자동으로 이 타입들을 루트 쿼리/뮤테이션 타입으로 사용합니다.
- **EN**: By spec, GraphQL’s default root type names are `Query` and `Mutation`. In this project, `typeDefs` do **not** define an explicit `schema { ... }` block, so the server relies on these default names.
  - Because you define `type Query { ... }` and `type Mutation { ... }`, the GraphQL engine automatically treats them as the root query and mutation types.

#### Can we rename them? / 이름을 바꿀 수 있나?

- **KO**: 스펙상으로는 루트 타입 이름을 마음대로 정할 수 있습니다. 예를 들어 `type MyQuery { ... }`, `type MyMutation { ... }`처럼 만들 수도 있습니다. 다만 이 경우에는 **반드시** 다음처럼 `schema { ... }` 블록으로 어떤 타입이 루트인지 명시해야 합니다:  
  `schema { query: MyQuery mutation: MyMutation }`  
  그리고 리졸버 객체에서도 `Query`, `Mutation` 대신 `MyQuery`, `MyMutation` 키를 사용해야 합니다.
- **EN**: In theory you can choose any names, e.g. `type MyQuery`, `type MyMutation`, but then you **must** add a `schema { ... }` block like:  
  `schema { query: MyQuery mutation: MyMutation }`  
  and ensure your resolvers object uses `MyQuery` / `MyMutation` keys instead of `Query` / `Mutation`.

#### Are both required? / 둘 다 꼭 있어야 하나?

- **KO**: GraphQL 스펙상 `Query`와 `Mutation` 둘 다 **필수는 아닙니다**.
  - 읽기 전용 API라면 `type Query { ... }`만 있어도 되고, `type Mutation`은 생략할 수 있습니다.
  - 실무에서는 거의 항상 쿼리는 존재하고, 쓰기 기능이 필요할 때만 뮤테이션 타입을 추가합니다.
- **EN**: The spec does **not** require both root types to exist.
  - A read-only API can have only `type Query { ... }` and no `Mutation`.
  - In practice, nearly every schema defines `Query`, and adds a `Mutation` root type only when write operations are needed.

이 프로젝트에서는 별도의 `schema { ... }` 선언이 없고, `createSchema({ typeDefs, resolvers })`가 기본 규칙을 사용하므로 **루트 타입 이름을 `Query`, `Mutation`으로 유지하는 것이 가장 단순하고 안전한 선택**입니다.

### 2.3 `resolvers` – How queries/mutations run / 실제 동작

```ts
const resolvers = {
  Query: {
    blogs: () => blogsRepository.getBlogs(),
    blog: (_parent: unknown, args: { id: string }) => blogsRepository.getBlogById(args.id) ?? null,
  },
  Mutation: {
    createBlog: (_parent: unknown, args: { input: { title: string; content: string } }) =>
      blogsRepository.createBlog(args.input),
    updateBlog: (
      _parent: unknown,
      args: { id: string; input: { title?: string; content?: string; isGood?: boolean } },
    ) => blogsRepository.updateBlog(args.id, args.input),
    deleteBlog: (_parent: unknown, args: { id: string }) => blogsRepository.deleteBlog(args.id),
    toggleBlogGood: (_parent: unknown, args: { id: string }) =>
      blogsRepository.toggleBlogGood(args.id),
  },
};
```

- **KO**: `resolvers` 객체는 **스키마에 정의된 필드 이름**과 **실제 자바스크립트 함수**를 매핑합니다.
- **EN**: The `resolvers` object maps schema field names to actual JavaScript functions that run when a query or mutation is executed.

각 필드 설명:

- `Query.blogs`
  - **KO**: 인자를 받지 않으며, `blogsRepository.getBlogs()`를 호출해 블로그 목록을 반환합니다.
  - **EN**: Takes no arguments; calls `blogsRepository.getBlogs()` to return all blogs.

- `Query.blog`
  - 인자 타입: `args: { id: string }`
  - **KO**: `args.id`로 단일 블로그를 조회하고, 없으면 `null`을 반환합니다(`?? null`).
  - **EN**: Uses `args.id` to look up a blog; if not found, returns `null`.

- `Mutation.createBlog`
  - 인자 타입: `args: { input: { title: string; content: string } }`
  - **KO**: `args.input`을 그대로 `blogsRepository.createBlog`에 전달합니다. 저장 후 새 블로그를 반환합니다.
  - **EN**: Passes `args.input` to `blogsRepository.createBlog` and returns the newly created blog.

- `Mutation.updateBlog`
  - 인자 타입: `args: { id: string; input: { title?: string; content?: string; isGood?: boolean } }`
  - **KO**: `id`와 `input`을 저장소에 넘겨 특정 블로그를 부분 업데이트합니다.
  - **EN**: Passes `id` and partial `input` fields to the repository to update a blog.

- `Mutation.deleteBlog`
  - **KO**: `blogsRepository.deleteBlog(args.id)`를 호출하여 삭제하고, 성공 여부를 반환합니다.
  - **EN**: Calls `blogsRepository.deleteBlog(args.id)` and returns a boolean.

- `Mutation.toggleBlogGood`
  - **KO**: `blogsRepository.toggleBlogGood(args.id)`로 `isGood` 플래그를 토글하고, 업데이트된 블로그를 반환합니다.
  - **EN**: Toggles `isGood` via the repository and returns the updated blog.

`_parent: unknown`

- **KO**: GraphQL 리졸버 함수의 첫 번째 인자는 **`parent`(또는 `root`)** 입니다. 이 값은 "현재 필드를 감싸고 있는 상위 객체"를 의미합니다.
  - 루트 쿼리(`Query.blogs`, `Query.blog`)의 경우, `parent`는 보통 빈 객체 `{}` 이거나 서버에서 별도로 지정한 루트 값이며, 이 프로젝트에서는 사용하지 않기 때문에 `_parent`로 이름을 지어 **사용하지 않는 인자**임을 나타냅니다.
  - 만약 `Blog` 타입에 `author` 필드 리졸버를 따로 정의하면, 그 리졸버의 `parent`는 상위에서 내려온 **단일 블로그 객체**가 됩니다. 예를 들어 `Query.blogs`가 반환한 각 블로그가 `Blog` 타입의 `parent`로 전달되고, `parent.id` 같은 값을 이용해 하위 필드를 계산할 수 있습니다.
- **EN**: In a GraphQL resolver, the first argument is called **`parent` (or `root`)**, which represents the **parent object of the current field** in the resolver chain.
  - For root-level resolvers like `Query.blogs` and `Query.blog`, the `parent` value is usually an empty object `{}` or a custom root value. In this project it is not used, so we name it `_parent` to clearly indicate that the argument is intentionally unused and type it as `unknown`.
  - If you define a field resolver on `Blog` (for example, `Blog.author`), then the `parent` inside that resolver would be the **blog object returned by the parent resolver** (e.g., from `Query.blogs` or `Query.blog`), and you can read properties such as `parent.id` to resolve nested fields.

### 2.4 `createYoga` – Server wiring / 서버 설정

```ts
const { handleRequest } = createYoga<{
  req: NextRequest;
}>({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: "/api/graphql",
});
```

- 제네릭 부분 `<{ req: NextRequest; }>`
  - **KO**: `createYoga`에 전달되는 컨텍스트에서 `req`가 `NextRequest` 타입임을 알려줍니다. (추가 컨텍스트를 넣고 싶을 때 확장할 수 있습니다.)
  - **EN**: Tells `createYoga` that the `req` in its context is a `NextRequest`. You can extend this later if you need more context.

- `schema: createSchema({ typeDefs, resolvers })`
  - **KO**: 문자열 스키마(`typeDefs`)와 리졸버 객체를 합쳐 **실제 실행 가능한 GraphQL 스키마**를 생성합니다.
  - **EN**: Combines `typeDefs` and `resolvers` into an executable GraphQL schema.

- `graphqlEndpoint: "/api/graphql"`
  - **KO**: 이 Yoga 인스턴스가 어떤 URL 경로에서 서비스되는지 명시합니다. (Next.js route 파일 경로와 일치해야 합니다.)
  - **EN**: Sets the endpoint path where Yoga serves the GraphQL API.

리턴 값:

- `const { handleRequest } = ...`
  - **KO**: Yoga가 Next.js 라우트에 연결될 수 있는 **요청 핸들러 함수**를 반환합니다.
  - **EN**: Yoga returns a `handleRequest` function that can be exported as a Next.js route handler.

### 2.5 Next.js route exports / Next 라우트 내보내기

```ts
export { handleRequest as GET, handleRequest as POST };

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
```

- `export { handleRequest as GET, handleRequest as POST };`
  - **KO**: 동일한 `handleRequest` 함수를 **GET 요청**과 **POST 요청** 모두에 사용합니다. GraphQL Playground/IDE는 보통 POST를 사용합니다.
  - **EN**: Exposes the same handler for both GET and POST, allowing GraphQL clients to use either method.

- `dynamic = "force-dynamic"`
  - **KO**: 이 라우트를 동적 라우트로 강제하여 SSR 동작을 보장합니다. GraphQL 서버 특성상 정적으로 캐시되면 안 되기 때문에 사용합니다.
  - **EN**: Forces the route to be dynamic so it isn’t statically optimized, which suits a GraphQL server.

- `runtime = "nodejs"`
  - **KO**: 이 라우트는 **Node.js 런타임**에서 실행된다는 설정입니다. (Edge 런타임이 아닌 Node 환경)
  - **EN**: Explicitly opts into the Node.js runtime rather than the Edge runtime.

---

## 3. Data Repository – `blogsRepository` & `activeBlogsRepository`

GraphQL 스키마/리졸버는 **데이터 저장 방식과 분리**되어 있고, 실제 데이터는 리포지토리에서 가져옵니다.

### 3.1 `src/lib/blogsRepository.ts` (in-memory storage)

주요 메서드:

- `getBlogs(): Promise<IBlog[]>`
  - **KO**: 내부 배열 `blogs`를 날짜 기준으로 정렬해 반환합니다. GraphQL `Query.blogs` 리졸버에서 사용합니다.
  - **EN**: Returns the internal `blogs` array sorted by `createdAt`. Used by the `blogs` query resolver.

- `getBlogById(id: string): Promise<IBlog | undefined>`
  - **KO**: ID로 블로그를 찾습니다. GraphQL `Query.blog` 리졸버에서 사용합니다.
  - **EN**: Looks up a blog by ID; used by the `blog` query resolver.

- `createBlog(input: { title: string; content: string }): Promise<IBlog>`
  - **KO**: 새 ID를 생성하고, 입력값으로 `Blog` 객체를 만들고 배열 앞에 추가합니다. GraphQL `Mutation.createBlog`에서 사용합니다.
  - **EN**: Generates an ID, creates a new blog from input, prepends it to the list; used by the `createBlog` mutation.

- `updateBlog(id: string, input: { title?: string; content?: string; isGood?: boolean }): Promise<IBlog>`
  - **KO**: 기존 블로그를 찾고, 전달된 필드들만 덮어쓰고, `updatedAt`을 현재 시각으로 갱신합니다. GraphQL `updateBlog` 뮤테이션에서 사용합니다.
  - **EN**: Finds the existing blog, merges provided fields, updates `updatedAt`; used by the `updateBlog` mutation.

- `deleteBlog(id: string): Promise<boolean>`
  - **KO**: 해당 ID를 제외한 새 배열로 교체하고, 길이가 줄어들었는지 확인해서 `true/false`를 반환합니다.
  - **EN**: Filters out the blog with the given ID and returns whether the length decreased.

- `toggleBlogGood(id: string): Promise<IBlog>`
  - **KO**: 해당 블로그의 `isGood`를 반전시켜 저장하고, 업데이트된 블로그를 반환합니다. GraphQL `toggleBlogGood` 뮤테이션에 연결됩니다.
  - **EN**: Toggles `isGood` and returns the updated blog; wired to the `toggleBlogGood` mutation.

### 3.2 `src/lib/activeBlogsRepository.ts` – choose backend

```ts
const backend = process.env.BLOGS_REPOSITORY ?? "memory";

export const blogsRepository: IBlogsRepository =
  backend === "supabase" ? supabaseBlogsRepository : memoryBlogsRepository;
```

- **KO**: 환경 변수 `BLOGS_REPOSITORY` 값에 따라 **어떤 저장소 구현을 사용할지** 결정합니다.
  - 기본값은 `"memory"`로, `blogsRepository.ts`의 in-memory 버전을 사용합니다.
  - 나중에 `supabase` 백엔드를 붙이면 GraphQL 코드 수정 없이 백엔드를 교체할 수 있습니다.
- **EN**: Selects which repository implementation to use based on the `BLOGS_REPOSITORY` env var.  
  Default is `"memory"`, but can be switched to a Supabase-backed implementation without changing GraphQL schema/resolvers.

---

## 4. Frontend GraphQL Usage – `src/app/page.tsx`

이 파일은 **GraphQL 클라이언트 역할**을 합니다.

### 4.1 Query & Mutation strings / 쿼리 & 뮤테이션 문자열

```ts
const GET_BLOGS = `
  query GetBlogs {
    blogs {
      id
      title
      content
      isGood
      createdAt
      updatedAt
    }
  }
`;
```

- **KO**: `GetBlogs`라는 이름의 쿼리입니다. 서버 스키마의 `Query.blogs` 필드를 호출하고, 각 블로그에서 필요한 필드들을 선택합니다.
- **EN**: `GetBlogs` query that calls `Query.blogs` and selects fields from each `Blog`.

```ts
const CREATE_BLOG = `
  mutation CreateBlog($input: CreateBlogInput!) {
    createBlog(input: $input) {
      id
    }
  }
`;
```

- `$input: CreateBlogInput!`
  - **KO**: 변수 `$input`의 타입이 서버 스키마의 `CreateBlogInput`와 일치해야 함을 의미합니다.
  - **EN**: Declares a variable `$input` of type `CreateBlogInput!` which must match the server schema.
- `createBlog(input: $input) { id }`
  - **KO**: 서버의 `Mutation.createBlog`를 호출하고, 응답에서 `id`만 사용합니다.
  - **EN**: Calls the `createBlog` mutation and selects only the `id` from the response.

```ts
const UPDATE_BLOG = `
  mutation UpdateBlog($id: ID!, $input: UpdateBlogInput!) {
    updateBlog(id: $id, input: $input) {
      id
      title
      content
      isGood
      updatedAt
    }
  }
`;
```

- **KO**: `$id`와 `$input` 두 변수를 사용하여 특정 블로그를 업데이트하고, 수정된 필드와 `updatedAt`을 다시 가져옵니다.
- **EN**: Uses `$id` and `$input` to update a blog and fetches the updated fields and timestamp.

```ts
const DELETE_BLOG = `
  mutation DeleteBlog($id: ID!) {
    deleteBlog(id: $id)
  }
`;
```

- **KO**: ID로 블로그를 삭제하고, 서버에서 반환되는 `Boolean` 값을 그대로 받습니다.
- **EN**: Deletes a blog by ID and receives a boolean from the server.

```ts
const TOGGLE_BLOG_GOOD = `
  mutation ToggleBlogGood($id: ID!) {
    toggleBlogGood(id: $id) {
      id
      isGood
      updatedAt
    }
  }
`;
```

- **KO**: `toggleBlogGood` 뮤테이션을 호출하여 `isGood` 상태를 변경하고, 변경된 값과 업데이트 시각을 다시 가져옵니다.
- **EN**: Calls `toggleBlogGood` to flip `isGood` and returns the updated state and timestamp.

### 4.2 GraphQL response typing / 응답 타입 정의

```ts
interface IGraphqlError {
  message: string;
}

interface IGraphqlResponse<TData> {
  data?: TData;
  errors?: IGraphqlError[];
}
```

- **KO**: GraphQL 스펙에 따라, 응답은 **`data`와 `errors`를 동시에 가질 수 있습니다**. 이를 타입으로 표현한 인터페이스입니다.
- **EN**: Implements the GraphQL spec shape where a response can contain both `data` and `errors`.

### 4.3 `graphqlRequest` helper – making HTTP GraphQL calls

```ts
async function graphqlRequest<TData, TVariables = Record<string, unknown>>(
  query: string,
  variables?: TVariables,
): Promise<TData> {
  const response = await fetch("/api/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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

- 제네릭 타입 파라미터
  - `TData`
    - **KO**: 쿼리/뮤테이션이 반환할 데이터의 타입입니다. 각 호출에서 구체적인 타입을 지정합니다.
    - **EN**: The expected data shape returned by the query/mutation.
  - `TVariables = Record<string, unknown>`
    - **KO**: 변수 객체의 타입입니다. 기본은 아무 key/value나 허용하는 객체 타입입니다.
    - **EN**: Type of the variables object; defaults to a generic key/value object.

- `fetch("/api/graphql", { ... })`
  - **KO**: Next.js 서버의 GraphQL 엔드포인트로 POST 요청을 보냅니다.
  - **EN**: Sends a POST request to the Next.js GraphQL endpoint.

- 요청 body: `JSON.stringify({ query, variables })`
  - **KO**: GraphQL 서버가 기대하는 표준 형태 `{ query: string, variables?: object }`를 그대로 사용합니다.
  - **EN**: Matches the standard GraphQL HTTP body format.

- `if (!response.ok) { ... }`
  - **KO**: HTTP 레벨 에러(예: 500, 404)를 처리합니다.
  - **EN**: Handles non-2xx HTTP responses.

- `const json = ... as IGraphqlResponse<TData>;`
  - **KO**: 응답을 `IGraphqlResponse` 타입으로 파싱하여 `data`와 `errors`를 검사할 수 있게 합니다.
  - **EN**: Parses the JSON into the `IGraphqlResponse` shape.

- `if (json.errors && json.errors.length > 0) { ... }`
  - **KO**: GraphQL 레벨 에러가 존재하면, 메시지를 합쳐 `Error`를 던집니다.
  - **EN**: Throws an `Error` if any GraphQL errors are present.

- `if (!json.data) { ... }`
  - **KO**: GraphQL 응답에 `data`가 없다면 비정상 상황으로 보고 에러를 던집니다.
  - **EN**: Ensures `data` exists before returning.

- `return json.data;`
  - **KO**: 상위 코드에서는 이 값을 `TData` 타입으로 안전하게 사용할 수 있습니다.
  - **EN**: Returns typed data to be consumed by React Query.

### 4.4 React Query integration – using GraphQL

#### 4.4.1 `useQuery` with `GET_BLOGS`

```ts
const { data, isLoading, error } = useQuery({
  queryKey: ["blogs"],
  queryFn: () => graphqlRequest<{ blogs: IBlog[] }>(GET_BLOGS),
});
```

- **KO**: `queryFn`에서 `graphqlRequest`를 호출하여 `GET_BLOGS` 쿼리를 실행하고, 응답 타입을 `{ blogs: IBlog[] }`로 지정합니다.
- **EN**: Uses `graphqlRequest` as the `queryFn` to run `GET_BLOGS` and types the data as `{ blogs: IBlog[] }`.

#### 4.4.2 Mutations – `createBlog`, `updateBlog`, `deleteBlog`, `toggleBlogGood`

각 뮤테이션은 공통 패턴을 따릅니다.

예: `createBlogMutation`

```ts
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
```

- **KO**: `mutationFn`에서는 폼에서 받은 `variables`를 GraphQL 변수 `input`으로 감싸서 `CREATE_BLOG` 쿼리에 전달합니다. 성공 시에는 `invalidateQueries`로 `blogs` 쿼리를 다시 불러옵니다.
- **EN**: Wraps form values into the `input` variable for the `CREATE_BLOG` mutation; on success, invalidates the `blogs` query to refetch.

다른 뮤테이션(`updateBlogMutation`, `deleteBlogMutation`, `toggleBlogGoodMutation`)도 동일하게:

- **KO**:
  - 적절한 GraphQL 문자열(`UPDATE_BLOG`, `DELETE_BLOG`, `TOGGLE_BLOG_GOOD`)을 사용하고,
  - 필요한 변수를 `{ id, input }` 형태로 맞춰 보낸 후,
  - 성공 시 `blogs` 쿼리를 무효화하여 UI를 최신 상태로 유지합니다.
- **EN**:
  - Use the corresponding GraphQL document,
  - Shape variables to match schema arguments,
  - Invalidate the `blogs` query on success to keep UI in sync.

---

## 5. Apollo Client Setup – `src/lib/apolloClient.ts`

```ts
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

export const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: "/api/graphql",
  }),
  cache: new InMemoryCache(),
});
```

- **KO**: 이 파일은 `@apollo/client`를 사용하여 `/api/graphql`에 연결되는 `apolloClient` 인스턴스를 정의합니다.
  - `HttpLink`는 GraphQL 요청을 어떤 URL로 보낼지 정의합니다 (`uri: "/api/graphql"`).
  - `InMemoryCache`는 Apollo의 표준 캐시 구현입니다.
  - 현재 `page.tsx`에서는 직접 사용하지 않고, 대신 `fetch` + `graphqlRequest`를 사용하지만, 추후 Apollo 기반 코드로 옮길 수 있습니다.
- **EN**: This sets up an `ApolloClient` instance pointing to `/api/graphql` using `HttpLink` and `InMemoryCache`. The current homepage uses a custom `fetch` helper instead, but you can migrate to Apollo hooks if desired.

---

## 6. How everything connects / 전체 연결 요약

- **KO**:
  1. 프론트엔드 `page.tsx`에서 GraphQL 쿼리/뮤테이션 문자열과 `graphqlRequest` 함수를 정의합니다.
  2. `graphqlRequest`는 `/api/graphql`로 HTTP POST 요청을 보내고, GraphQL 응답 형식(`data`, `errors`)을 처리합니다.
  3. `/api/graphql`는 `graphql-yoga`를 통해 설정된 GraphQL 서버(`route.ts`)에 의해 처리됩니다.
  4. 서버에서는 `typeDefs`와 `resolvers`가 스키마와 실제 실행 코드를 정의합니다.
  5. 리졸버들은 `blogsRepository`를 통해 실제 데이터(메모리 또는 Supabase)에 접근합니다.

- **EN**:
  1. The frontend (`page.tsx`) defines GraphQL documents and uses `graphqlRequest` to call `/api/graphql`.
  2. `graphqlRequest` sends HTTP POST requests and interprets `data` and `errors` from the response.
  3. The `/api/graphql` route is powered by `graphql-yoga` in `route.ts`.
  4. `typeDefs` and `resolvers` define the schema and how each field is resolved.
  5. Resolvers use `blogsRepository` (via `activeBlogsRepository`) as the data source, which can be in-memory or Supabase-backed.

---

## 7. Adding new GraphQL features – simple checklist / 새 기능 추가 체크리스트

- **KO** (예: `author` 필드 추가):
  1. `typeDefs`에서 `type Blog`에 `author: String!` 필드를 추가합니다.
  2. `CreateBlogInput`, `UpdateBlogInput`에도 필요한 필드를 추가합니다.
  3. `blogsRepository`의 `createBlog`, `updateBlog`에서 `author`를 처리하도록 수정합니다.
  4. `page.tsx`의 GraphQL 쿼리/뮤테이션 문자열에 `author`를 선택하거나 인자로 보냅니다.
  5. 폼/컴포넌트에서 `author`를 입력·표시하도록 UI를 업데이트합니다.

- **EN** (e.g., adding an `author` field):
  1. Add `author: String!` to the `Blog` type in `typeDefs`.
  2. Extend `CreateBlogInput` / `UpdateBlogInput` accordingly.
  3. Update repository methods (`createBlog`, `updateBlog`) to handle `author`.
  4. Update GraphQL query/mutation strings in `page.tsx` to include `author`.
  5. Adjust the UI to capture and display `author`.

이 문서를 보면서 **스키마(typeDefs) → 리졸버(resolvers) → 리포지토리(repository) → 프론트엔드 쿼리/뮤테이션** 흐름을 이해하면, 다른 GraphQL 기능도 같은 패턴으로 확장할 수 있습니다.
