"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Moon, Sun, LogOut, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ProfileContentProps {
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

export function ProfileContent({ profile, stats: initialStats }: ProfileContentProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<string | undefined>(resolvedTheme);
  const [stats, setStats] = useState(initialStats);
  const [loadingStats, setLoadingStats] = useState(false);
  const supabase = createClient();

  // Ensure component only renders after hydration
  useEffect(() => {
    setMounted(true);
    setCurrentTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Load stats from Supabase on mount
  useEffect(() => {
    if (!profile.id || !mounted) return;

    const loadStats = async () => {
      try {
        setLoadingStats(true);
        const [likedRes, playlistRes] = await Promise.all([
          supabase
            .from("liked_songs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.id),
          supabase
            .from("playlists")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.id),
        ]);

        setStats({
          likedSongs: likedRes.count || 0,
          playlists: playlistRes.count || 0,
        });
      } catch (error) {
        console.error("[Profile] Error loading stats:", error);
        // Keep initial stats if error
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, [profile.id, mounted]);

  // Real-time subscription to liked songs and playlists
  useEffect(() => {
    if (!profile.id || !mounted) return;

    let unsubscribe: (() => void) | null = null;

    const setupRealtimeSubscription = async () => {
      try {
        const subscription = supabase
          .channel(`profile:${profile.id}`, {
            config: {
              broadcast: { self: true },
            },
          })
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "liked_songs",
              filter: `user_id=eq.${profile.id}`,
            },
            async () => {
              try {
                const { count } = await supabase
                  .from("liked_songs")
                  .select("*", { count: "exact", head: true })
                  .eq("user_id", profile.id);
                
                setStats((prev) => ({ ...prev, likedSongs: count || 0 }));
              } catch (error) {
                console.error("[Profile] Error updating liked songs:", error);
              }
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "playlists",
              filter: `user_id=eq.${profile.id}`,
            },
            async () => {
              try {
                const { count } = await supabase
                  .from("playlists")
                  .select("*", { count: "exact", head: true })
                  .eq("user_id", profile.id);
                
                setStats((prev) => ({ ...prev, playlists: count || 0 }));
              } catch (error) {
                console.error("[Profile] Error updating playlists:", error);
              }
            }
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              console.log("[Profile] Real-time subscription active");
            }
          });

        unsubscribe = () => {
          supabase.removeChannel(subscription);
        };
      } catch (error) {
        console.error("[Profile] Real-time subscription error:", error);
      }
    };

    setupRealtimeSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [profile.id, mounted]);

  const handleToggleTheme = () => {
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    setCurrentTheme(newTheme);
    setTheme(newTheme);
    console.log("[Profile] Theme switched to:", newTheme);
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await supabase.auth.signOut();
      toast({ title: "Logged out", description: "You have been logged out successfully" });
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({ title: "Error", description: "Failed to logout", variant: "destructive" });
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!mounted) {
    return <div className="space-y-8 animate-pulse">
      <div className="h-32 bg-muted rounded-lg" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-24 bg-muted rounded-lg" />
        <div className="h-24 bg-muted rounded-lg" />
      </div>
    </div>;
  }

  return (
    <div className="min-h-screen pb-8 space-y-8">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 p-6 sm:p-8 bg-gradient-to-br from-primary/10 via-transparent to-transparent rounded-xl border border-border/50">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 flex-1 text-center sm:text-left">
          <Avatar className="h-24 sm:h-28 w-24 sm:w-28 border-2 border-primary/20">
            <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
            <AvatarFallback className="text-2xl">{profile.displayName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">{profile.displayName}</h1>
            <p className="text-muted-foreground text-sm md:text-base break-all mb-4">
              <span className="font-medium">Email:</span> {profile.email}
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">User ID:</span> <span className="font-mono">{profile.id.slice(0, 8)}...</span>
            </p>
          </div>
        </div>
        {/* Theme Toggle */}
        <Button
          variant="outline"
          size="lg"
          onClick={handleToggleTheme}
          className="rounded-full shrink-0 h-14 w-14"
          title={`Switch to ${currentTheme === "dark" ? "light" : "dark"} mode`}
        >
          {currentTheme === "dark" ? (
            <Sun className="w-6 h-6" />
          ) : (
            <Moon className="w-6 h-6" />
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card className="p-6 sm:p-8 hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-500/5 to-transparent">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Liked Songs</p>
            <p className="text-4xl sm:text-5xl font-bold text-blue-600 dark:text-blue-400">
              {loadingStats ? "..." : stats.likedSongs}
            </p>
            <p className="text-xs text-muted-foreground pt-2">Total songs you love</p>
          </div>
        </Card>
        <Card className="p-6 sm:p-8 hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-500/5 to-transparent">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Playlists</p>
            <p className="text-4xl sm:text-5xl font-bold text-purple-600 dark:text-purple-400">
              {loadingStats ? "..." : stats.playlists}
            </p>
            <p className="text-xs text-muted-foreground pt-2">Custom playlists created</p>
          </div>
        </Card>
      </div>

      {/* Settings Section */}
      <Card className="p-6 sm:p-8 border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border/50">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-semibold">Settings & Preferences</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-4">
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground font-medium">Current Theme</span>
              <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
                {currentTheme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                <span className="text-sm font-medium capitalize">{currentTheme || "system"}</span>
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground font-medium">Account Status</span>
              <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Active</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 py-4 border-y border-border/50">
            <div className="flex items-center justify-between p-3 hover:bg-secondary/50 rounded-lg transition-colors">
              <span className="text-sm text-muted-foreground">Notifications</span>
              <span className="text-sm font-medium text-muted-foreground">Enabled</span>
            </div>
            <div className="flex items-center justify-between p-3 hover:bg-secondary/50 rounded-lg transition-colors">
              <span className="text-sm text-muted-foreground">Offline Downloads</span>
              <span className="text-sm font-medium text-muted-foreground">Available</span>
            </div>
            <div className="flex items-center justify-between p-3 hover:bg-secondary/50 rounded-lg transition-colors">
              <span className="text-sm text-muted-foreground">Real-time Sync</span>
              <span className="text-xs font-mono text-green-600 dark:text-green-400">ACTIVE</span>
            </div>
          </div>

          <Button
            variant="destructive"
            className="w-full py-6 text-base font-semibold mt-4"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut className="w-5 h-5 mr-2" />
            {isLoggingOut ? "Logging out..." : "Logout"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
