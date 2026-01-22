"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

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

export function ProfileContent({ profile, stats }: ProfileContentProps) {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Profile Header */}
        <div className="flex items-center gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
            <AvatarFallback>{profile.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-4xl font-bold">{profile.displayName}</h1>
            <p className="text-muted-foreground">{profile.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-6">
            <div className="text-center">
              <p className="text-4xl font-bold">{stats.likedSongs}</p>
              <p className="text-muted-foreground">Liked Songs</p>
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-center">
              <p className="text-4xl font-bold">{stats.playlists}</p>
              <p className="text-muted-foreground">Playlists</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
