# 콘텐츠 모더레이션 정책 및 구현 정리

## 목적

앱 출시 심사에서는 사용자 생성 콘텐츠(UGC)가 다른 사용자에게 노출되기 전에 부적절한 콘텐츠를 사전 필터링할 수 있어야 합니다.

현재 백엔드는 공개 또는 반공개 성격의 UGC를 저장하기 전에 OpenAI Moderations API로 텍스트와 이미지를 검수합니다.

채팅 메시지는 이번 모더레이션 대상에서 제외했습니다. 채팅은 사적인 커뮤니케이션에 가까우며, 서버가 채팅 본문을 필터링하는 방식은 개인정보 처리 및 서비스 정책 측면에서 별도 검토가 필요합니다.

## 현재 적용 범위

아래 API는 저장 전에 모더레이션 검사를 수행합니다.

| 영역        | API 범위                                           | 검사 필드                                        |
| ----------- | -------------------------------------------------- | ------------------------------------------------ |
| 게시글      | `POST/PATCH /clubs/:clubId/articles`               | `title`, `contents`, `photoUrls`                 |
| 댓글        | `POST /clubs/:clubId/articles/:articleId/comments` | `contents`                                       |
| 유저 프로필 | `PATCH /users/me`                                  | `nickname`, `introText`, `profileImageUrl`       |
| 클럽        | `POST/PATCH /clubs`                                | `name`, `introText`, `thumbnailUrl`, `imageUrls` |

현재 모더레이션을 적용하지 않는 영역은 다음과 같습니다.

- 1:1 채팅 텍스트
- 클럽 채팅 텍스트
- 채팅 사진, 음성, 영상 미디어
- 프로필 또는 클럽의 음성 소개 파일

음성 파일은 바로 검사하지 않고, 추후 STT로 텍스트 변환 후 모더레이션하는 별도 작업으로 분리합니다.

## 구현 구조

주요 파일은 다음과 같습니다.

- `src/common/moderation/content-moderation.module.ts`
- `src/common/moderation/content-moderation.service.ts`
- `src/common/moderation/content-moderation.interceptor.ts`
- `src/common/moderation/moderate-content.decorator.ts`
- `src/common/errors/error-codes.ts`
- `src/common/filters/global-exception.filter.ts`

컨트롤러에서는 모더레이션 대상 API에 다음과 같이 데코레이터를 붙입니다.

```ts
@ModerateContent({
  surface: 'ARTICLE',
  textFields: ['title', 'contents'],
  imageFields: ['photoUrls'],
})
```

`ContentModerationInterceptor`는 `src/main.ts`에 전역 인터셉터로 등록되어 있습니다. 다만 모든 요청에 동작하는 것은 아니고, `@ModerateContent(...)` 메타데이터가 붙은 핸들러에서만 실행됩니다.

`ContentModerationService`는 요청 body에서 지정된 텍스트와 이미지 필드를 수집해서 OpenAI Moderations API로 전송합니다.

- 텍스트 필드: `{ type: 'text', text }`
- 이미지 필드: `{ type: 'image_url', image_url: { url } }`
- `s3://...` 형태의 S3 참조값은 `S3ObjectUrlService`를 통해 presigned URL로 변환한 뒤 OpenAI에 전달합니다.
- 이미지는 여러 장을 한 요청에 묶지 않고, 이미지별로 한 장씩 개별 moderation 요청을 보냅니다.

## 차단 기준

현재 백엔드는 OpenAI 응답의 최종 판정값인 `flagged`를 기준으로 차단합니다.

- `flagged: false`이면 통과
- `flagged: true`이면 차단

현재는 `category_scores`에 대해 별도 임계값을 적용하지 않습니다.

출시 심사 직전에는 정책을 단순하고 보수적으로 가져가는 것이 목적이므로, OpenAI의 최종 판정값을 그대로 신뢰합니다. 추후 오탐 또는 미탐 문제가 확인되면 카테고리별 점수 임계값을 별도로 둘 수 있습니다.

## 에러 응답

모더레이션에 걸린 콘텐츠는 다음 에러로 응답합니다.

- 내부 에러 코드: `CONTENT_POLICY_VIOLATION`
- 외부 에러 코드: `VALID-003`
- HTTP 상태 코드: `422 Unprocessable Entity`

응답 예시는 다음과 같습니다.

```json
{
  "resultType": "FAIL",
  "success": null,
  "error": {
    "code": "VALID-003",
    "message": "커뮤니티 가이드라인에 맞지 않는 내용이 포함되어 있어 등록할 수 없습니다.",
    "details": {
      "surface": "ARTICLE",
      "violatedCategories": ["폭력적 언행"]
    }
  },
  "meta": {
    "timestamp": "2026-07-16T04:00:00.000Z",
    "path": "/api/v1/clubs/1/articles"
  }
}
```

클라이언트에는 실제 위반된 카테고리만 반환합니다. OpenAI가 내려주는 전체 카테고리 boolean map이나 `category_scores`는 응답에 포함하지 않습니다.

일반적인 `AppException.details`는 기존처럼 클라이언트에 노출하지 않습니다. 현재는 `CONTENT_POLICY_VIOLATION`일 때만 클라이언트에 안전한 details를 내려줍니다.

## 위반 카테고리 매핑

OpenAI 카테고리 키는 클라이언트 응답에서 한국어 값으로 변환됩니다.

| OpenAI 카테고리          | 클라이언트 반환값      |
| ------------------------ | ---------------------- |
| `sexual`                 | `성적 콘텐츠`          |
| `sexual/minors`          | `미성년자 성적 콘텐츠` |
| `harassment`             | `괴롭힘`               |
| `harassment/threatening` | `위협적 괴롭힘`        |
| `hate`                   | `혐오 표현`            |
| `hate/threatening`       | `위협적 혐오 표현`     |
| `illicit`                | `불법 행위`            |
| `illicit/violent`        | `폭력적 불법 행위`     |
| `self-harm`              | `자해 관련 콘텐츠`     |
| `self-harm/intent`       | `자해 의도`            |
| `self-harm/instructions` | `자해 방법 안내`       |
| `violence`               | `폭력적 언행`          |
| `violence/graphic`       | `잔혹한 폭력 콘텐츠`   |

예를 들어 OpenAI 응답에서 `violence: true`만 내려오면 클라이언트 응답의 `violatedCategories`는 다음처럼 내려갑니다.

```json
["폭력적 언행"]
```

## 환경 변수

모더레이션이 동작하는 환경에는 아래 환경 변수가 필요합니다.

```env
OPENAI_API_KEY=...
OPENAI_MODERATION_MODEL=omni-moderation-latest
```

`OPENAI_MODERATION_MODEL`은 기본값이 `omni-moderation-latest`입니다.

`OPENAI_API_KEY`가 없는 상태에서 모더레이션 대상 API가 호출되면 `SERVER_TEMPORARY_ERROR`로 응답합니다. 이는 OpenAI 설정 누락으로 인해 검수되지 않은 UGC가 저장되는 것을 막기 위한 fail-closed 정책입니다.

## DB 기록

모더레이션 결과는 `ContentModerationLog` 테이블에 저장합니다.

원문 텍스트나 이미지 URL 전체를 저장하지 않고, 운영 조회와 감사에 필요한 메타데이터만 저장합니다.

주요 컬럼은 다음과 같습니다.

| 컬럼                 | 설명                                         |
| -------------------- | -------------------------------------------- |
| `userId`             | 요청 사용자 ID. 유저 삭제 시 `null` 처리     |
| `surface`            | 검사 영역. 예: `ARTICLE`, `COMMENT`, `CLUB`  |
| `targetType`         | 저장된 대상 타입. 예: `ARTICLE`, `CLUB`      |
| `targetId`           | 저장된 대상 ID. 사전 차단 로그는 `null` 가능 |
| `decision`           | `BLOCK`, `REVIEW`                            |
| `provider`           | 현재는 `OPENAI`                              |
| `model`              | 사용한 moderation 모델                       |
| `providerResponseId` | OpenAI moderation 응답 ID                    |
| `violatedCategories` | 실제 위반된 한국어 카테고리 배열             |
| `inputTypes`         | 검사 입력 타입. 예: `text`, `image`          |
| `categoryScores`     | OpenAI 카테고리 점수 JSON                    |
| `contentHash`        | 원문 대신 저장하는 SHA-256 해시              |
| `requestPath`        | 요청 경로                                    |
| `createdAt`          | 생성 시각                                    |

조회 효율을 위해 아래 인덱스를 둡니다.

| 인덱스                           | 목적                                       |
| -------------------------------- | ------------------------------------------ |
| `[userId, createdAt]`            | 특정 유저의 모더레이션 이력 조회           |
| `[decision, surface, createdAt]` | 차단/검토 내역을 영역별 최신순으로 조회    |
| `[targetType, targetId]`         | 특정 게시글/댓글/클럽 관련 로그 조회       |
| `[createdAt]`                    | 기간 조회 및 보관 기간 만료 데이터 정리    |
| `violatedCategories GIN`         | 특정 위반 카테고리가 포함된 로그 빠른 조회 |

## 팀원 공유 사항

- 공개 또는 반공개 UGC를 저장하는 새 API를 만들 때는 `@ModerateContent(...)` 적용 여부를 반드시 검토해야 합니다.
- 채팅 API에는 제품/개인정보 정책 검토 없이 모더레이션을 붙이지 않습니다.
- OpenAI `category_scores`는 현재 클라이언트에 노출하지 않습니다.
- 새로 검사해야 하는 request body 필드가 생기면 DTO, Swagger 문서, `@ModerateContent(...)` 설정을 함께 맞춰야 합니다.
- 하나의 요청에 텍스트와 이미지가 함께 들어오면, 둘 중 하나라도 `flagged: true`일 경우 전체 요청을 차단합니다.
- 이미지가 여러 장인 경우 각 이미지를 개별 검사하며, 한 장이라도 차단되면 전체 요청을 차단합니다.
- 통과된 콘텐츠는 DB에 기록하지 않고, 차단된 콘텐츠만 `ContentModerationLog`에 저장합니다.
- 모더레이션은 service/repository 저장 전에 수행됩니다.
- S3 업로드 자체를 막는 구조는 아닙니다. 파일은 S3에 이미 업로드되어 있을 수 있지만, 모더레이션에 걸리면 해당 URL이 앱 콘텐츠로 저장되지 않습니다.

## 추후 작업 후보

출시 이후 필요에 따라 아래 작업을 검토할 수 있습니다.

- 모더레이션 판정 결과를 DB 감사 로그 테이블에 저장
- 카테고리별 점수 임계값 정책 추가
- 애매한 콘텐츠를 위한 관리자 검수 큐 추가
- 이미지/영상 검수 보강을 위한 AWS Rekognition 연동
- 음성 파일 검수를 위한 STT + 텍스트 모더레이션 파이프라인 추가
