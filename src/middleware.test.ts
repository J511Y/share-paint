import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(async () => new Response('ok')),
}));

import { middleware } from './middleware';
import { updateSession } from '@/lib/supabase/middleware';

describe('middleware', () => {
  it('delegates to updateSession', async () => {
    const request = new NextRequest('https://example.com/draw');
    const response = await middleware(request);

    expect(updateSession).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
  });
});
