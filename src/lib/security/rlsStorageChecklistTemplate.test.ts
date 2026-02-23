import { describe, expect, it } from 'vitest';

import { buildRlsStorageAuditChecklist } from './rlsStorageChecklistTemplate';

describe('buildRlsStorageAuditChecklist', () => {
  it('contains required audit sections', () => {
    const content = buildRlsStorageAuditChecklist();

    expect(content).toContain('# RLS/Storage Audit Checklist (PAI-30)');
    expect(content).toContain('## 1) RLS 정책 점검');
    expect(content).toContain('## 2) Storage 버킷 정책 점검');
    expect(content).toContain('## 3) 마이그레이션 설계 체크');
    expect(content).toContain('## 4) 증빙');
  });
});
