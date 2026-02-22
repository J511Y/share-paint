export function buildRlsStorageAuditChecklist(): string {
  return `# RLS/Storage Audit Checklist (PAI-30)

## 1) RLS 정책 점검
- [ ] 모든 테이블에 RLS 활성화 여부 확인
- [ ] anon/authenticated role별 SELECT/INSERT/UPDATE/DELETE 정책 검토
- [ ] 정책 조건에서 user id 매핑이 정확한지 검토
- [ ] 서비스 역할(service_role)만 허용해야 하는 경로 분리 확인

## 2) Storage 버킷 정책 점검
- [ ] paintings 버킷 업로드 권한(작성자만) 확인
- [ ] avatars 버킷 업로드/수정 권한 확인
- [ ] 공개/비공개 버킷 정책 일관성 확인
- [ ] MIME/확장자 제한 정책 점검

## 3) 마이그레이션 설계 체크
- [ ] 정책 변경 전/후 동작 시나리오 정리
- [ ] 롤포워드 SQL과 롤백 SQL 쌍으로 준비
- [ ] staging 리허설 절차(적용→검증→롤백) 문서화
- [ ] 운영 반영 창구/승인자/복구 기준 명시

## 4) 증빙
- [ ] 정책 덤프 캡처(SQL/스크린샷)
- [ ] 검증 로그(성공/실패 케이스)
- [ ] 관련 PR/커밋/Linear 링크
`;
}
