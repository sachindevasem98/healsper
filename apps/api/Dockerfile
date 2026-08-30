# Production image for the Healsper API.
# Build context: repository root (so the workspace lockfile is available):
#   docker build -t healsper-api -f apps/api/Dockerfile .

FROM node:20-alpine AS build
WORKDIR /repo

# Install all workspace dependencies reproducibly from the root lockfile.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

# Prisma client + schema (generation needs the schema present).
COPY apps/api/prisma apps/api/prisma
WORKDIR /repo/apps/api
RUN npx prisma generate

# Compile TypeScript to dist/.
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/api/src apps/api/src
RUN npm run build

# --- Runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /repo/apps/api
ENV NODE_ENV=production

# Full dependency tree (includes the prisma CLI needed for `migrate deploy` at startup).
COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/apps/api/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/prisma ./prisma
COPY --from=build /repo/apps/api/package.json ./package.json

# Run as a non-root user.
USER node

EXPOSE 4000

# Apply pending migrations, then start the compiled server.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]