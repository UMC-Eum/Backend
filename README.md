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
- **Prisma** (ORM)
- **MySQL** (Docker Compose 기반 개발 DB)
- **Redis** (Docker Compose 기반 캐시/메시징)
- **GitHub Actions** (CI)

---

## 🚀 Getting Started

### 1️⃣ Requirements

- Node.js >= 20
- npm
- (권장) Docker Desktop (MySQL/Redis를 docker-compose로 띄우는 경우)

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

## 🐳 Docker Compose (MySQL / Redis)

개발 환경에서 MySQL/Redis는 docker-compose로 구동합니다.

### 1) 컨테이너 실행

```bash
docker compose up -d
```

* MySQL: `localhost:3307` → 컨테이너 내부 `3306`
* Redis: `localhost:6379`

> 로컬에 기존 MySQL이 3306을 사용 중인 경우를 피하기 위해 MySQL은 3307 포트를 사용합니다.

### 2) 상태 확인

```bash
docker compose ps
```

### 3) 컨테이너 종료

```bash
docker compose down
```

> ⚠️ 데이터까지 초기화(볼륨 삭제)하려면:

```bash
docker compose down -v
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

## ✅ CI (GitHub Actions)

PR 또는 `main/dev` 브랜치에 push 시 CI가 자동 실행됩니다.

* Install (`npm ci`)
* Prisma generate
* Lint
* Typecheck
* Unit tests
* Build

CI 워크플로우 파일: `.github/workflows/ci.yml`

---

## 🧱 Project Structure

```txt
.github/
└─ workflows/
   └─ ci.yml                 # GitHub Actions CI

prisma/
└─ schema.prisma             # Prisma schema

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

docker-compose.yml           # MySQL/Redis 개발 인프라
```

---

## 🧑‍💻 Notes

* 모든 API는 **Global Prefix `/api/v1`** 를 사용합니다.
* HTTP 요청/응답 로그는 **pino 기반으로 자동 기록**됩니다.
* Swagger는 크로스 브라우저 호환성을 위해 prefix 내부(`/api/v1/docs`)에 위치합니다.
* Prisma 및 도메인 비즈니스 로직은 이후 단계에서 추가됩니다.
* 개발 환경 DB는 docker-compose 기준으로 `DATABASE_URL`이 `3307`을 사용합니다.
* CI 환경에서는 MySQL/Redis 서비스 컨테이너를 사용하며, 내부 포트는 `3306/6379`입니다.

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

graph TD
    %% 사용자 및 외부 환경
    User([User / Client]) -.-> |"HTTP Request (/api/v1)"| Gateway

    subgraph "NestJS Application Context"
        Gateway[main.ts / Global Prefix]
        
        subgraph "Middleware & Global"
            Pino[[Pino Logging]]
            Config[Nest Config]
            Swagger[Swagger UI /docs]
        end

        subgraph "Modules (src/modules)"
            AppMod[App Module]
            HealthMod[Health Module]
            DomainMod[Domain/Business Modules]
        end

        subgraph "Infrastructure (src/infra)"
            PrismaSvc[Prisma Service]
            LoggerSvc[Pino Logger Service]
        end
    end

    %% 데이터 저장소 (Docker Compose)
    subgraph "External Infrastructure (Docker Compose)"
        MySQL[(MySQL :3307)]
        Redis[(Redis :6379)]
    end

    %% CI 파이프라인
    subgraph "CI Pipeline (GitHub Actions)"
        Actions{GitHub Actions}
        Actions --> |1. Lint/Typecheck| Actions
        Actions --> |2. Prisma Generate| Actions
        Actions --> |3. Unit Test| Actions
        Actions --> |4. Build| Actions
    end

    %% 연결 관계
    Gateway --> Pino
    Gateway --> AppMod
    AppMod --> HealthMod
    AppMod --> DomainMod
    
    DomainMod --> PrismaSvc
    DomainMod --> Redis
    PrismaSvc --> MySQL
    
    Actions -.-> |"Validate Code"| Gateway