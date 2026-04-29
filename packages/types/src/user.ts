export interface User {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  createdAt: string;
}

export interface PublicProfile {
  id: string;
  username: string;
  displayName?: string;
  joinedAt: string;
  totalSessions: number;
  totalHours: number;
  currentStreak: number;
  longestStreak: number;
  averageScore: number;
}
