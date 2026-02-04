FROM node:20-alpine AS builder
WORKDIR /app

# Build-time flag to control the theme switcher in the client bundle
ARG BLOGS_REPOSITORY=supabase
ENV BLOGS_REPOSITORY=${BLOGS_REPOSITORY}

# Supabase public client variables need to be available at build time so
# Next.js can inline them into the client bundle when running `next build`.
# Railway injects these as build args, so declare and promote them to ENV.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build Next.js app
RUN npm run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy only what we need for runtime
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

EXPOSE 3000
ENV PORT=3000

CMD ["npm", "start"]
