"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Library, Plus, Heart, Music } from "lucide-react";
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
        "w-64 flex flex-col gap-2 p-2 bg-background",
        className
      )}
    >
      {/* Main Navigation */}
      <div className="bg-card rounded-lg p-3">
        <nav className="space-y-1">
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
                  "flex items-center gap-4 px-3 py-3 rounded-md font-semibold transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-6 h-6" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Library Section */}
      <div className="flex-1 bg-card rounded-lg flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 py-3">
          <Link
            href="/library"
            className={cn(
              "flex items-center gap-3 font-semibold transition-colors",
              pathname.startsWith("/library")
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Library className="w-6 h-6" />
            <span>Your Library</span>
          </Link>
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 pb-4">
            {/* Liked Songs Playlist */}
            <Link
              href="/library?tab=liked"
              className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/50 transition-colors group"
            >
              <div className="w-12 h-12 rounded-md bg-gradient-to-br from-purple-700 to-blue-300 flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 text-foreground fill-current" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  Liked Songs
                </p>
                <p className="text-sm text-muted-foreground">Playlist</p>
              </div>
            </Link>

            {/* Recently Played */}
            <Link
              href="/library?tab=recent"
              className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/50 transition-colors group"
            >
              <div className="w-12 h-12 rounded-md bg-gradient-to-br from-green-700 to-green-400 flex items-center justify-center flex-shrink-0">
                <Music className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  Recently Played
                </p>
                <p className="text-sm text-muted-foreground">Playlist</p>
              </div>
            </Link>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export const Sidebar = memo(SidebarComponent);
