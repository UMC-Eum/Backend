````md
# EUM Backend

EUM 백엔드 서버입니다.  
NestJS 기반으로 구성되어 있으며, 초기 프로젝트 세팅과 공통 인프라 구성을 포함합니다.

---

## 🛠 Tech Stack

- **Node.js** (>= 20)
- **NestJS**
- **TypeScript**
- **Swagger** (API Documentation)
- **pino / pino-http** (HTTP Logging)
- **@nestjs/config** (환경 변수 관리)
- **Prisma** (ORM, `@prisma/adapter-pg` 사용)
- **PostgreSQL 17 + pgvector** (RDS / 로컬은 `pgvector/pgvector:pg17` 컨테이너)
- **Redis** (ElastiCache / 로컬은 단일 컨테이너)
- **AWS ECS on EC2** (staging 배포 대상, ECR + Service Connect)
- **GitHub Actions** (CI/CD)

---

## 🚀 Getting Started

### 1️⃣ Requirements

- Node.js >= 20
- npm
- (권장) Docker Desktop (로컬에서 PostgreSQL/Redis 컨테이너를 띄우는 경우)

---

### 2️⃣ Install

```bash
npm install
````

> `postinstall`로 `prisma generate`가 자동 실행됩니다.

---

### 3️⃣ Environment Variables

프로젝트 루트에 `.env` 파일을 생성해주세요.
`.env.example` 파일의 골격을 참고해주세요.
> ⚠️ `.env` 파일은 Git에 커밋하지 않습니다.

---

### 4️⃣ Run (Development)

```bash
npm run start:dev
```

서버가 실행되면 기본 포트는 `3000`입니다.

---

## 🐳 로컬 인프라 (PostgreSQL / Redis)

`docker-compose.yml`은 backend 이미지 단독 실행용입니다. DB/Redis는 외부(RDS/ElastiCache)에 두는 게 기본이며, 로컬 개발 시에는 다음과 같이 단일 컨테이너로 띄우는 것을 권장합니다.

### PostgreSQL 17 + pgvector

```bash
docker run -d --name eum-pg \
  -p 5432:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=eum_dev \
  pgvector/pgvector:pg17
```

> 마이그레이션이 `CREATE EXTENSION IF NOT EXISTS vector;`를 포함하므로 plain `postgres:17`이 아니라 `pgvector/pgvector:pg17` 이미지를 써야 합니다.

`.env`에 다음 형식으로 `DATABASE_URL` 설정:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/eum_dev
```

### Redis

```bash
docker run -d --name eum-redis -p 6379:6379 redis:7
```

### backend 이미지 단독 실행 (선택)

```bash
docker compose up -d backend
```

---

## 🧩 Prisma

* Prisma 설정 파일: `prisma/schema.prisma`
* Prisma Client 생성: `npm run prisma:generate`
* 생성된 Prisma Client(예: `@prisma/client` 기반 생성물)는 **커밋하지 않고**, 필요 시 install/build 단계에서 생성합니다.

> Prisma 관련 변경 후에는 `npm run prisma:generate`를 한 번 실행하는 것을 권장합니다.

---

## 📄 API Documentation

Swagger를 통해 API 문서를 확인할 수 있습니다.

* **Swagger UI**
  👉 [http://localhost:3000/api/v1/docs](http://localhost:3000/api/v1/docs)

* **OpenAPI JSON**
  👉 [http://localhost:3000/api/v1/docs-json](http://localhost:3000/api/v1/docs-json)

---

## ❤️ Health Check

서버 상태 확인용 엔드포인트입니다.

```http
GET /api/v1/health
```

Response:

```json
{
  "status": "ok"
}
```

---

## ✅ CI / CD (GitHub Actions)

**CI** — PR 또는 `main`/`dev` 브랜치 push 시 자동 실행 (`.github/workflows/ci.yml`):

* Install (`npm ci`)
* Prisma generate
* Prisma migrate deploy (서비스 컨테이너: `pgvector/pgvector:pg17`)
* Lint
* Typecheck
* Unit tests
* Build

**CD** — `dev` 브랜치에 머지되면 staging ECS로 자동 배포 (`.github/workflows/cd.yml`):

* OIDC로 AWS 인증
* ECR로 이미지 push (`linux/amd64`, `:<sha>` + `:latest`)
* ECS one-off task로 `prisma migrate deploy` 실행
* `eum-backend-service` 업데이트 + 안정화 대기
* ALB 헬스(`https://staging.eum-dating.com/api/v1/health`) 스모크

> CD job은 staging RDS PG 교체 / OIDC role 등록 / Secrets Manager 갱신이 끝날 때까지 `if: ${{ false }}`로 비활성 상태입니다. 활성화 절차는 `cd.yml`의 TODO 코멘트 참고.

---

## 🧱 Project Structure

```txt
.github/
└─ workflows/
   ├─ ci.yml                 # PR/push 시 lint/test/build
   ├─ cd.yml                 # dev push 시 staging ECS 배포 (비활성)
   ├─ branch-check.yml       # 브랜치명 컨벤션 검증
   └─ notion-sync.yml        # 이슈/PR → Notion 동기화

prisma/
└─ schema.prisma             # Prisma schema (PostgreSQL + pgvector)

src/
├─ modules/                  # 도메인별 기능 모듈
│  ├─ app/                   # 루트 모듈(프로젝트 구성)
│  └─ health/                # 헬스 체크 모듈
│
├─ infra/                    # 인프라 설정
│  ├─ logger/                # pino 로깅 설정
│  │  └─ pino.ts
│  └─ prisma/                # PrismaModule/PrismaService
│
├─ swagger.ts                # Swagger 설정
└─ main.ts                   # 애플리케이션 엔트리 포인트

docker-compose.yml           # 로컬 backend 이미지 단독 실행용
```

---

## 🧑‍💻 Notes

* 모든 API는 **Global Prefix `/api/v1`** 를 사용합니다.
* HTTP 요청/응답 로그는 **pino 기반으로 자동 기록**됩니다.
* Swagger는 크로스 브라우저 호환성을 위해 prefix 내부(`/api/v1/docs`)에 위치합니다.
* Prisma 및 도메인 비즈니스 로직은 이후 단계에서 추가됩니다.
* 로컬 DB는 `pgvector/pgvector:pg17` 컨테이너 기준으로 `DATABASE_URL`이 `5432`를 사용합니다.
* CI 환경에서는 PostgreSQL/Redis 서비스 컨테이너를 사용하며, 내부 포트는 `5432/6379`입니다.

---

```

> `timestamp`는 UTC ISO-8601 형식(`Z`)으로 내려주며, 클라이언트에서 KST로 변환하여 표시합니다.

````

=======

## 📌 Scripts

```bash
npm run start         # production 실행
npm run start:dev     # development 실행 (watch)
npm run build         # build
npm run lint          # lint
npm run test          # unit test
npm run typecheck     # 타입 체크(tsc --noEmit)
npm run prisma:generate # prisma client generate
```

---

## 👥 Contribution

* 초기 세팅 PR 이후 기능 단위로 PR을 생성해주세요.
* 커밋 메시지는 Conventional Commits를 권장합니다.

---

## 📎 License

Private project.

```
