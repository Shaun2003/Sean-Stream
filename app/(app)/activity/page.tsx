"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Music, Users, Zap, Clock } from "lucide-react";
import {
  getActivityFeed,
  type ActivityItem,
} from "@/lib/social-features";
import { useToast } from "@/hooks/use-toast";

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  liked_track: <Heart className="w-4 h-4 text-red-500" />,
  created_playlist: <Music className="w-4 h-4 text-blue-500" />,
  followed_user: <Users className="w-4 h-4 text-purple-500" />,
  added_to_playlist: <Zap className="w-4 h-4 text-yellow-500" />,
};

const ACTIVITY_MESSAGES: Record<string, (data: any) => string> = {
  liked_track: (data) => `liked ${data.track_title}`,
  created_playlist: (data) => `created playlist "${data.playlist_name}"`,
  followed_user: (data) => `followed ${data.user_name}`,
  added_to_playlist: (data) =>
    `added ${data.track_title} to ${data.playlist_name}`,
};

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
}

export default function ActivityFeedPage() {
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActivityFeed();
    // Refresh every 30 seconds
    const interval = setInterval(loadActivityFeed, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadActivityFeed = async () => {
    try {
      setIsLoading(true);
      const data = await getActivityFeed();
      setActivities(data);
    } catch (error) {
      console.error("Error loading activity feed:", error);
      if (isLoading) {
        // Only show toast on initial load
        toast({
          title: "Error",
          description: "Failed to load activity feed",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <h1 className="text-3xl font-bold mb-8">Activity Feed</h1>
        <div className="space-y-4 max-w-2xl">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Activity Feed</h1>
        <p className="text-muted-foreground mt-2">
          See what your friends are up to
        </p>
      </div>

      <div className="max-w-2xl">
        {activities.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="space-y-4">
              <Zap className="w-12 h-12 text-muted-foreground mx-auto" />
              <h2 className="text-xl font-semibold">No activity yet</h2>
              <p className="text-muted-foreground">
                Follow some users to see their activity here
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <Card
                key={activity.id}
                className="p-4 hover:shadow-md transition"
              >
                <div className="flex gap-4 items-start">
                  <div className="mt-1">
                    {ACTIVITY_ICONS[activity.activityType]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold">
                        {activity.userName}
                      </span>{" "}
                      {
                        ACTIVITY_MESSAGES[activity.activityType]?.(
                          activity.activityData
                        )
                      }
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(activity.createdAt)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
