# syntax=docker/dockerfile:1

FROM node:22.23.1-bookworm-slim AS deps
WORKDIR /app

# Prisma가 openssl 필요할 수 있어서 설치(경고/런타임 문제 방지)
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# ✅ 핵심: deps 단계에서 postinstall 같은 스크립트 실행 차단
RUN npm ci --ignore-scripts


FROM node:22.23.1-bookworm-slim AS build
WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ✅ 여기서는 prisma 폴더가 존재하므로 generate를 정상 수행(|| true 제거)
RUN npx prisma generate
RUN npm run build


FROM node:22.23.1-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# 런타임은 빌드 결과물 + node_modules만 가져오면 됨
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

# 서비스 런타임에는 production dependency만 유지한다.
# staging에서 수동 seed를 실행할 수 있도록 npm/npx는 취약점이 수정된 버전으로 교체한다.
RUN npm prune --omit=dev --ignore-scripts --no-audit \
  && npm install --global npm@12.0.1 --ignore-scripts --no-audit

EXPOSE 3000
CMD ["node", "dist/src/main.js"]
