# API Error Schema (MVP v1)

모든 API 에러 응답은 아래 스키마를 따른다.

```json
{
  "code": "VALIDATION_ERROR",
  "message": "요청 바디가 유효하지 않습니다.",
  "details": {
    "field": "battleId"
  },
  "traceId": "1739952470102-ab12cd34"
}
```

## Fields
- `code`: 에러 코드(enum)
  - `AUTH_REQUIRED`
  - `FORBIDDEN`
  - `NOT_FOUND`
  - `BAD_REQUEST`
  - `VALIDATION_ERROR`
  - `ROOM_FULL`
  - `INVALID_PASSWORD`
  - `RATE_LIMITED`
  - `INTERNAL_ERROR`
- `message`: 사용자/클라이언트 로그용 메시지
- `details`: 선택. zod issue, 내부 validation reason 등 부가정보
- `traceId`: 요청 추적 ID (`api-handler` requestId와 동일)

## Status Code mapping
- 400: `BAD_REQUEST`, `VALIDATION_ERROR`
- 401: `AUTH_REQUIRED`
- 403: `FORBIDDEN`, `INVALID_PASSWORD`
- 404: `NOT_FOUND`
- 409: `ROOM_FULL`
- 429: `RATE_LIMITED`
- 500: `INTERNAL_ERROR`

## Notes
- `traceId`는 운영 로그와 매칭되어 incident triage에 사용된다.
- `details`는 민감정보를 포함하지 않는다.
