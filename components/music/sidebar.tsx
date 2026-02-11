"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Library, Plus, Heart, Music, ListMusic, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { memo } from "react";

interface SidebarProps {
  className?: string;
}

const mainNavItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/search", icon: Search, label: "Search" },
];

function SidebarComponent({ className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "w-64 flex flex-col gap-4 p-4 bg-background",
        className
      )}
    >
      {/* Main Navigation */}
      <div className="bg-card rounded-lg p-0">
        <nav className="space-y-1 p-2">
          {mainNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md font-medium transition-colors",
                  isActive
                    ? "text-foreground bg-secondary/40"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/20"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Library Section */}
      <div className="flex-1 bg-card rounded-lg flex flex-col min-h-0 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
          <Link
            href="/library"
            className={cn(
              "flex items-center gap-3 font-medium text-sm transition-colors",
              pathname.startsWith("/library")
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Library className="w-5 h-5 flex-shrink-0" />
            <span>Your Library</span>
          </Link>
          <Button variant="ghost" size="icon" className="w-8 h-8 flex-shrink-0">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 px-2 py-2">
          <div className="space-y-2">
            {/* Playlists */}
            <Link
              href="/playlists"
              className={cn(
                "flex items-center gap-3 p-2 rounded-md hover:bg-secondary/40 transition-colors",
                pathname === "/playlists" ? "bg-secondary/40" : ""
              )}
            >
              <div className="w-12 h-12 rounded-md bg-linear-to-br from-orange-600 to-red-500 flex items-center justify-center flex-shrink-0">
                <ListMusic className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">
                  Playlists
                </p>
                <p className="text-xs text-muted-foreground">Your playlists</p>
              </div>
            </Link>

            {/* Liked Songs Playlist */}
            <Link
              href="/library?tab=liked"
              className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/40 transition-colors group"
            >
              <div className="w-12 h-12 rounded-md bg-linear-to-br from-purple-700 to-blue-300 flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 text-foreground fill-current" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">
                  Liked Songs
                </p>
                <p className="text-xs text-muted-foreground">Playlist</p>
              </div>
            </Link>

            {/* Recently Played */}
            <Link
              href="/library?tab=recent"
              className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/40 transition-colors group"
            >
              <div className="w-12 h-12 rounded-md bg-linear-to-br from-green-700 to-green-400 flex items-center justify-center flex-shrink-0">
                <Music className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">
                  Recently Played
                </p>
                <p className="text-xs text-muted-foreground">Playlist</p>
              </div>
            </Link>
          </div>
        </ScrollArea>
      </div>

      {/* Explore Section - Removed (now in Profile) */}

      {/* Profile Section */}
      <Link
        href="/profile"
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg bg-card hover:bg-secondary/20 transition-colors",
          pathname === "/profile" ? "ring-2 ring-primary" : ""
        )}
      >
        <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-white" />
        </div>
        <span className="text-sm font-medium truncate">Profile</span>
      </Link>
    </div>
  );
}

export const Sidebar = memo(SidebarComponent);

