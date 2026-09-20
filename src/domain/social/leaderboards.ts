import type { SocialPlayer } from './friends.ts';

export type LeaderboardScope = 'global' | 'friends';
export type LeaderboardMode = 'daily' | 'training';
export interface LeaderboardEntry {
  player: SocialPlayer;
  rank: number;
  score: number;
  elapsedMilliseconds: number;
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
