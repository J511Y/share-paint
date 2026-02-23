# Socket ACK Contract (MVP v1)

## Envelope (Client -> Server)

상태 변경 이벤트는 공통 envelope를 사용한다.

```json
{
  "v": 1,
  "event": "canvas_update",
  "battleId": "uuid",
  "opId": "client-op-id",
  "ackId": "client-ack-id",
  "seq": 14,
  "clientTs": 1760000000000,
  "payload": {
    "imageData": "data:image/png;base64,..."
  }
}
```

## ACK (Server -> Client callback)

```json
{
  "ok": true,
  "seq": 14,
  "opId": "client-op-id",
  "ackId": "client-ack-id"
}
```

실패 시:

```json
{
  "ok": false,
  "code": "RATE_LIMITED",
  "error": "draw event rate exceeded",
  "retryable": true
}
```

## Rules
- ACK 필수 이벤트: `join_battle`, `leave_battle`, `start_battle`, `canvas_update`, `vote`
- 서버는 `(battleId, opId)` 기준 dedupe 처리하고 같은 `seq`를 반환한다.
- 클라이언트 timeout: 기본 1.5~2s, 최대 2회 재시도.
- 재시도 실패 시 `resume_battle`로 `lastSeq` 기준 state recovery 수행.

## Resume Contract

Client:
```json
{
  "battleId": "uuid",
  "lastSeq": 13
}
```

Server emits `battle_resume_state`:
```json
{
  "battleId": "uuid",
  "serverSeq": 20,
  "status": "in_progress",
  "timeLeft": 75,
  "missedEvents": [],
  "snapshotByUser": {
    "user-1": "data:image/png;base64,..."
  }
}
```
