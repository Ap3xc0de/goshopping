FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
# Copy Markdown skill/context files so fs.readFileSync finds them at runtime
COPY --from=builder /app/src/skills ./dist/skills
COPY --from=builder /app/src/context ./dist/context
EXPOSE 3002
CMD ["node", "dist/main.js"]
