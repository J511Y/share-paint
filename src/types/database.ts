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
  time_limit: number; // 초 단위, 0 = 무제한
  actual_time: number | null;
  likes_count: number;
  comments_count: number;
  battle_id: string | null;
  created_at: string;
  // Relations
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
  // Relations
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
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  // Relations
  host?: Profile;
  participants?: BattleParticipant[];
}

export interface BattleParticipant {
  id: string;
  battle_id: string;
  user_id: string;
  joined_at: string;
  // Relations
  profile?: Profile;
}

export interface Topic {
  id: string;
  content: string;
  category: string | null;
  difficulty: 'easy' | 'normal' | 'hard';
  created_at: string;
}

// Insert 타입 정의
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

// Supabase Database types
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      paintings: {
        Row: Painting;
        Insert: PaintingInsert;
        Update: Partial<Omit<Painting, 'id' | 'created_at'>>;
      };
      likes: {
        Row: Like;
        Insert: LikeInsert;
        Update: never;
      };
      comments: {
        Row: Comment;
        Insert: CommentInsert;
        Update: Partial<Omit<Comment, 'id' | 'created_at'>>;
      };
      follows: {
        Row: Follow;
        Insert: FollowInsert;
        Update: never;
      };
      battles: {
        Row: Battle;
        Insert: BattleInsert;
        Update: Partial<Omit<Battle, 'id' | 'created_at'>>;
      };
      battle_participants: {
        Row: BattleParticipant;
        Insert: BattleParticipantInsert;
        Update: never;
      };
      topics: {
        Row: Topic;
        Insert: TopicInsert;
        Update: Partial<Omit<Topic, 'id' | 'created_at'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
