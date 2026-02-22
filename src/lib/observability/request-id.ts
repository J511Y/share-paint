const REQUEST_ID_HEADER = 'x-request-id';

export function attachRequestIdHeader(response: Response, requestId: string): Response {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export function getRequestIdHeaderName(): string {
  return REQUEST_ID_HEADER;
}
