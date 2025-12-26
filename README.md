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

---

## 🚀 Getting Started

### 1️⃣ Requirements

- Node.js >= 20
- npm

---

### 2️⃣ Install

```bash
npm install
````

---

### 3️⃣ Environment Variables

프로젝트 루트에 `.env` 파일을 생성해주세요.

```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3000
```

> ⚠️ `.env` 파일은 Git에 커밋하지 않습니다.

---

### 4️⃣ Run (Development)

```bash
npm run start:dev
```

서버가 실행되면 기본 포트는 `3000`입니다.

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

## 🧱 Project Structure

```txt
src/
├─ modules/            # 도메인별 기능 모듈
│  └─ health/          # 헬스 체크 모듈
│
├─ infra/              # 인프라 설정
│  └─ logger/          # pino 로깅 설정
│     └─ pino.ts
│
├─ swagger.ts          # Swagger 설정
├─ main.ts             # 애플리케이션 엔트리 포인트
└─ app.module.ts       # 루트 모듈
```

---

## 🧑‍💻 Notes

* 모든 API는 **Global Prefix `/api/v1`** 를 사용합니다.
* HTTP 요청/응답 로그는 **pino 기반으로 자동 기록**됩니다.
* Swagger는 크로스 브라우저 호환성을 위해 prefix 내부(`/api/v1/docs`)에 위치합니다.
* Prisma 및 도메인 비즈니스 로직은 이후 단계에서 추가됩니다.

---

## 📌 Scripts

```bash
npm run start        # production 실행
npm run start:dev    # development 실행 (watch)
npm run build        # build
npm run lint         # lint
```

---

## 👥 Contribution

* 초기 세팅 PR 이후 기능 단위로 PR을 생성해주세요.
* 커밋 메시지는 Conventional Commits를 권장합니다.

---

## 📎 License

Private project.

````

---
