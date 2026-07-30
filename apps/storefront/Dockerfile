FROM node:20-alpine AS deps
WORKDIR /workspace
COPY apps/storefront/package*.json ./apps/storefront/
COPY libs/storefront-sdk ./libs/storefront-sdk
WORKDIR /workspace/apps/storefront
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /workspace/apps/storefront
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=deps /workspace/apps/storefront/node_modules ./node_modules
COPY --from=deps /workspace/libs/storefront-sdk /workspace/libs/storefront-sdk
COPY apps/storefront/ .
RUN mkdir -p public && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
COPY --from=builder /workspace/apps/storefront/.next/standalone ./
COPY --from=builder /workspace/apps/storefront/.next/static ./.next/static
COPY --from=builder /workspace/apps/storefront/public ./public
EXPOSE 3000
CMD ["node", "server.js"]

