import React from "react";
import { PlayerProvider } from "@/contexts/player-context";
import { Sidebar } from "@/components/music/sidebar";
import { BottomNav } from "@/components/music/bottom-nav";
import { NowPlayingBar } from "@/components/music/now-playing-bar";
import Link from "next/link";
import { User } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlayerProvider>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - hidden on mobile */}
          <Sidebar className="hidden md:flex" />

          {/* Main content */}
          <main className="flex-1 overflow-y-auto pb-32 sm:pb-24 relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
              {/* Mobile Profile Icon - Fixed in top right of content area */}
              <div className="md:hidden fixed top-6 right-4 sm:right-6 z-40">
                <Link href="/profile" className="p-2 hover:bg-secondary rounded-lg transition-colors">
                  <User className="w-5 h-5 text-foreground" />
                </Link>
              </div>
              {children}
            </div>
          </main>
        </div>

        {/* Desktop Now Playing Bar */}
        <NowPlayingBar className="hidden md:flex" />

        {/* Mobile Mini Player + Bottom Nav */}
        <div className="md:hidden">
          <NowPlayingBar mobile />
          <BottomNav />
        </div>
      </div>
    </PlayerProvider>
  );
}
