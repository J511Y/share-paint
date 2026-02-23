import { z } from 'zod';

export const ApiProfileSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(1),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  bio: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ApiProfile = z.infer<typeof ApiProfileSchema>;
export type ProfileResponse = ApiProfile;

export const ApiPaintingSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  guest_id: z.string().nullable().optional(),
  guest_name: z.string().nullable().optional(),
  image_url: z.string().url(),
  topic: z.string(),
  time_limit: z.coerce.number().int().nonnegative(),
  actual_time: z.union([z.number().int().nonnegative(), z.null()]),
  likes_count: z.coerce.number().int().nonnegative(),
  comments_count: z.coerce.number().int().nonnegative(),
  battle_id: z.string().uuid().nullable(),
  created_at: z.string(),
  profile: ApiProfileSchema.nullable(),
});

export type ApiPainting = z.infer<typeof ApiPaintingSchema>;
export type PaintingWithProfile = ApiPainting;
export const ApiPaintingArraySchema = z.array(ApiPaintingSchema);
export const PaintingWithProfileArraySchema = ApiPaintingArraySchema;

export const PaintingCreatePayloadSchema = z.object({
  image_url: z.string().url(),
  topic: z.string().trim().min(1),
  time_limit: z.coerce.number().int().nonnegative().default(0),
  actual_time: z.coerce.number().int().nonnegative().default(0),
  battle_id: z.string().uuid().nullable().optional(),
});

export type PaintingCreatePayload = z.infer<typeof PaintingCreatePayloadSchema>;

export const ApiBattleSchema = z.object({
  id: z.string().uuid(),
  host_id: z.string().uuid().nullable(),
  host_guest_id: z.string().nullable().optional(),
  host_guest_name: z.string().nullable().optional(),
  title: z.string().min(1),
  topic: z.string().nullable(),
  time_limit: z.coerce.number().int().nonnegative(),
  max_participants: z.coerce.number().int().positive(),
  status: z.enum(['waiting', 'in_progress', 'finished']),
  is_private: z.coerce.boolean(),
  password: z.string().nullable().optional(),
  password_hash: z.string().nullable().optional(),
  created_at: z.string(),
  started_at: z.string().nullable(),
  ended_at: z.string().nullable(),
});

export type ApiBattle = z.infer<typeof ApiBattleSchema>;
export type BattleDetailPayload = ApiBattle;

export const BattleCreatePayloadSchema = z.object({
  title: z.string().trim().min(1),
  time_limit: z.coerce.number().int().nonnegative().default(300),
  max_participants: z.coerce.number().int().positive().default(10),
  is_private: z.coerce.boolean().default(false),
  password: z.string().trim().optional(),
  topic: z.string().trim().optional(),
});

export type BattleCreatePayload = z.infer<typeof BattleCreatePayloadSchema>;

export const BattleJoinPayloadSchema = z.object({
  password: z.string().trim().optional(),
});

export type BattleJoinPayload = z.infer<typeof BattleJoinPayloadSchema>;

export const BattleParticipantCountSchema = z.object({
  count: z.coerce.number().int().nonnegative(),
});

export const BattleParticipantRefSchema = z.object({
  id: z.string().min(1),
});

export const BattleParticipantResultSchema = z.union([
  BattleParticipantCountSchema,
  BattleParticipantRefSchema,
]);

export const BattleWithCountSchema = ApiBattleSchema.extend({
  host: ApiProfileSchema.nullable().optional(),
  participants: z.array(BattleParticipantResultSchema).default([]),
});

export type BattleParticipantResult = z.infer<typeof BattleParticipantResultSchema>;
export type ParticipantCountResult = BattleParticipantResult;
export type BattleWithCount = z.infer<typeof BattleWithCountSchema>;
export type BattleListItem = BattleWithCount;
export const BattleArraySchema = z.array(BattleWithCountSchema);

export const ApiCommentSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  guest_id: z.string().nullable().optional(),
  guest_name: z.string().nullable().optional(),
  painting_id: z.string().uuid(),
  content: z.string().trim().min(1),
  created_at: z.string(),
  profile: ApiProfileSchema.nullable(),
});

export type ApiComment = z.infer<typeof ApiCommentSchema>;
export const ApiCommentArraySchema = z.array(ApiCommentSchema);

export const CommentCreatePayloadSchema = z.object({
  content: z.string().trim().min(1),
});

export type CommentCreatePayload = z.infer<typeof CommentCreatePayloadSchema>;

export const TopicCreatePayloadSchema = z.object({
  content: z.string().trim().min(1),
  category: z.string().trim().optional().default('general'),
  difficulty: z.enum(['easy', 'normal', 'hard']).default('normal'),
});

export type TopicCreatePayload = z.infer<typeof TopicCreatePayloadSchema>;

export const TopicRandomQuerySchema = z.object({
  category: z.string().trim().optional(),
  difficulty: z.enum(['easy', 'normal', 'hard']).optional(),
});

export type TopicRandomQuery = z.infer<typeof TopicRandomQuerySchema>;

export const ApiTopicSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1),
  category: z.string(),
  difficulty: z.enum(['easy', 'normal', 'hard']),
  created_at: z.string(),
});

export type ApiTopic = z.infer<typeof ApiTopicSchema>;
export type TopicRecord = ApiTopic;
export const ApiTopicArraySchema = z.array(ApiTopicSchema);

export const ProfileWithCountsSchema = ApiProfileSchema.extend({
  followersCount: z.coerce.number().int().nonnegative(),
  followingCount: z.coerce.number().int().nonnegative(),
  isFollowing: z.boolean(),
});

export type ProfileWithCounts = z.infer<typeof ProfileWithCountsSchema>;

export const ApiErrorSchema = z.object({
  code: z.enum([
    'AUTH_REQUIRED',
    'FORBIDDEN',
    'NOT_FOUND',
    'BAD_REQUEST',
    'VALIDATION_ERROR',
    'ROOM_FULL',
    'INVALID_PASSWORD',
    'RATE_LIMITED',
    'INTERNAL_ERROR',
  ]),
  message: z.string(),
  details: z.unknown().optional(),
  traceId: z.string(),
});
