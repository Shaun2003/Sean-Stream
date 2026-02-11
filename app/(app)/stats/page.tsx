"use client";

import { useEffect, useState } from "react";
import {
  getListeningStats,
  getTopTracks,
  getTopArtists,
  formatListeningTime,
  type ListeningStats,
  type TrackStats,
  type ArtistStats,
} from "@/lib/stats";
import {
  getGamification,
  formatLevel,
  getXPProgress,
  getXPForNextLevel,
  type UserGamification,
  type Achievement,
} from "@/lib/gamification";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Clock,
  Music,
  Disc3,
  Flame,
  Trophy,
  Award,
  Zap,
  TrendingUp,
  Heart,
  Star,
  Crown,
  Target,
  Headphones,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "oklch(0.72 0.25 142)", // primary green
  "oklch(0.65 0.20 250)", // blue
  "oklch(0.70 0.20 30)",  // orange
  "oklch(0.65 0.18 330)", // pink
  "oklch(0.75 0.15 80)",  // yellow
];

export default function StatsPage() {
  const [stats, setStats] = useState<ListeningStats | null>(null);
  const [topTracks, setTopTracks] = useState<TrackStats[]>([]);
  const [topArtists, setTopArtists] = useState<ArtistStats[]>([]);
  const [gamification, setGamification] = useState<UserGamification | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setIsLoading(true);
      try {
        const [statsData, tracks, artists] = await Promise.all([
          getListeningStats(),
          getTopTracks(10),
          getTopArtists(5),
        ]);
        setStats(statsData);
        setTopTracks(tracks);
        setTopArtists(artists);
        setGamification(getGamification());
      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!stats || !gamification) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
          <Music className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">No stats yet</h2>
        <p className="text-muted-foreground max-w-sm">
          Start listening to music to build your stats and unlock achievements.
        </p>
      </div>
    );
  }

  const xpProgress = getXPProgress(gamification.xp, gamification.level);
  const nextLevelXP = getXPForNextLevel(gamification.level);

  const topTracksChartData = topTracks.slice(0, 5).map((t) => ({
    name: t.title.length > 20 ? t.title.slice(0, 20) + "..." : t.title,
    plays: t.playCount,
  }));

  const topArtistsChartData = topArtists.map((a, i) => ({
    name: a.artist.length > 15 ? a.artist.slice(0, 15) + "..." : a.artist,
    value: a.playCount,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div className="space-y-8 pb-8">
      <h1 className="text-3xl font-bold text-foreground">Your Stats</h1>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-secondary/50 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-card gap-2">
            <TrendingUp className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="achievements" className="data-[state=active]:bg-card gap-2">
            <Trophy className="w-4 h-4" />
            Achievements
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-8">
          {/* Level Card */}
          <Card className="p-6 bg-gradient-to-br from-primary/10 via-transparent to-transparent border-primary/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">{gamification.level}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-foreground">Level {gamification.level}</h2>
                <p className="text-sm text-muted-foreground">{formatLevel(gamification.level)}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">{gamification.xp} XP</p>
                <p className="text-xs text-muted-foreground">{nextLevelXP} XP to next level</p>
              </div>
            </div>
            <Progress value={xpProgress} className="h-2" />
          </Card>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Clock}
              label="Total Listening"
              value={formatListeningTime(stats.totalListeningTime)}
              accent="text-blue-500"
              bgAccent="bg-blue-500/10"
            />
            <StatCard
              icon={Music}
              label="Tracks Played"
              value={stats.totalTracks.toString()}
              accent="text-primary"
              bgAccent="bg-primary/10"
            />
            <StatCard
              icon={Disc3}
              label="Artists"
              value={stats.totalArtists.toString()}
              accent="text-orange-500"
              bgAccent="bg-orange-500/10"
            />
            <StatCard
              icon={Flame}
              label="Current Streak"
              value={`${gamification.streak} days`}
              accent="text-orange-500"
              bgAccent="bg-orange-500/10"
            />
          </div>

          {/* This Week / Month */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-5 border-l-4 border-l-blue-500">
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-1">This Week</p>
              <p className="text-3xl font-bold text-foreground">{formatListeningTime(stats.thisWeekListeningTime)}</p>
            </Card>
            <Card className="p-5 border-l-4 border-l-primary">
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-1">This Month</p>
              <p className="text-3xl font-bold text-foreground">{formatListeningTime(stats.thisMonthListeningTime)}</p>
            </Card>
          </div>

          {/* Weekly Challenge */}
          {gamification.weeklyChallenge && (
            <Card className="p-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">{gamification.weeklyChallenge.title}</h3>
                  <p className="text-sm text-muted-foreground">{gamification.weeklyChallenge.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">+{gamification.weeklyChallenge.reward} XP</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Progress
                  value={(gamification.weeklyChallenge.progress / gamification.weeklyChallenge.target) * 100}
                  className="flex-1 h-2"
                />
                <span className="text-sm font-medium text-muted-foreground">
                  {gamification.weeklyChallenge.progress}/{gamification.weeklyChallenge.target}
                </span>
              </div>
            </Card>
          )}

          {/* Top Tracks Chart */}
          {topTracksChartData.length > 0 && (
            <Card className="p-6">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                Most Played Tracks
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topTracksChartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={150}
                      tick={{ fill: "oklch(0.65 0 0)", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(0.12 0 0)",
                        border: "1px solid oklch(0.22 0 0)",
                        borderRadius: "8px",
                        color: "oklch(0.98 0 0)",
                      }}
                    />
                    <Bar dataKey="plays" fill="oklch(0.72 0.25 142)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Top Artists Chart */}
          {topArtistsChartData.length > 0 && (
            <Card className="p-6">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Headphones className="w-5 h-5 text-primary" />
                Top Artists
              </h3>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="h-52 w-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topArtistsChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {topArtistsChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3">
                  {topArtistsChartData.map((artist, i) => (
                    <div key={artist.name} className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: artist.fill }}
                      />
                      <span className="text-sm text-foreground flex-1 truncate">{artist.name}</span>
                      <span className="text-sm text-muted-foreground">{artist.value} plays</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Top Tracks List */}
          {topTracks.length > 0 && (
            <Card className="p-6">
              <h3 className="font-bold text-foreground mb-4">Your Top Tracks</h3>
              <div className="space-y-3">
                {topTracks.map((track, i) => (
                  <div key={track.trackId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                    <span className="w-6 text-center text-sm font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-foreground">{track.playCount} plays</p>
                      <p className="text-xs text-muted-foreground">{formatListeningTime(track.totalListeningTime)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="mt-6 space-y-8">
          {/* Streak Card */}
          <Card className="p-6 bg-gradient-to-r from-orange-500/10 to-transparent border-orange-500/20">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                <Flame className="w-8 h-8 text-orange-500" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">{gamification.streak} Day Streak</h3>
                <p className="text-sm text-muted-foreground">
                  Longest: {gamification.longestStreak} days
                </p>
              </div>
            </div>
          </Card>

          {/* Unlocked Achievements */}
          {gamification.achievements.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Unlocked ({gamification.achievements.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {gamification.achievements.map((achievement) => (
                  <AchievementCard key={achievement.id} achievement={achievement} unlocked />
                ))}
              </div>
            </div>
          )}

          {/* Locked Achievements */}
          <div>
            <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-muted-foreground" />
              Locked
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {getLockedAchievements(gamification.achievements).map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} unlocked={false} />
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  bgAccent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: string;
  bgAccent: string;
}) {
  return (
    <Card className="p-4">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", bgAccent)}>
        <Icon className={cn("w-5 h-5", accent)} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </Card>
  );
}

function AchievementCard({ achievement, unlocked }: { achievement: Achievement; unlocked: boolean }) {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    play: Music, music: Music, headphones: Headphones, disc: Disc3,
    library: Music, clock: Clock, timer: Clock, flame: Flame,
    fire: Flame, trophy: Trophy, crown: Crown, heart: Heart,
    "heart-filled": Heart, star: Star, "list-music": Music,
    "list-plus": Music,
  };

  const Icon = iconMap[achievement.icon] || Award;

  return (
    <div className={cn(
      "flex items-center gap-4 p-4 rounded-xl border transition-colors",
      unlocked
        ? "bg-card border-primary/20"
        : "bg-card/50 border-border/50 opacity-60"
    )}>
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
        unlocked ? "bg-primary/20" : "bg-secondary"
      )}>
        <Icon className={cn("w-6 h-6", unlocked ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm text-foreground">{achievement.title}</h4>
        <p className="text-xs text-muted-foreground">{achievement.description}</p>
        {unlocked && achievement.unlockedAt && (
          <p className="text-xs text-primary mt-1">
            Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

function getLockedAchievements(unlocked: Achievement[]): Achievement[] {
  const unlockedIds = new Set(unlocked.map((a) => a.id));
  const allAchievements: Achievement[] = [
    { id: "first-play", title: "First Note", description: "Play your first track", icon: "play", category: "listening", requirement: 1 },
    { id: "tracks-10", title: "Getting Started", description: "Play 10 tracks", icon: "music", category: "listening", requirement: 10 },
    { id: "tracks-50", title: "Music Lover", description: "Play 50 tracks", icon: "headphones", category: "listening", requirement: 50 },
    { id: "tracks-100", title: "Audiophile", description: "Play 100 tracks", icon: "disc", category: "listening", requirement: 100 },
    { id: "tracks-500", title: "Vinyl Collector", description: "Play 500 tracks", icon: "library", category: "listening", requirement: 500 },
    { id: "minutes-60", title: "Hour Power", description: "Listen for 60 minutes", icon: "clock", category: "listening", requirement: 60 },
    { id: "minutes-600", title: "Marathon Listener", description: "Listen for 10 hours", icon: "timer", category: "listening", requirement: 600 },
    { id: "streak-3", title: "Hat Trick", description: "3-day listening streak", icon: "flame", category: "streak", requirement: 3 },
    { id: "streak-7", title: "Weekly Warrior", description: "7-day listening streak", icon: "fire", category: "streak", requirement: 7 },
    { id: "streak-30", title: "Monthly Master", description: "30-day listening streak", icon: "trophy", category: "streak", requirement: 30 },
    { id: "streak-100", title: "Century Club", description: "100-day listening streak", icon: "crown", category: "streak", requirement: 100 },
    { id: "likes-5", title: "Picky Listener", description: "Like 5 tracks", icon: "heart", category: "collection", requirement: 5 },
    { id: "likes-25", title: "Curator", description: "Like 25 tracks", icon: "heart-filled", category: "collection", requirement: 25 },
    { id: "likes-100", title: "Tastemaker", description: "Like 100 tracks", icon: "star", category: "collection", requirement: 100 },
    { id: "playlist-1", title: "DJ Beginner", description: "Create your first playlist", icon: "list-music", category: "collection", requirement: 1 },
    { id: "playlist-5", title: "Playlist Pro", description: "Create 5 playlists", icon: "list-plus", category: "collection", requirement: 5 },
  ];
  return allAchievements.filter((a) => !unlockedIds.has(a.id));
}
