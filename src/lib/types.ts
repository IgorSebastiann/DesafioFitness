export type Role = "member" | "admin";
export type ActivityStatus = "pending" | "approved" | "rejected";
export type ProofKind = "image" | "video";
export type PeriodKind = "weekly" | "monthly";

export type Profile = {
  id: string;
  display_name: string;
  nickname: string | null;
  avatar_path: string | null;
  role: Role;
};

export type Challenge = {
  id: string;
  name: string;
  daily_point_limit: number;
  starts_on: string;
  is_active: boolean;
};

export type Category = {
  id: string;
  name: string;
  points: number;
  min_duration_minutes: number;
  icon: string;
  is_active: boolean;
};

export type ActivityRow = {
  id: string;
  challenge_id: string;
  user_id: string;
  category_id: string;
  activity_date: string;
  activity_time: string;
  duration_minutes: number;
  distance_km: number | null;
  description: string | null;
  proof_path: string;
  proof_kind: ProofKind;
  status: ActivityStatus;
  points_awarded: number;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  category: { name: string; icon: string } | null;
  owner: { display_name: string; avatar_path: string | null } | null;
};

export type StandingRow = {
  user_id: string;
  display_name: string;
  nickname: string | null;
  avatar_path: string | null;
  points: number;
  activity_count: number;
};
