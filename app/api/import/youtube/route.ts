import { NextRequest, NextResponse } from 'next/server';

/**
 * Parse YouTube playlist URL and extract playlist ID
 */
function extractYouTubePlaylistId(url: string): string | null {
  try {
    if (!url) return null;
    
    // Clean and trim the URL
    const cleanUrl = url.trim();
    console.log('[Extract] Processing URL:', cleanUrl);
    
    // Try method 1: Extract from query parameter ?list=[ID]
    const queryMatch = cleanUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (queryMatch && queryMatch[1]) {
      console.log('[Extract] Found via query param:', queryMatch[1]);
      return queryMatch[1];
    }
    
    // Try method 2: Look for playlist ID pattern anywhere in the URL
    // YouTube playlist IDs typically start with PL and are 30+ characters
    const idMatch = cleanUrl.match(/\b(PL[a-zA-Z0-9_-]{20,})\b/i);
    if (idMatch && idMatch[1]) {
      console.log('[Extract] Found via ID pattern:', idMatch[1]);
      return idMatch[1];
    }
    
    // Try method 3: If it looks like just a playlist ID (starts with PL or 30+ alphanumeric)
    if (/^[A-Z]{2}[a-zA-Z0-9_-]{20,}$/.test(cleanUrl)) {
      console.log('[Extract] Found as direct ID:', cleanUrl);
      return cleanUrl;
    }
    
    // Try method 4: Extract from shortened URL formats
    const shortMatch = cleanUrl.match(/youtube\.com.*[?&]list=([^&\s]+)/);
    if (shortMatch && shortMatch[1]) {
      console.log('[Extract] Found via short URL:', shortMatch[1]);
      return shortMatch[1];
    }
    
    console.log('[Extract] Failed to extract ID from:', cleanUrl);
    return null;
  } catch (error) {
    console.error('[Extract] Error:', error);
    return null;
  }
}

/**
 * Add a track to a playlist in the database using REST API
 */
async function addTrackToPlaylist(
  playlistId: string,
  videoId: string,
  title: string,
  artist: string,
  thumbnail?: string,
  position?: number
): Promise<boolean> {
  try {
    // Use Supabase REST API directly with service role key to bypass RLS
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/playlist_songs`,
      {
        method: 'POST',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          playlist_id: playlistId,
          video_id: videoId,
          title,
          artist,
          thumbnail,
          position: position || new Date().getTime() % 1000000,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Supabase REST insert error:', error);
      throw new Error(error);
    }

    return true;
  } catch (error) {
    console.error('Error adding track to playlist:', error);
    return false;
  }
}

/**
 * Fetch YouTube playlist using Data API v3
 */
async function fetchYouTubePlaylistItems(playlistId: string, apiKey: string) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('YouTube API error:', error);
      throw new Error(error.error?.message || 'Failed to fetch YouTube playlist');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching YouTube playlist:', error);
    throw error;
  }
}

/**
 * POST /api/import/youtube
 * Import songs from a YouTube playlist - REAL-TIME DATA
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playlistId, youtubeUrl } = body;

    console.log('[YouTube Import] Received request:', { playlistId, youtubeUrl });

    if (!playlistId) {
      return NextResponse.json(
        { error: 'Missing playlist ID' },
        { status: 400 }
      );
    }

    // Check if YouTube API key is configured
    const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { 
          error: 'YouTube API key not configured',
          message: 'Please configure NEXT_PUBLIC_YOUTUBE_API_KEY environment variable'
        },
        { status: 500 }
      );
    }

    // Extract YouTube playlist ID from URL
    if (!youtubeUrl || !youtubeUrl.trim()) {
      return NextResponse.json(
        { 
          error: 'YouTube playlist URL is required',
          message: 'Please provide a valid YouTube playlist URL (format: https://www.youtube.com/playlist?list=XXXXX)'
        },
        { status: 400 }
      );
    }

    const youtubePlaylistId = extractYouTubePlaylistId(youtubeUrl);
    if (!youtubePlaylistId) {
      console.error(`[Import] Failed to extract playlist ID from URL: ${youtubeUrl}`);
      return NextResponse.json(
        { 
          error: 'Invalid YouTube playlist URL',
          message: 'Expected format: https://www.youtube.com/playlist?list=XXXXX or just the playlist ID (e.g., PLxxxxxx)'
        },
        { status: 400 }
      );
    }

    console.log(`[Import] Fetching YouTube playlist: ${youtubePlaylistId}`);

    // Fetch real YouTube playlist data
    const playlistData = await fetchYouTubePlaylistItems(youtubePlaylistId, apiKey);
    
    if (!playlistData.items || playlistData.items.length === 0) {
      return NextResponse.json({
        success: false,
        count: 0,
        message: 'No tracks found in playlist',
      });
    }

    let importedCount = 0;
    const errors: string[] = [];

    // Process each item in the YouTube playlist
    for (let index = 0; index < playlistData.items.length; index++) {
      const item = playlistData.items[index];
      try {
        const videoId = item.snippet?.resourceId?.videoId;
        const title = item.snippet?.title;
        const artist = item.snippet?.channelTitle || 'Unknown Artist';
        const thumbnail = item.snippet?.thumbnails?.medium?.url || 
                         item.snippet?.thumbnails?.default?.url;

        if (videoId && title && title !== 'Deleted video' && title !== 'Private video') {
          // Add track to playlist with position index
          const added = await addTrackToPlaylist(
            playlistId,
            videoId,
            title,
            artist,
            thumbnail,
            index + 1 // Use 1-based index for position
          );
          
          if (added) {
            importedCount++;
            console.log(`[Import] Added track: ${title} by ${artist}`);
          }
        } else if (title === 'Deleted video' || title === 'Private video') {
          console.log(`[Import] Skipping ${title}`);
        }
      } catch (itemError) {
        console.error('Error processing playlist item:', itemError);
        errors.push(String(itemError));
      }
    }

    const message = importedCount > 0 
      ? `Successfully imported ${importedCount} songs from YouTube playlist`
      : 'No tracks could be imported from this playlist';

    return NextResponse.json({
      success: importedCount > 0,
      count: importedCount,
      message,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('YouTube import error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Import failed',
        message: 'Failed to import from YouTube playlist'
      },
      { status: 500 }
    );
  }
}
