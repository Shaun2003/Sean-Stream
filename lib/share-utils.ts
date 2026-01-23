"use client";

import type { Song } from "@/contexts/player-context";

export async function shareTrack(track: Song) {
  const text = `Check out "${track.title}" by ${track.artist}`;
  const url = `${window.location.origin}?track=${track.id}`;

  // Try native share first
  if (navigator.share) {
    try {
      await navigator.share({
        title: track.title,
        text: text,
        url: url,
      });
      return;
    } catch (error) {
      console.error("Share failed:", error);
    }
  }

  // Fallback to clipboard
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return "Copied to clipboard!";
  } catch (error) {
    console.error("Clipboard failed:", error);
    return "Share failed";
  }
}

export function copyTrackLink(track: Song) {
  const url = `${window.location.origin}?track=${track.id}`;
  navigator.clipboard.writeText(url);
  return "Link copied!";
}

export function openInYouTube(trackId: string) {
  window.open(`https://www.youtube.com/watch?v=${trackId}`, "_blank");
}
