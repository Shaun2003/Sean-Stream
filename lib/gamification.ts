'use client';
import localforage from 'localforage';

// ==================================================================================
// Interfaces and Types
// ==================================================================================

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "listening" | "social" | "collection" | "streak";
  requirement: number;
  unlockedAt?: number;
}

export interface UserGamification {
  xp: number;
  level: number;
  streak: number;
  longest_streak: number;
  last_listened_date: string | null;
  total_tracks_played: number;
  total_listening_minutes: number;
  total_likes: number;
  total_playlists: number;
  total_downloads: number;
  total_shares: number;
  unlocked_achievements: Set<string>;
}

export type RecordEventResult = {
  newAchievements: Achievement[];
  leveledUp: boolean;
  newXp: number;
  userState: UserGamification;
};

const GAMIFICATION_KEY = 'user_gamification_data';

// ==================================================================================
// Constants
// ==================================================================================

const XP_PER_TRACK = 10;
const XP_PER_LIKE = 5;
const XP_PER_PLAYLIST_CREATE = 25;
const XP_PER_DOWNLOAD = 15;
const XP_PER_SHARE = 10;

const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000,
  5200, 6500, 8000, 10000, 12500, 15500, 19000, 23000, 28000, 35000,
];

const ALL_ACHIEVEMENTS: Achievement[] = [
  // Listening
  { id: "first-play", title: "First Note", description: "Play your first track", icon: "play", category: "listening", requirement: 1 },
  { id: "tracks-10", title: "Getting Started", description: "Play 10 tracks", icon: "music", category: "listening", requirement: 10 },
  { id: "tracks-50", title: "Music Lover", description: "Play 50 tracks", icon: "headphones", category: "listening", requirement: 50 },
  { id: "tracks-100", title: "Audiophile", description: "Play 100 tracks", icon: "disc", category: "listening", requirement: 100 },
  { id: "minutes-60", title: "Hour Power", description: "Listen for 60 minutes", icon: "clock", category: "listening", requirement: 60 },
  { id: "minutes-600", title: "Marathon Listener", description: "Listen for 10 hours", icon: "timer", category: "listening", requirement: 600 },
  // Streaks
  { id: "streak-3", title: "Hat Trick", description: "3-day listening streak", icon: "flame", category: "streak", requirement: 3 },
  { id: "streak-7", title: "Weekly Warrior", description: "7-day listening streak", icon: "fire", category: "streak", requirement: 7 },
  { id: "streak-30", title: "Monthly Master", description: "30-day listening streak", icon: "trophy", category: "streak", requirement: 30 },
  // Collection
  { id: "likes-5", title: "Picky Listener", description: "Like 5 tracks", icon: "heart", category: "collection", requirement: 5 },
  { id: "likes-25", title: "Curator", description: "Like 25 tracks", icon: "heart-filled", category: "collection", requirement: 25 },
  { id: "likes-100", title: "Tastemaker", description: "Like 100 tracks", icon: "star", category: "collection", requirement: 100 },
  { id: "playlist-1", title: "DJ Beginner", description: "Create your first playlist", icon: "list-music", category: "collection", requirement: 1 },
  { id: "playlist-5", title: "Playlist Pro", description: "Create 5 playlists", icon: "list-plus", category: "collection", requirement: 5 },
  { id: "download-1", title: "Offline Explorer", description: "Download your first track", icon: "download", category: "collection", requirement: 1 },
  { id: "download-10", title: "On-the-Go", description: "Download 10 tracks", icon: "download-cloud", category: "collection", requirement: 10 },
  // Social
  { id: "share-1", title: "Spreading the Word", description: "Share your first track", icon: "share", category: "social", requirement: 1 },
  { id: "share-10", title: "Socialite", description: "Share 10 tracks", icon: "share-2", category: "social", requirement: 10 },
];

// ==================================================================================
// Core Logic
// ==================================================================================

async function getGamificationState(): Promise<UserGamification> {
  const state = await localforage.getItem<UserGamification>(GAMIFICATION_KEY);
  return state || {
    xp: 0, level: 1, streak: 0, longest_streak: 0, last_listened_date: null,
    total_tracks_played: 0, total_listening_minutes: 0, total_likes: 0,
    total_playlists: 0, total_downloads: 0, total_shares: 0,
    unlocked_achievements: new Set(),
  };
}

async function saveGamificationState(state: UserGamification): Promise<void> {
  await localforage.setItem(GAMIFICATION_KEY, state);
}

function checkAchievements(userGamification: UserGamification): Achievement[] {
  const newAchievements: Achievement[] = [];
  
  for (const ach of ALL_ACHIEVEMENTS) {
    if (userGamification.unlocked_achievements.has(ach.id)) continue;

    let progress = 0;
    switch (ach.category) {
      case "listening":
        if (ach.id.includes("tracks")) progress = userGamification.total_tracks_played;
        else if (ach.id.includes("minutes")) progress = userGamification.total_listening_minutes;
        else progress = userGamification.total_tracks_played; // for first-play
        break;
      case "streak":
        progress = userGamification.streak;
        break;
      case "collection":
        if (ach.id.includes("like")) progress = userGamification.total_likes;
        else if (ach.id.includes("playlist")) progress = userGamification.total_playlists;
        else if (ach.id.includes("download")) progress = userGamification.total_downloads;
        break;
      case "social":
        progress = userGamification.total_shares;
        break;
    }

    if (progress >= ach.requirement) {
      newAchievements.push(ach);
      userGamification.unlocked_achievements.add(ach.id);
    }
  }

  return newAchievements;
}

function calculateLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

// ==================================================================================
// Event Recording Functions
// ==================================================================================

async function recordEvent(xpGained: number, updater: (ug: UserGamification) => void): Promise<RecordEventResult> {
  const userGamification = await getGamificationState();
  const oldLevel = userGamification.level;

  updater(userGamification);
  const newXp = userGamification.xp + xpGained;
  userGamification.xp = newXp;
  
  const newLevel = calculateLevel(newXp);
  const leveledUp = newLevel > oldLevel;
  userGamification.level = newLevel;

  const newAchievements = checkAchievements(userGamification);
  
  await saveGamificationState(userGamification);

  return {
    newAchievements,
    leveledUp,
    newXp,
    userState: userGamification,
  };
}

export function recordPlay(durationSeconds: number = 0): Promise<RecordEventResult> {
  return recordEvent(XP_PER_TRACK, (ug) => {
    ug.total_tracks_played += 1;
    ug.total_listening_minutes += Math.round(durationSeconds / 60);
    // Handle streak
    const today = new Date().toDateString();
    if (ug.last_listened_date !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (ug.last_listened_date === yesterday) {
        ug.streak += 1;
      } else {
        ug.streak = 1;
      }
      ug.last_listened_date = today;
      if (ug.streak > ug.longest_streak) {
        ug.longest_streak = ug.streak;
      }
    }
  });
}

export function recordLike(): Promise<RecordEventResult> {
  return recordEvent(XP_PER_LIKE, (ug) => {
    ug.total_likes += 1;
  });
}

export function recordPlaylistCreate(): Promise<RecordEventResult> {
  return recordEvent(XP_PER_PLAYLIST_CREATE, (ug) => {
    ug.total_playlists += 1;
  });
}

export function recordDownload(): Promise<RecordEventResult> {
  return recordEvent(XP_PER_DOWNLOAD, (ug) => {
    ug.total_downloads += 1;
  });
}

export function recordShare(): Promise<RecordEventResult> {
  return recordEvent(XP_PER_SHARE, (ug) => {
    ug.total_shares += 1;
  });
}

// ==================================================================================
// Public API / UI Helper Functions
// ==================================================================================

export const getGamification = getGamificationState;

export async function getUnlockedAchievements(): Promise<Achievement[]> {
  const state = await getGamificationState();
  return ALL_ACHIEVEMENTS.filter(ach => state.unlocked_achievements.has(ach.id));
}

export function getLevelFromXP(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getXPForNextLevel(level: number): number {
  if (level >= LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] * 2;
  return LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[0];
}

export function getXPProgress(xp: number, level: number): number {
  const currentLevelXP = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextLevelXP = getXPForNextLevel(level);
  if (nextLevelXP === currentLevelXP) return 0;
  const progress = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
  return Math.min(Math.max(progress, 0), 100);
}

export function getAchievementIcon(iconName: string): string {
  const icons: Record<string, string> = {
    play: "Play", music: "Music", headphones: "Headphones", disc: "Disc3",
    library: "Library", clock: "Clock", timer: "Timer", flame: "Flame",
    fire: "Flame", trophy: "Trophy", crown: "Crown", heart: "Heart",
    "heart-filled": "Heart", star: "Star", "list-music": "ListMusic",
    "list-plus": "ListPlus", download: "Download", "download-cloud": "Download", 
    share: "Share", "share-2": "Share2",
  };
  return icons[iconName] || "Award";
}

export function formatLevel(level: number): string {
  const titles = [
    "Newbie", "Listener", "Fan", "Enthusiast", "Devotee", "Connoisseur", 
    "Expert", "Master", "Legend", "Virtuoso", "Maestro", "Prodigy", 
    "Savant", "Luminary", "Icon", "Phenom", "Oracle", "Titan", "Deity", "Transcendent"
  ];
  return titles[Math.min(level - 1, titles.length - 1)] || "Transcendent";
}
