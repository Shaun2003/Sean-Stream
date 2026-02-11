"use client";

import { useEffect, useState } from "react";
import { getActivityFeed, type ActivityItem } from "@/lib/social-features";
import { Heart, ListPlus, UserPlus, Music, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface ActivityFeedProps {
  userId?: string;
  className?: string;
}

export function ActivityFeed({ userId, className }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFeed() {
      setIsLoading(true);
      try {
        const feed = await getActivityFeed(userId);
        setActivities(feed);
      } catch (error) {
        console.error("Error loading activity feed:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadFeed();
  }, [userId]);

  const getActivityIcon = (type: ActivityItem["activityType"]) => {
    switch (type) {
      case "liked_track": return Heart;
      case "created_playlist": return ListPlus;
      case "followed_user": return UserPlus;
      case "added_to_playlist": return Music;
      default: return Music;
    }
  };

  const getActivityMessage = (activity: ActivityItem) => {
    switch (activity.activityType) {
      case "liked_track":
        return `liked "${(activity.activityData?.track_title as string) || "a track"}"`;
      case "created_playlist":
        return `created playlist "${(activity.activityData?.playlist_name as string) || "a playlist"}"`;
      case "followed_user":
        return `started following ${(activity.activityData?.following_name as string) || "someone"}`;
      case "added_to_playlist":
        return `added a track to "${(activity.activityData?.playlist_name as string) || "a playlist"}"`;
      default:
        return "did something";
    }
  };

  const getActivityColor = (type: ActivityItem["activityType"]) => {
    switch (type) {
      case "liked_track": return "text-red-500 bg-red-500/10";
      case "created_playlist": return "text-blue-500 bg-blue-500/10";
      case "followed_user": return "text-primary bg-primary/10";
      case "added_to_playlist": return "text-orange-500 bg-orange-500/10";
      default: return "text-muted-foreground bg-secondary";
    }
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-muted-foreground text-sm">No recent activity</p>
        <p className="text-muted-foreground text-xs mt-1">
          Start listening, creating playlists, and connecting with others
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {activities.map((activity) => {
        const Icon = getActivityIcon(activity.activityType);
        const colorClasses = getActivityColor(activity.activityType);

        return (
          <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-card/60 transition-colors">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", colorClasses)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">
                <span className="font-medium">{activity.userName}</span>{" "}
                {getActivityMessage(activity)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activity.createdAt
                  ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })
                  : "recently"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
