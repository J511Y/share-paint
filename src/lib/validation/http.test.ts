import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import { parseJsonResponse, JsonParseError } from './http';

describe('parseJsonResponse', () => {
  const schema = z.object({
    ok: z.boolean(),
    id: z.string(),
  });

  it('유효한 응답은 스키마에 맞게 파싱한다', async () => {
    const response = new Response(
      JSON.stringify({
        ok: true,
        id: 'sample-id',
      })
    );

    const data = await parseJsonResponse(response, schema);

    expect(data).toEqual({
      ok: true,
      id: 'sample-id',
    });
  });

  it('스키마 불일치 시 JsonParseError를 던진다', async () => {
    const response = new Response(
      JSON.stringify({
        ok: 'not-a-bool',
        id: 'sample-id',
      })
    );

    await expect(parseJsonResponse(response, schema)).rejects.toBeInstanceOf(JsonParseError);
  });

  it('잘못된 JSON이면 예외를 전파한다', async () => {
    const response = new Response('not-json');

    await expect(parseJsonResponse(response, schema)).rejects.toThrow(SyntaxError);
  });
});
