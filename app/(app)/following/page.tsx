"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserPlus, UserMinus } from "lucide-react";
import {
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
  type FollowUser,
} from "@/lib/social-features";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function FollowingPage() {
  const { toast } = useToast();
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("following");

  useEffect(() => {
    loadFollowData();
  }, []);

  const loadFollowData = async () => {
    try {
      setIsLoading(true);
      const [followerList, followingList] = await Promise.all([
        getFollowers(),
        getFollowing(),
      ]);
      setFollowers(followerList);
      setFollowing(followingList);
    } catch (error) {
      console.error("Error loading follow data:", error);
      toast({
        title: "Error",
        description: "Failed to load follow data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async (userId: string, isFollowing: boolean) => {
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
        title: "Success",
        description: isFollowing ? "Unfollowed user" : "Followed user",
      });
    } catch (error) {
      console.error("Error updating follow:", error);
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive",
      });
    }
  };

  const UserCard = ({ user }: { user: FollowUser }) => (
    <Card className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="w-12 h-12 rounded-full object-cover bg-muted"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
            {user.displayName[0]}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{user.displayName}</h3>
          <p className="text-sm text-muted-foreground truncate">
            @{user.displayName.toLowerCase().replace(/\s+/g, "")}
          </p>
        </div>
      </div>
      {activeTab === "following" && (
        <Button
          variant={user.isFollowing ? "default" : "outline"}
          size="sm"
          onClick={() => handleFollow(user.id, user.isFollowing)}
        >
          {user.isFollowing ? (
            <>
              <UserMinus className="w-4 h-4 mr-2" />
              Following
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Follow
            </>
          )}
        </Button>
      )}
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <h1 className="text-3xl font-bold mb-8">Following</h1>
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
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          Social Network
        </h1>
        <p className="text-muted-foreground mt-2">
          Connect with other music lovers
        </p>
      </div>

      <div className="max-w-2xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="following">
              Following ({following.length})
            </TabsTrigger>
            <TabsTrigger value="followers">
              Followers ({followers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="following" className="space-y-4 mt-6">
            {following.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="space-y-4">
                  <UserPlus className="w-12 h-12 text-muted-foreground mx-auto" />
                  <h2 className="text-xl font-semibold">
                    Not following anyone yet
                  </h2>
                  <p className="text-muted-foreground">
                    Search for users and follow them to see their activity
                  </p>
                </div>
              </Card>
            ) : (
              following.map((user) => (
                <UserCard key={user.id} user={user} />
              ))
            )}
          </TabsContent>

          <TabsContent value="followers" className="space-y-4 mt-6">
            {followers.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="space-y-4">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto" />
                  <h2 className="text-xl font-semibold">No followers yet</h2>
                  <p className="text-muted-foreground">
                    Share your profile and make your music public to gain
                    followers
                  </p>
                </div>
              </Card>
            ) : (
              followers.map((user) => (
                <UserCard key={user.id} user={user} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
