import type { SocialPlayer } from './friends.ts';

export type LeaderboardScope = 'global' | 'friends';
export type LeaderboardMode = 'daily' | 'training';
interface LeaderboardEntry {
  player: SocialPlayer;
  rank: number | null;
  score: number;
  elapsedMilliseconds: number;
  comparable: boolean;
}
export interface Leaderboard {
  accountId: string;
  date?: string;
  scope: LeaderboardScope;
  checkedAt: string;
  total: number;
  items: LeaderboardEntry[];
  viewer: LeaderboardEntry | null;
  nextCursor: string | null;
}
export interface DailyLeaderboard extends Leaderboard {
  date: string;
}
