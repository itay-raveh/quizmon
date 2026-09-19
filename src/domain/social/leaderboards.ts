import type { SocialPlayer } from './friends.ts';

export type LeaderboardScope = 'global' | 'friends';
export interface LeaderboardEntry {
  player: SocialPlayer;
  rank: number;
  score: number;
  elapsedMilliseconds: number;
}
export interface DailyLeaderboard {
  accountId: string;
  date: string;
  scope: LeaderboardScope;
  checkedAt: string;
  total: number;
  items: LeaderboardEntry[];
  viewer: LeaderboardEntry | null;
  nextCursor: string | null;
}
