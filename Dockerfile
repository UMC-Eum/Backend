# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Prisma는 slim 이미지에서 openssl이 없으면 문제/경고가 나기 쉬움
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci


FROM node:20-bookworm-slim AS build
WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ✅ 여기서는 schema가 있으니 generate를 "실패 없이" 수행 (|| true 제거)
RUN npx prisma generate

RUN npm run build


FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# ✅ 핵심: prod 설치할 때 postinstall(=prisma generate) 같은 스크립트 실행을 막는다
RUN npm ci --omit=dev --ignore-scripts \
  && npm cache clean --force

# ✅ dist 실행에 필요한 것들만 가져온다
COPY --from=build /app/dist ./dist
# prisma client가 node_modules 안에 생성되므로 build에서 만들어진 node_modules를 가져와야 안전
COPY --from=build /app/node_modules ./node_modules
# 런타임에 schema/prisma 폴더가 필요한 경우를 대비 (마이그레이션/특정 설정)
COPY --from=build /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "dist/src/main.js"]
