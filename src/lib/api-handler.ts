import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { devLogger as logger } from '@/lib/logger';
import { attachRequestIdHeader } from '@/lib/observability/request-id';

export interface ApiContext {
  req: NextRequest;
  params?: Record<string, string>;
  user?: { id: string; email?: string } | null;
  requestId: string;
}

export type ApiHandler = (ctx: ApiContext) => Promise<NextResponse>;

interface ApiHandlerOptions {
  requireAuth?: boolean;
}

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function getClientInfo(req: NextRequest): Record<string, string | null> {
  return {
    userAgent: req.headers.get('user-agent'),
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
    referer: req.headers.get('referer'),
  };
}

export function withApiHandler(
  handler: ApiHandler,
  options: ApiHandlerOptions = {}
) {
  return async (
    req: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    const path = req.nextUrl.pathname;
    const method = req.method;

    // 요청 시작 로그
    logger.info(`API Request started`, {
      requestId,
      path,
      method,
      query: Object.fromEntries(req.nextUrl.searchParams),
      ...getClientInfo(req),
    });

    try {
      const supabase = await createClient();
      let user: { id: string; email?: string } | null = null;

      // 인증 확인
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (options.requireAuth) {
        if (authError || !authData.user) {
          const duration = Date.now() - startTime;
          logger.request({
            message: 'Unauthorized request',
            requestId,
            path,
            method,
            statusCode: 401,
            duration,
          });
          return attachRequestIdHeader(
            NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }),
            requestId
          ) as NextResponse;
        }
        user = { id: authData.user.id, email: authData.user.email };
      } else if (authData.user) {
        user = { id: authData.user.id, email: authData.user.email };
      }

      // params 처리 (Next.js 15에서 Promise로 변경됨)
      const params = context?.params ? await context.params : undefined;

      // 핸들러 실행
      const response = await handler({
        req,
        params,
        user,
        requestId,
      });

      const duration = Date.now() - startTime;
      const statusCode = response.status;

      // 응답 로그
      logger.request({
        message: 'API Request completed',
        requestId,
        path,
        method,
        statusCode,
        duration,
        userId: user?.id,
      });

      return attachRequestIdHeader(response, requestId) as NextResponse;
    } catch (error) {
      const duration = Date.now() - startTime;

      // 에러 로그 (상세 정보 포함)
      logger.request({
        message: 'API Request failed',
        requestId,
        path,
        method,
        statusCode: 500,
        duration,
        error,
        context: {
          query: Object.fromEntries(req.nextUrl.searchParams),
          ...getClientInfo(req),
        },
      });

      // 클라이언트에게는 간단한 에러 메시지만 반환
      return attachRequestIdHeader(
        NextResponse.json(
          {
            error: '서버 오류가 발생했습니다.',
            requestId, // 디버깅용
          },
          { status: 500 }
        ),
        requestId
      ) as NextResponse;
    }
  };
}

// 간편 유틸리티
export const apiHandler = withApiHandler;
export const authApiHandler = (handler: ApiHandler) =>
  withApiHandler(handler, { requireAuth: true });
