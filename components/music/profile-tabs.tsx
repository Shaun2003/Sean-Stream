'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Moon, Sun, LogOut, Search as SearchIcon, Users, Heart,
  Music, Zap, Radio, Sparkles, UserPlus, UserMinus, Loader2, Trash2
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useEnhancedPlayer } from '@/contexts/enhanced-player-context';
import { useToast } from '@/hooks/use-toast';
import {
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
  searchUsers,
  saveThemePreference,
  getThemePreference,
  type FollowUser,
} from '@/lib/social-features';
import {
  getMoodPlaylists,
  generateMoodPlaylist,
  type MoodPlaylist,
} from '@/lib/mood-playlists';
import {
  generateRadioStation,
  getSavedRadioStations,
  deleteRadioStation,
  type RadioStation,
} from '@/lib/radio-station';
import { getActivityFeed, type ActivityItem } from '@/lib/social-features';

const MOOD_DATA: Record<string, { 
  emoji: string; 
  gradient: string; 
  tagline: string; 
  description: string;
  icon: React.ReactNode;
  accentColor: string;
}> = {
  chill: {
    emoji: '😎',
    gradient: 'from-slate-900 via-blue-900 to-slate-900',
    tagline: 'Unwind with smooth, relaxing beats',
    description: 'Lo-fi, ambient, and chill vibes for any moment',
    icon: '🌙',
    accentColor: 'text-blue-400'
  },
  workout: {
    emoji: '💪',
    gradient: 'from-red-900 via-orange-700 to-yellow-900',
    tagline: 'Push your limits with high-energy tracks',
    description: 'Motivating beats and intense energy for your fitness',
    icon: '⚡',
    accentColor: 'text-orange-400'
  },
  focus: {
    emoji: '🧠',
    gradient: 'from-indigo-900 via-purple-900 to-indigo-900',
    tagline: 'Deep concentration for maximum productivity',
    description: 'Instrumental and ambient soundscapes for focus',
    icon: '🎯',
    accentColor: 'text-purple-400'
  },
  party: {
    emoji: '🎉',
    gradient: 'from-pink-900 via-red-800 to-orange-900',
    tagline: 'Get the party started with dance hits',
    description: 'Club bangers and upbeat dance tracks',
    icon: '🔥',
    accentColor: 'text-pink-400'
  },
  romantic: {
    emoji: '💕',
    gradient: 'from-rose-900 via-red-800 to-pink-900',
    tagline: 'Feel the love with romantic melodies',
    description: 'Slow ballads and emotional love songs',
    icon: '🌹',
    accentColor: 'text-rose-400'
  },
  sad: {
    emoji: '😢',
    gradient: 'from-slate-900 via-blue-900 to-indigo-900',
    tagline: 'Express your emotions with soulful songs',
    description: 'Deep, emotional, and introspective tracks',
    icon: '💔',
    accentColor: 'text-slate-400'
  },
  happy: {
    emoji: '😊',
    gradient: 'from-yellow-800 via-orange-700 to-yellow-900',
    tagline: 'Boost your mood with feel-good vibes',
    description: 'Uplifting, positive, and celebratory music',
    icon: '✨',
    accentColor: 'text-yellow-400'
  },
};

interface ProfileProps {
  profile: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
  };
  stats: {
    likedSongs: number;
    playlists: number;
  };
}

export function ProfileTabs({ profile, stats: initialStats }: ProfileProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const router = useRouter();
  const { playQueue } = useEnhancedPlayer();
  const { toast } = useToast();

  // Profile
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<string | undefined>(resolvedTheme);
  const [stats, setStats] = useState(initialStats);
  const [loadingStats, setLoadingStats] = useState(false);

  // Following
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FollowUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Moods
  const [moods, setMoods] = useState<MoodPlaylist[]>([]);
  const [generatingMood, setGeneratingMood] = useState<string | null>(null);

  // Radio
  const [stations, setStations] = useState<RadioStation[]>([]);

  // Activity
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const supabase = createClient();

  // Initialize
  useEffect(() => {
    setMounted(true);
    setCurrentTheme(resolvedTheme);
    loadAllData();
    
    // Load saved theme preference from database
    const loadTheme = async () => {
      const savedTheme = await getThemePreference();
      if (savedTheme && savedTheme !== resolvedTheme) {
        setTheme(savedTheme);
        setCurrentTheme(savedTheme);
      }
    };
    loadTheme();
  }, []);

  // Update currentTheme when resolvedTheme changes (from next-themes)
  useEffect(() => {
    if (resolvedTheme) {
      setCurrentTheme(resolvedTheme);
    }
  }, [resolvedTheme]);

  const loadAllData = async () => {
    loadStats();
    loadFollowData();
    loadMoodPlaylists();
    loadRadioStations();
    loadActivityFeed();
  };

  // ============ PROFILE ============
  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const [likedRes, playlistRes] = await Promise.all([
        supabase
          .from('liked_songs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id),
        supabase
          .from('playlists')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id),
      ]);

      setStats({
        likedSongs: likedRes.count || 0,
        playlists: playlistRes.count || 0,
      });
    } catch (error) {
      console.error('[Profile] Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await supabase.auth.signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: 'Error',
        description: 'Failed to logout',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  // ============ FOLLOWING ============
  const loadFollowData = async () => {
    try {
      const [followerList, followingList] = await Promise.all([
        getFollowers(),
        getFollowing(),
      ]);
      setFollowers(followerList);
      setFollowing(followingList);
    } catch (error) {
      console.error('Error loading follow data:', error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const results = await searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to search users',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleFollowUser = async (userId: string, isFollowing: boolean) => {
    try {
      if (isFollowing) {
        await unfollowUser(userId);
        setFollowing((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, isFollowing: false } : u
          )
        );
      } else {
        await followUser(userId);
        setFollowing((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, isFollowing: true } : u
          )
        );
      }
      toast({
        title: 'Success',
        description: isFollowing ? 'Unfollowed user' : 'Followed user',
      });
    } catch (error) {
      console.error('Error updating follow:', error);
      toast({
        title: 'Error',
        description: 'Failed to update follow status',
        variant: 'destructive',
      });
    }
  };

  // ============ MOODS ============
  const loadMoodPlaylists = async () => {
    try {
      const data = getMoodPlaylists();
      setMoods(data);
    } catch (error) {
      console.error('Error loading mood playlists:', error);
    }
  };

  const handleGenerateMood = async (mood: string) => {
    try {
      setGeneratingMood(mood);
      const playlist = await generateMoodPlaylist(mood as any);
      setMoods((prev) => {
        const filtered = prev.filter((p) => p.mood !== mood);
        return [playlist, ...filtered];
      });
      toast({
        title: 'Success',
        description: `${mood} playlist generated`,
      });
    } catch (error) {
      console.error('Error generating mood playlist:', error);
      toast({
        title: 'Error',
        description: `Failed to generate ${mood} playlist`,
        variant: 'destructive',
      });
    } finally {
      setGeneratingMood(null);
    }
  };

  const handlePlayMood = (playlist: MoodPlaylist) => {
    if (playlist.tracks.length > 0) {
      playQueue(
        playlist.tracks.map((t) => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          image: t.thumbnail,
          duration: t.duration,
        }))
      );
      toast({
        title: 'Now Playing',
        description: `${playlist.mood} playlist`,
      });
    }
  };

  // ============ RADIO ============
  const loadRadioStations = async () => {
    try {
      const data = getSavedRadioStations();
      setStations(data);
    } catch (error) {
      console.error('Error loading radio stations:', error);
    }
  };

  const handleDeleteStation = (id: string) => {
    try {
      deleteRadioStation(id);
      setStations((prev) => prev.filter((s) => s.id !== id));
      toast({
        title: 'Deleted',
        description: 'Radio station removed',
      });
    } catch (error) {
      console.error('Error deleting station:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete radio station',
        variant: 'destructive',
      });
    }
  };

  const handlePlayStation = (station: RadioStation) => {
    if (station.generatedQueue.length > 0) {
      playQueue(
        station.generatedQueue.map((t) => ({
          id: t.id,
          title: t.title,
          artist: t.channelTitle,
          image: t.thumbnail,
          duration: t.duration,
        }))
      );
      toast({
        title: 'Now Playing',
        description: `${station.baseSongTitle} Radio`,
      });
    }
  };

  // ============ ACTIVITY ============
  const loadActivityFeed = async () => {
    try {
      setActivityLoading(true);
      const data = await getActivityFeed();
      setActivities(data);
    } catch (error) {
      console.error('Error loading activity feed:', error);
    } finally {
      setActivityLoading(false);
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString();
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50">
      <Tabs defaultValue="profile" className="w-full">
        {/* Premium Profile Header */}
        <div className="relative border-b border-border/30 bg-gradient-to-b from-blue-950/30 to-transparent pb-6 md:pb-8 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
            <div className="flex flex-col md:flex-row items-start justify-between gap-4 md:gap-6 mb-6">
              <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                <div className="relative">
                  <Avatar className="w-16 h-16 md:w-24 md:h-24 flex-shrink-0 ring-2 ring-primary/50 shadow-xl">
                    <AvatarImage src={profile.avatarUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-2xl md:text-4xl font-bold">
                      {profile.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full ring-2 ring-background"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-semibold text-primary uppercase tracking-wider">Profile</p>
                  <h1 className="text-2xl md:text-4xl font-black text-foreground truncate mt-1">
                    {profile.displayName}
                  </h1>
                  <p className="text-sm md:text-base text-muted-foreground truncate mt-1">{profile.email}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={async () => {
                    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                    setTheme(newTheme);
                    await saveThemePreference(newTheme as "light" | "dark");
                  }}
                  className="w-full sm:w-auto"
                >
                  {currentTheme === 'dark' ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full sm:w-auto"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <Card className="p-3 md:p-4">
                <p className="text-xs md:text-sm text-muted-foreground mb-1 font-medium">Liked Songs</p>
                <p className="text-xl md:text-2xl font-bold text-foreground">
                  {loadingStats ? '-' : stats.likedSongs}
                </p>
              </Card>
              <Card className="p-3 md:p-4">
                <p className="text-xs md:text-sm text-muted-foreground mb-1 font-medium">Playlists</p>
                <p className="text-xl md:text-2xl font-bold text-foreground">
                  {loadingStats ? '-' : stats.playlists}
                </p>
              </Card>
              <Card className="p-3 md:p-4">
                <p className="text-xs md:text-sm text-muted-foreground mb-1 font-medium">Following</p>
                <p className="text-xl md:text-2xl font-bold text-foreground">
                  {following.length}
                </p>
              </Card>
            </div>
          </div>

          {/* Tabs */}
          <div className="max-w-4xl mx-auto px-4 md:px-6">
            <TabsList className="w-full grid grid-cols-5 h-auto gap-1 md:gap-0">
              <TabsTrigger value="profile" className="gap-1 md:gap-2 text-xs md:text-sm py-2 md:py-3">
                <Heart className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="moods" className="gap-1 md:gap-2 text-xs md:text-sm py-2 md:py-3">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Moods</span>
              </TabsTrigger>
              <TabsTrigger value="radio" className="gap-1 md:gap-2 text-xs md:text-sm py-2 md:py-3">
                <Radio className="w-4 h-4" />
                <span className="hidden sm:inline">Radio</span>
              </TabsTrigger>
              <TabsTrigger value="following" className="gap-1 md:gap-2 text-xs md:text-sm py-2 md:py-3">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Following</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-1 md:gap-2 text-xs md:text-sm py-2 md:py-3">
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">Activity</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Account Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-muted-foreground">{profile.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Display Name</label>
                  <p className="text-muted-foreground">{profile.displayName}</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Moods Tab */}
          <TabsContent value="moods" className="space-y-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2">Your Mood Playlists</h2>
              <p className="text-muted-foreground">Create and discover playlists based on your current mood</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {Object.entries(MOOD_DATA).map(([mood, data]) => (
                <div 
                  key={mood} 
                  className="group relative overflow-hidden rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                >
                  {/* Premium gradient banner with overlay effect */}
                  <div className={`bg-gradient-to-br ${data.gradient} relative overflow-hidden p-8 md:p-10 text-white min-h-[320px] flex flex-col justify-between`}>
                    {/* Glassmorphism overlay */}
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-xs"></div>
                    
                    {/* Animated gradient blob background */}
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute top-0 -right-20 w-80 h-80 bg-white rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                      <div className="absolute -bottom-10 -left-20 w-60 h-60 bg-white rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                    </div>

                    {/* Content with premium hierarchy */}
                    <div className="relative z-10 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl">{data.icon}</span>
                        <span className="text-4xl">{data.emoji}</span>
                      </div>
                      <div>
                        <h3 className="text-4xl md:text-5xl font-black capitalize mb-3">{mood}</h3>
                        <p className="text-sm md:text-base text-gray-100 font-semibold mb-2">{data.tagline}</p>
                        <p className="text-xs md:text-sm text-gray-200 opacity-90">{data.description}</p>
                      </div>
                    </div>

                    {/* Track badge with premium styling */}
                    <div className="relative z-10 flex items-center justify-between">
                      {moods.find((m) => m.mood === mood) && (
                        <div className="backdrop-blur-md bg-white/10 border border-white/20 px-4 py-2 rounded-full">
                          <p className="text-sm font-bold text-white flex items-center gap-2">
                            <Music className="w-4 h-4" />
                            {moods.find((m) => m.mood === mood)?.tracks.length || 0} Tracks
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Premium action buttons section */}
                  <div className="bg-card border-t border-border/50 p-5 md:p-6 space-y-3 backdrop-blur-sm">
                    {moods.find((m) => m.mood === mood) ? (
                      <>
                        <Button
                          variant="default"
                          className="w-full font-bold text-base px-6 py-2.5 rounded-lg bg-gradient-to-r from-primary to-primary/80 hover:to-primary shadow-lg hover:shadow-xl transition-all"
                          onClick={() => handlePlayMood(moods.find((m) => m.mood === mood)!)}
                          disabled={generatingMood === mood}
                        >
                          <Music className="w-5 h-5 mr-3" />
                          Play Playlist
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full font-bold text-base px-6 py-2.5 rounded-lg border-2 hover:bg-primary/10 transition-all"
                          onClick={() => handleGenerateMood(mood)}
                          disabled={generatingMood === mood}
                        >
                          {generatingMood === mood ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-5 h-5 mr-3" />
                              Refresh Playlist
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="default"
                        className="w-full font-bold text-base px-6 py-2.5 rounded-lg bg-gradient-to-r from-primary to-primary/80 hover:to-primary shadow-lg hover:shadow-xl transition-all"
                        onClick={() => handleGenerateMood(mood)}
                        disabled={generatingMood === mood}
                      >
                        {generatingMood === mood ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5 mr-3" />
                            Create Playlist
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Radio Tab */}
          <TabsContent value="radio" className="space-y-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2">Your Radio Stations</h2>
              <p className="text-muted-foreground">Custom radio based on your favorite tracks</p>
            </div>
            {stations.length === 0 ? (
              <div className="py-16 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                  <Radio className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">No radio stations yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Search for songs or artists to create personalized radio stations
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {stations.map((station) => (
                  <div key={station.id} className="group relative overflow-hidden rounded-xl bg-card border border-border/50 hover:border-primary/50 hover:shadow-xl transition-all duration-300 hover:bg-card/80">
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="relative z-10 p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Radio className="w-5 h-5 text-primary" />
                            <span className="text-xs font-bold text-primary uppercase tracking-wider">Radio Station</span>
                          </div>
                          <h3 className="font-bold text-lg mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                            {station.baseSongTitle} Radio
                          </h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Music className="w-4 h-4" />
                            {station.generatedQueue.length} Tracks • Based on {station.baseSongArtist}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button
                          variant="default"
                          className="flex-1 font-bold shadow-lg hover:shadow-xl transition-all"
                          onClick={() => handlePlayStation(station)}
                        >
                          <Music className="w-4 h-4 mr-2" />
                          Play Now
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteStation(station.id)}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Following Tab */}
          <TabsContent value="following" className="space-y-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2">Find & Follow Users</h2>
              <p className="text-muted-foreground">Discover and connect with musicians and music lovers</p>
            </div>
            <div className="space-y-4">
              {/* Search Users */}
              <div>
                <div className="relative group">
                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="Search by name or user ID..."
                    className="pl-12 py-3 rounded-lg border-2 border-border/50 focus:border-primary/50 bg-background/50 backdrop-blur-sm"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    disabled={isSearching}
                  />
                </div>
              </div>

              {/* Search Results */}
              {searchQuery && (
                <div>
                  <h3 className="font-bold mb-3">Search Results</h3>
                  {searchResults.length === 0 ? (
                    <Card className="p-6 text-center">
                      <p className="text-muted-foreground">No users found</p>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {searchResults.map((user) => (
                        <Card key={user.id} className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={user.avatarUrl} />
                              <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.displayName}</p>
                              <p className="text-sm text-muted-foreground">@{user.id.slice(0, 8)}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={user.isFollowing ? 'outline' : 'default'}
                            onClick={() => handleFollowUser(user.id, user.isFollowing || false)}
                          >
                            {user.isFollowing ? (
                              <>
                                <UserMinus className="w-4 h-4 mr-1" />
                                Unfollow
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-4 h-4 mr-1" />
                                Follow
                              </>
                            )}
                          </Button>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Current Following */}
              {!searchQuery && following.length > 0 && (
                <div>
                  <h3 className="font-bold mb-3">Following ({following.length})</h3>
                  <div className="space-y-3">
                    {following.map((user) => (
                      <Card key={user.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={user.avatarUrl} />
                            <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.displayName}</p>
                            <p className="text-sm text-muted-foreground">@{user.id.slice(0, 8)}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFollowUser(user.id, true)}
                        >
                          <UserMinus className="w-4 h-4 mr-1" />
                          Unfollow
                        </Button>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Followers */}
              {!searchQuery && followers.length > 0 && (
                <div>
                  <h3 className="font-bold mb-3">Followers ({followers.length})</h3>
                  <div className="space-y-3">
                    {followers.map((user) => (
                      <Card key={user.id} className="p-4 flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatarUrl} />
                          <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.displayName}</p>
                          <p className="text-sm text-muted-foreground">@{user.id.slice(0, 8)}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2">Your Activity</h2>
              <p className="text-muted-foreground">Track your music journey and interactions</p>
            </div>
            {activityLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="py-16 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                  <Zap className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">No activity yet</h3>
                <p className="text-muted-foreground">Start liking tracks and creating playlists to build your activity feed</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity, idx) => {
                  const isLikedTrack = activity.activity_type === 'liked_track';
                  const isCreatedPlaylist = activity.activity_type === 'created_playlist';
                  const isFollowedUser = activity.activity_type === 'followed_user';
                  
                  return (
                    <div 
                      key={idx} 
                      className="group relative overflow-hidden rounded-lg bg-card border border-border/50 p-4 hover:border-primary/50 hover:bg-card/80 hover:shadow-lg transition-all duration-300"
                    >
                      {/* Ambient gradient on hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      
                      <div className="relative z-10 flex gap-4 items-start">
                        {/* Premium icon with gradient background */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center mt-0.5 ${isLikedTrack ? 'bg-red-500/20 text-red-500' : isCreatedPlaylist ? 'bg-blue-500/20 text-blue-500' : 'bg-green-500/20 text-green-500'}`}>
                          {isLikedTrack && <Heart className="w-6 h-6" />}
                          {isCreatedPlaylist && <Music className="w-6 h-6" />}
                          {isFollowedUser && <Users className="w-6 h-6" />}
                        </div>
                        
                        <div className="flex-1 min-w-0 pt-1">
                          <p className="text-sm font-semibold text-foreground">
                            {isLikedTrack && (
                              <span>Liked <span className="text-primary font-bold">"{activity.metadata?.track_title}"</span></span>
                            )}
                            {isCreatedPlaylist && (
                              <span>Created playlist <span className="text-primary font-bold">"{activity.metadata?.playlist_name}"</span></span>
                            )}
                            {isFollowedUser && (
                              <span>Started following <span className="text-primary font-bold">{activity.metadata?.user_name}</span></span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {formatTime(activity.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
