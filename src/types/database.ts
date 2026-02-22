export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Painting {
  id: string;
  user_id: string;
  image_url: string;
  topic: string;
  time_limit: number;
  actual_time: number | null;
  likes_count: number;
  comments_count: number;
  battle_id: string | null;
  created_at: string;
  profile?: Profile;
}

export interface Like {
  id: string;
  user_id: string;
  painting_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  painting_id: string;
  content: string;
  created_at: string;
  profile?: Profile;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Battle {
  id: string;
  host_id: string;
  title: string;
  topic: string | null;
  time_limit: number;
  max_participants: number;
  status: 'waiting' | 'in_progress' | 'finished';
  is_private: boolean;
  password?: string | null;
  password_hash?: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  host?: Profile;
  participants?: BattleParticipant[];
}

export interface BattleParticipant {
  id: string;
  battle_id: string;
  user_id: string;
  joined_at: string;
  profile?: Profile;
}

export interface Topic {
  id: string;
  content: string;
  category: string | null;
  difficulty: 'easy' | 'normal' | 'hard';
  created_at: string;
}

export interface ApiLog {
  id: string;
  created_at: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context: Record<string, unknown>;
  error_message: string | null;
  error_stack: string | null;
  request_id: string | null;
  user_id: string | null;
  path: string | null;
  method: string | null;
  status_code: number | null;
  duration_ms: number | null;
}

type DatabaseJsonValue = Record<string, unknown>;
type DatabaseRow<T extends object> = T & DatabaseJsonValue;
type DatabaseInsert<T extends object> = T & DatabaseJsonValue;
type DatabaseUpdate<T extends object> = T & DatabaseJsonValue;

export type ApiLogInsert = {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
  error_message?: string | null;
  error_stack?: string | null;
  request_id?: string | null;
  user_id?: string | null;
  path?: string | null;
  method?: string | null;
  status_code?: number | null;
  duration_ms?: number | null;
};

export type ProfileInsert = {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
};

export type PaintingInsert = {
  user_id: string;
  image_url: string;
  topic: string;
  time_limit: number;
  actual_time?: number | null;
  battle_id?: string | null;
};

export type LikeInsert = {
  user_id: string;
  painting_id: string;
};

export type CommentInsert = {
  user_id: string;
  painting_id: string;
  content: string;
};

export type FollowInsert = {
  follower_id: string;
  following_id: string;
};

export type BattleInsert = {
  host_id: string;
  title: string;
  topic?: string | null;
  time_limit: number;
  max_participants?: number;
  is_private?: boolean;
  password_hash?: string | null;
};

export type BattleParticipantInsert = {
  battle_id: string;
  user_id: string;
};

export type TopicInsert = {
  content: string;
  category?: string | null;
  difficulty?: 'easy' | 'normal' | 'hard';
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: DatabaseRow<Profile>;
        Insert: DatabaseInsert<ProfileInsert>;
        Update: DatabaseUpdate<Partial<Omit<Profile, 'id' | 'created_at'>>>;
        Relationships: [];
      };
      paintings: {
        Row: DatabaseRow<Painting>;
        Insert: DatabaseInsert<PaintingInsert>;
        Update: DatabaseUpdate<Partial<Omit<Painting, 'id' | 'created_at'>>>;
        Relationships: [];
      };
      likes: {
        Row: DatabaseRow<Like>;
        Insert: DatabaseInsert<LikeInsert>;
        Update: Record<string, never>;
        Relationships: [];
      };
      comments: {
        Row: DatabaseRow<Comment>;
        Insert: DatabaseInsert<CommentInsert>;
        Update: DatabaseUpdate<Partial<Omit<Comment, 'id' | 'created_at'>>>;
        Relationships: [];
      };
      follows: {
        Row: DatabaseRow<Follow>;
        Insert: DatabaseInsert<FollowInsert>;
        Update: Record<string, never>;
        Relationships: [];
      };
      battles: {
        Row: DatabaseRow<Battle>;
        Insert: DatabaseInsert<BattleInsert>;
        Update: DatabaseUpdate<Partial<Omit<Battle, 'id' | 'created_at'>>>;
        Relationships: [];
      };
      battle_participants: {
        Row: DatabaseRow<BattleParticipant>;
        Insert: DatabaseInsert<BattleParticipantInsert>;
        Update: Record<string, never>;
        Relationships: [];
      };
      topics: {
        Row: DatabaseRow<Topic>;
        Insert: DatabaseInsert<TopicInsert>;
        Update: DatabaseUpdate<Partial<Omit<Topic, 'id' | 'created_at'>>>;
        Relationships: [];
      };
      api_logs: {
        Row: DatabaseRow<ApiLog>;
        Insert: DatabaseInsert<ApiLogInsert>;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
