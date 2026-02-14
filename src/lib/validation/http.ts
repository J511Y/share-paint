import { z, type ZodIssue, type ZodTypeAny } from 'zod';

export type ParseResultError = {
  field?: string;
  issue?: string;
};

export class JsonParseError extends Error {
  public readonly issues: ParseResultError[];

  constructor(message: string, issues: ParseResultError[] = []) {
    super(message);
    this.name = 'JsonParseError';
    this.issues = issues;
  }
}

export async function parseJsonResponse<TSchema extends ZodTypeAny>(
  response: Response,
  schema: TSchema
): Promise<z.infer<TSchema>> {
  const data = await response.json();
  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue: ZodIssue) => ({
      field: issue.path.join('.'),
      issue: issue.message,
    }));
    throw new JsonParseError('Invalid response format', issues);
  }

  return parsed.data;
}
