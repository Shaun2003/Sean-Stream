import React from "react";
import { PlayerProvider } from "@/contexts/player-context";
import { Sidebar } from "@/components/music/sidebar";
import { BottomNav } from "@/components/music/bottom-nav";
import { NowPlayingBar } from "@/components/music/now-playing-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlayerProvider>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - hidden on mobile */}
          <Sidebar className="hidden md:flex" />

          {/* Main content */}
          <main className="flex-1 overflow-y-auto pb-32 md:pb-24">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">{children}</div>
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
